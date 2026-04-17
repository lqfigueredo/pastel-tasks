import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];
    const tomorrow = new Date(Date.now() + 86400000).toISOString().split("T")[0];

    let insertedCount = 0;

    // 1. Task deadline notifications
    const { data: tasks } = await supabase
      .from("tasks")
      .select("id, title, estimated_delivery_date, task_assignees(user_id)")
      .is("actual_end_date", null)
      .not("estimated_delivery_date", "is", null)
      .lte("estimated_delivery_date", tomorrow);

    if (tasks) {
      for (const task of tasks) {
        const isOverdue = task.estimated_delivery_date! < today;
        const isToday = task.estimated_delivery_date === today;
        const isTomorrow = task.estimated_delivery_date === tomorrow;

        let titleText = "";
        if (isOverdue) titleText = "Tarefa com prazo vencido";
        else if (isToday) titleText = "Tarefa vence hoje";
        else if (isTomorrow) titleText = "Tarefa vence amanhã";

        const assignees = (task as any).task_assignees as { user_id: string }[];
        if (!assignees?.length) continue;

        for (const assignee of assignees) {
          // Dedup: 1 notificação por (usuário, tipo, tarefa, título-estado).
          // Sem janela de dia — só re-notifica se o estado mudar (ex: amanhã -> hoje -> vencido).
          const { data: existing } = await supabase
            .from("notifications")
            .select("id")
            .eq("user_id", assignee.user_id)
            .eq("type", "task_deadline")
            .eq("reference_id", task.id)
            .eq("title", titleText)
            .limit(1);

          if (existing && existing.length > 0) continue;

          await supabase.from("notifications").insert({
            user_id: assignee.user_id,
            type: "task_deadline",
            title: titleText,
            message: `"${task.title}" — prazo: ${task.estimated_delivery_date}`,
            reference_id: task.id,
          });
          insertedCount++;
        }
      }
    }

    // 2. Meeting pendency deadline notifications
    const { data: pendencies } = await supabase
      .from("meeting_pendencies")
      .select("id, description, due_date, meeting_id, responsible_user_id")
      .eq("is_completed", false)
      .not("due_date", "is", null)
      .not("responsible_user_id", "is", null)
      .lte("due_date", tomorrow);

    if (pendencies) {
      for (const p of pendencies) {
        const isOverdue = p.due_date! < today;
        const isToday = p.due_date === today;
        const isTomorrow = p.due_date === tomorrow;

        let titleText = "";
        if (isOverdue) titleText = "Pendência com prazo vencido";
        else if (isToday) titleText = "Pendência vence hoje";
        else if (isTomorrow) titleText = "Pendência vence amanhã";

        // Dedup: 1 notificação por (usuário, tipo, pendência, título-estado).
        // reference_id agora é o id da pendência (não da reunião), evitando colisão entre pendências da mesma reunião.
        const { data: existing } = await supabase
          .from("notifications")
          .select("id")
          .eq("user_id", p.responsible_user_id!)
          .eq("type", "pendency_deadline")
          .eq("reference_id", p.id)
          .eq("title", titleText)
          .limit(1);

        if (existing && existing.length > 0) continue;

        await supabase.from("notifications").insert({
          user_id: p.responsible_user_id!,
          type: "pendency_deadline",
          title: titleText,
          message: `"${p.description?.substring(0, 80)}" — prazo: ${p.due_date}`,
          reference_id: p.id,
        });
        insertedCount++;
      }
    }

    return new Response(
      JSON.stringify({ success: true, notifications_created: insertedCount }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

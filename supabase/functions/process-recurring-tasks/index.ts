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

  // Require shared cron secret to block public callers
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const today = new Date().toISOString().split("T")[0];

    // Fetch active recurring tasks due today or earlier
    const { data: recurrings, error: fetchError } = await supabase
      .from("recurring_tasks")
      .select("*")
      .eq("is_active", true)
      .lte("next_run_date", today);

    if (fetchError) {
      throw new Error(`Fetch error: ${fetchError.message}`);
    }

    if (!recurrings || recurrings.length === 0) {
      return new Response(
        JSON.stringify({ message: "No recurring tasks to process", count: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let created = 0;

    for (const rec of recurrings) {
      // Create the task
      const { data: task, error: insertError } = await supabase
        .from("tasks")
        .insert({
          title: rec.title,
          description: rec.description,
          status_id: rec.status_id,
          created_by: rec.created_by,
          team_id: rec.team_id,
          start_date: rec.next_run_date,
          recurring_task_id: rec.id,
        })
        .select("id")
        .single();

      if (insertError) {
        console.error(`Failed to create task for recurring ${rec.id}:`, insertError.message);
        continue;
      }

      // Create assignees
      if (rec.assignee_ids && rec.assignee_ids.length > 0) {
        await supabase.from("task_assignees").insert(
          rec.assignee_ids.map((userId: string) => ({
            task_id: task.id,
            user_id: userId,
          }))
        );

        // Send email notification to each assignee
        for (const userId of rec.assignee_ids) {
          try {
            const { data: userData } = await supabase.auth.admin.getUserById(userId);
            if (userData?.user?.email) {
              const { data: profile } = await supabase
                .from("profiles")
                .select("display_name")
                .eq("user_id", userId)
                .single();

              await supabase.functions.invoke("send-transactional-email", {
                body: {
                  templateName: "recurring-task-reminder",
                  recipientEmail: userData.user.email,
                  idempotencyKey: `recurring-task-${task.id}-${userId}`,
                  templateData: {
                    taskTitle: rec.title,
                    userName: profile?.display_name || "",
                    dueDate: rec.next_run_date,
                  },
                },
              });
            }
          } catch (emailErr) {
            console.error(`Failed to send email to ${userId}:`, emailErr);
          }
        }
      }

      // Calculate next run date
      const nextDate = calcNextDate(rec.next_run_date, rec.recurrence_type, rec.recurrence_day);

      await supabase
        .from("recurring_tasks")
        .update({ next_run_date: nextDate })
        .eq("id", rec.id);

      created++;
    }

    return new Response(
      JSON.stringify({ message: `Processed ${created} recurring tasks`, count: created }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function calcNextDate(currentDate: string, type: string, day: number | null): string {
  const d = new Date(currentDate + "T00:00:00Z");

  switch (type) {
    case "daily":
      d.setUTCDate(d.getUTCDate() + 1);
      break;
    case "weekly":
      d.setUTCDate(d.getUTCDate() + 7);
      break;
    case "monthly":
      d.setUTCMonth(d.getUTCMonth() + 1);
      if (day && day >= 1 && day <= 31) {
        const maxDay = new Date(d.getUTCFullYear(), d.getUTCMonth() + 1, 0).getDate();
        d.setUTCDate(Math.min(day, maxDay));
      }
      break;
    case "yearly":
      d.setUTCFullYear(d.getUTCFullYear() + 1);
      break;
  }

  return d.toISOString().split("T")[0];
}

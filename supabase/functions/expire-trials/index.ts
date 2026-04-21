import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.0";

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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const now = new Date().toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  const result = {
    moved_to_past_due: 0,
    moved_to_suspended: 0,
    comp_expired: 0,
    errors: [] as string[],
  };

  try {
    // 1) trialing → past_due when trial expired
    const { data: expiredTrials, error: e1 } = await supabase
      .from("subscriptions")
      .select("id, admin_user_id, trial_ends_at")
      .eq("status", "trialing")
      .lt("trial_ends_at", now);

    if (e1) throw e1;

    for (const sub of expiredTrials ?? []) {
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          past_due_since: now,
          updated_at: now,
        })
        .eq("id", sub.id);

      if (updErr) {
        result.errors.push(`past_due ${sub.id}: ${updErr.message}`);
        continue;
      }
      result.moved_to_past_due++;

      // Notify admin
      await supabase.from("notifications").insert({
        user_id: sub.admin_user_id,
        type: "billing",
        title: "Período de teste encerrado",
        message:
          "Seu trial de 14 dias terminou. Ative sua assinatura para evitar a suspensão do acesso em 7 dias.",
      });
    }

    // 2) past_due → suspended after 7 days
    const { data: longPastDue, error: e2 } = await supabase
      .from("subscriptions")
      .select("id, admin_user_id, past_due_since")
      .eq("status", "past_due")
      .lt("past_due_since", sevenDaysAgo);

    if (e2) throw e2;

    for (const sub of longPastDue ?? []) {
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({ status: "suspended", updated_at: now })
        .eq("id", sub.id);

      if (updErr) {
        result.errors.push(`suspended ${sub.id}: ${updErr.message}`);
        continue;
      }
      result.moved_to_suspended++;

      await supabase.from("notifications").insert({
        user_id: sub.admin_user_id,
        type: "billing",
        title: "Assinatura suspensa",
        message:
          "Sua assinatura foi suspensa por falta de pagamento. Ative para restaurar o acesso da equipe.",
      });
    }

    // 3) active with current_period_end expired → past_due
    //    Cobre cortesias com prazo definido (comp_activate_subscription com _months IS NOT NULL)
    //    e qualquer outra assinatura ativa cujo ciclo expirou sem pagamento/avanço.
    const { data: expiredActive, error: e3 } = await supabase
      .from("subscriptions")
      .select("id, admin_user_id, current_period_end")
      .eq("status", "active")
      .not("current_period_end", "is", null)
      .lt("current_period_end", now);

    if (e3) throw e3;

    for (const sub of expiredActive ?? []) {
      const { error: updErr } = await supabase
        .from("subscriptions")
        .update({
          status: "past_due",
          past_due_since: now,
          updated_at: now,
        })
        .eq("id", sub.id);

      if (updErr) {
        result.errors.push(`comp_expired ${sub.id}: ${updErr.message}`);
        continue;
      }
      result.comp_expired++;

      await supabase.from("notifications").insert({
        user_id: sub.admin_user_id,
        type: "billing",
        title: "Período da assinatura encerrado",
        message:
          "Seu período ativo terminou. Regularize o pagamento em até 7 dias para evitar a suspensão do acesso.",
      });
    }

    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(
      JSON.stringify({ ok: false, error: message, ...result }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

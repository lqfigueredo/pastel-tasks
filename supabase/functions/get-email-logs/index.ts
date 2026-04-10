import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get user from token
    const userClient = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check solution_admin role
    const { data: roleData, error: roleError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "solution_admin")
      .maybeSingle();

    console.log("Role check for", userId, "result:", roleData, "error:", roleError?.message);

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "7d";
    const template = url.searchParams.get("template") || "";
    const status = url.searchParams.get("status") || "";
    const page = parseInt(url.searchParams.get("page") || "0");
    const pageSize = 50;

    // Calculate date range
    let startDate: string;
    const now = new Date();
    switch (period) {
      case "24h":
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
        break;
      case "30d":
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
        break;
      case "7d":
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
        break;
    }

    const customStart = url.searchParams.get("start");
    const customEnd = url.searchParams.get("end");
    if (customStart) startDate = new Date(customStart).toISOString();
    const endDate = customEnd ? new Date(customEnd).toISOString() : now.toISOString();

    const { data: allLogs, error: logsError } = await adminClient
      .from("email_send_log")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false })
      .limit(1000);

    if (logsError) {
      console.error("Logs query error:", logsError.message);
      return new Response(JSON.stringify({ error: logsError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by message_id (first occurrence = latest due to DESC order)
    const deduped = new Map<string, typeof allLogs[0]>();
    for (const log of allLogs || []) {
      const key = log.message_id || log.id;
      if (!deduped.has(key)) {
        deduped.set(key, log);
      }
    }

    let logs = Array.from(deduped.values());

    // Stats before filtering
    const stats = { total: logs.length, sent: 0, failed: 0, suppressed: 0 };
    for (const l of logs) {
      if (l.status === "sent") stats.sent++;
      else if (l.status === "dlq" || l.status === "failed") stats.failed++;
      else if (l.status === "suppressed") stats.suppressed++;
    }

    const templates = [...new Set(logs.map((l) => l.template_name))].sort();

    // Apply filters
    if (template) {
      logs = logs.filter((l) => l.template_name === template);
    }
    if (status) {
      if (status === "failed") {
        logs = logs.filter((l) => l.status === "dlq" || l.status === "failed");
      } else {
        logs = logs.filter((l) => l.status === status);
      }
    }

    const totalFiltered = logs.length;
    const paginatedLogs = logs.slice(page * pageSize, (page + 1) * pageSize);

    return new Response(
      JSON.stringify({
        stats,
        templates,
        logs: paginatedLogs,
        total: totalFiltered,
        page,
        pageSize,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

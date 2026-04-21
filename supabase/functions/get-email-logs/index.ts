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
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Check roles
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["solution_admin", "admin"]);

    const roles = (roleData || []).map((r: any) => r.role);
    const isSolutionAdmin = roles.includes("solution_admin");
    const isAdmin = roles.includes("admin");

    if (!isSolutionAdmin && !isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const period = url.searchParams.get("period") || "7d";
    const template = url.searchParams.get("template") || "";
    const status = url.searchParams.get("status") || "";
    const scope = url.searchParams.get("scope") || ""; // "global" or "own"
    const page = parseInt(url.searchParams.get("page") || "0");
    const pageSize = 50;

    // Determine if we need to filter by admin's users
    let allowedEmails: string[] | null = null; // null = no filter (global)

    if (isAdmin && !isSolutionAdmin) {
      // Admin always sees only their own users
      allowedEmails = await getAdminUserEmails(adminClient, userId);
    } else if (isSolutionAdmin && scope === "own") {
      // Solution admin requesting own scope
      allowedEmails = await getAdminUserEmails(adminClient, userId);
    }
    // else: solution_admin with global scope → no filter

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

    let query = adminClient
      .from("email_send_log")
      .select("*")
      .gte("created_at", startDate)
      .lte("created_at", endDate)
      .order("created_at", { ascending: false })
      .limit(1000);

    // If scoped, filter by allowed emails
    if (allowedEmails !== null) {
      if (allowedEmails.length === 0) {
        // No users → return empty
        return new Response(
          JSON.stringify({
            stats: { total: 0, sent: 0, failed: 0, suppressed: 0 },
            templates: [],
            logs: [],
            total: 0,
            page,
            pageSize,
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      query = query.in("recipient_email", allowedEmails);
    }

    const { data: allLogs, error: logsError } = await query;

    if (logsError) {
      console.error("Logs query error:", logsError);
      return new Response(JSON.stringify({ error: "Failed to retrieve logs" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Deduplicate by message_id
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
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function getAdminUserEmails(adminClient: any, adminUserId: string): Promise<string[]> {
  // Get user_ids created by this admin
  const { data: approvals } = await adminClient
    .from("user_approvals")
    .select("user_id")
    .eq("created_by_admin", adminUserId);

  const userIds = (approvals || []).map((a: any) => a.user_id);
  // Include admin's own id
  userIds.push(adminUserId);
  const uniqueIds = [...new Set(userIds)];

  if (uniqueIds.length === 0) return [];

  // Get emails from auth.users via admin API
  const emails: string[] = [];
  for (const uid of uniqueIds) {
    const { data } = await adminClient.auth.admin.getUserById(uid);
    if (data?.user?.email) {
      emails.push(data.user.email);
    }
  }

  return emails;
}

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RETENTION_DAYS = 15;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Validate CRON_SECRET
  const cronSecret = Deno.env.get("CRON_SECRET");
  const authHeader = req.headers.get("authorization") || "";
  const provided = authHeader.replace(/^Bearer\s+/i, "");
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { data: rows, error } = await supabase
    .from("meeting_attachments")
    .select("id, file_path, file_type, created_at")
    .lt("created_at", cutoff)
    .or("file_type.like.video/%,file_type.like.audio/%");

  if (error) {
    console.error("query error", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const targets = rows ?? [];
  let removed = 0;
  const failures: Array<{ id: string; error: string }> = [];

  for (const r of targets) {
    try {
      const { error: storageErr } = await supabase.storage
        .from("meeting-attachments")
        .remove([r.file_path]);
      if (storageErr && !/not.?found/i.test(storageErr.message)) {
        throw storageErr;
      }
      const { error: dbErr } = await supabase
        .from("meeting_attachments")
        .delete()
        .eq("id", r.id);
      if (dbErr) throw dbErr;
      removed++;
    } catch (e) {
      console.error("delete failed", r.id, e);
      failures.push({ id: r.id, error: (e as Error).message });
    }
  }

  return new Response(
    JSON.stringify({
      cutoff,
      candidates: targets.length,
      removed,
      failures,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
  );
});

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface LeadPayload {
  name?: unknown;
  email?: unknown;
  turnstile_token?: unknown;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as LeadPayload;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim() : "";
    const token = typeof body.turnstile_token === "string" ? body.turnstile_token : "";

    if (!name || name.length > 100) {
      return new Response(JSON.stringify({ error: "Nome inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!email || email.length > 255 || !EMAIL_RE.test(email)) {
      return new Response(JSON.stringify({ error: "E-mail inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verifica Turnstile (se a chave secreta estiver configurada)
    const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
    if (secret) {
      if (!token) {
        return new Response(JSON.stringify({ error: "Verificação anti-bot ausente." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const formData = new FormData();
      formData.append("secret", secret);
      formData.append("response", token);
      const remoteIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-forwarded-for");
      if (remoteIp) formData.append("remoteip", remoteIp.split(",")[0].trim());

      const verifyRes = await fetch(
        "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        { method: "POST", body: formData },
      );
      const verifyJson = (await verifyRes.json()) as { success?: boolean };
      if (!verifyJson.success) {
        return new Response(
          JSON.stringify({ error: "Falha na verificação anti-bot. Tente novamente." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { error } = await supabase.from("leads").insert({ name, email });
    if (error) {
      console.error("submit-lead insert error:", error);
      return new Response(JSON.stringify({ error: "Erro ao salvar. Tente novamente." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("submit-lead unexpected error:", err);
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

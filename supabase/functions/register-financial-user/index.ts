import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

function logAttempt(req: Request, status: 'success' | 'denied' | 'error', detail: string, email?: string) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
  const ua = req.headers.get('user-agent') || 'unknown'
  console.log(JSON.stringify({
    fn: 'register-financial-user',
    status,
    detail,
    email: email ?? null,
    ip,
    ua,
    at: new Date().toISOString(),
  }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, token } = await req.json()

    if (!email || !password || !token) {
      logAttempt(req, 'error', 'missing fields', email)
      return new Response(JSON.stringify({ error: 'E-mail, senha e token são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    const expectedToken = Deno.env.get('FINANCIAL_REGISTER_TOKEN')
    if (!expectedToken) {
      logAttempt(req, 'error', 'FINANCIAL_REGISTER_TOKEN not configured', email)
      return new Response(JSON.stringify({ error: 'Servidor não configurado. Contate o administrador.' }), { status: 500, headers: corsHeaders })
    }

    if (token !== expectedToken) {
      logAttempt(req, 'denied', 'invalid token', email)
      return new Response(JSON.stringify({ error: 'Token de acesso inválido' }), { status: 403, headers: corsHeaders })
    }

    if (password.length < 6) {
      logAttempt(req, 'error', 'password too short', email)
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: email.split('@')[0] },
    })

    if (createError) {
      const msg = createError.message.includes('already been registered')
        ? 'Este e-mail já está cadastrado'
        : createError.message
      logAttempt(req, 'error', `createUser failed: ${createError.message}`, email)
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders })
    }

    const newUserId = userData.user.id

    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'solution_admin' })

    if (roleError) {
      logAttempt(req, 'error', `role assignment failed: ${roleError.message}`, email)
      console.error('Error assigning role:', roleError)
    }

    logAttempt(req, 'success', `solution_admin created ${newUserId}`, email)
    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    logAttempt(req, 'error', `exception: ${(err as Error).message}`)
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

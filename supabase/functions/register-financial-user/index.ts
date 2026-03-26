import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, token } = await req.json()

    if (!email || !password || !token) {
      return new Response(JSON.stringify({ error: 'E-mail, senha e token são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    if (token !== '445') {
      return new Response(JSON.stringify({ error: 'Token de acesso inválido' }), { status: 403, headers: corsHeaders })
    }

    if (password.length < 6) {
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
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders })
    }

    const newUserId = userData.user.id

    // Assign solution_admin role
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'solution_admin' })

    if (roleError) {
      console.error('Error assigning role:', roleError)
    }

    return new Response(JSON.stringify({ success: true, user_id: newUserId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

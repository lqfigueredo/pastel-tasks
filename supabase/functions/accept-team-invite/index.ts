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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const body = await req.json()
    const mode = body.mode || 'accept' // 'preview' or 'accept'
    const token = (body.token || '').trim()

    if (!token || token.length < 32) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), { status: 400, headers: corsHeaders })
    }

    // Hash do token recebido para lookup (tokens são armazenados apenas como hash)
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token))
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Busca convite pelo hash
    const { data: invite, error: inviteError } = await supabaseAdmin
      .from('team_invites')
      .select('id, email, inviter_id, team_id, display_name, expires_at, accepted_at, revoked_at')
      .eq('token_hash', tokenHash)
      .maybeSingle()

    if (inviteError || !invite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), { status: 404, headers: corsHeaders })
    }

    if (invite.revoked_at) {
      return new Response(JSON.stringify({ error: 'Este convite foi revogado', code: 'revoked' }), { status: 400, headers: corsHeaders })
    }
    if (invite.accepted_at) {
      return new Response(JSON.stringify({ error: 'Este convite já foi utilizado', code: 'already_accepted' }), { status: 400, headers: corsHeaders })
    }
    if (new Date(invite.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: 'Este convite expirou', code: 'expired' }), { status: 400, headers: corsHeaders })
    }

    // Busca informações para preview
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', invite.inviter_id)
      .maybeSingle()

    let teamName: string | null = null
    if (invite.team_id) {
      const { data: team } = await supabaseAdmin.from('teams').select('name').eq('id', invite.team_id).maybeSingle()
      teamName = team?.name ?? null
    }

    if (mode === 'preview') {
      return new Response(JSON.stringify({
        email: invite.email,
        display_name: invite.display_name,
        inviter_name: inviterProfile?.display_name || 'Sua equipe',
        team_name: teamName,
        expires_at: invite.expires_at,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Modo accept — exige password e displayName
    const password = body.password
    const displayName = (body.displayName || invite.display_name || '').trim()

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), { status: 400, headers: corsHeaders })
    }
    if (!displayName) {
      return new Response(JSON.stringify({ error: 'Nome é obrigatório' }), { status: 400, headers: corsHeaders })
    }
    if (displayName.length > 100) {
      return new Response(JSON.stringify({ error: 'Nome muito longo' }), { status: 400, headers: corsHeaders })
    }

    // Revalida seats
    const { data: canAdd } = await supabaseAdmin.rpc('admin_can_add_user', { _admin_id: invite.inviter_id })
    if (!canAdd) {
      return new Response(JSON.stringify({
        error: 'O administrador atingiu o limite de assentos. Entre em contato com quem te convidou.'
      }), { status: 403, headers: corsHeaders })
    }

    // Verifica se email já foi cadastrado entre envio e aceite
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === invite.email.toLowerCase())
    if (userExists) {
      return new Response(JSON.stringify({
        error: 'Este email já tem uma conta. Faça login normalmente.'
      }), { status: 400, headers: corsHeaders })
    }

    // Cria usuário
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: invite.email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

    if (createError || !userData?.user) {
      console.error('Create user error:', createError)
      return new Response(JSON.stringify({ error: createError?.message || 'Erro ao criar conta' }), { status: 400, headers: corsHeaders })
    }

    const newUserId = userData.user.id

    // Insere user_approvals como aprovado
    await supabaseAdmin
      .from('user_approvals')
      .insert({
        user_id: newUserId,
        status: 'approved',
        created_by_admin: invite.inviter_id,
        reviewed_at: new Date().toISOString(),
        reviewed_by: invite.inviter_id,
      })

    // Adiciona ao time se especificado
    if (invite.team_id) {
      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({ team_id: invite.team_id, user_id: newUserId })
      if (memberError) {
        console.error('Add to team error:', memberError)
      }
    }

    // Marca convite como aceito
    await supabaseAdmin
      .from('team_invites')
      .update({ accepted_at: new Date().toISOString(), accepted_user_id: newUserId })
      .eq('id', invite.id)

    return new Response(
      JSON.stringify({ success: true, email: invite.email }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('accept-team-invite error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const SITE_URL = 'https://nevvoh.com'
const TRIAL_INVITE_DAYS = 7

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Não autorizado' }), { status: 401, headers: corsHeaders })
    }

    const inviterId = claimsData.claims.sub

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verifica se é admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: inviterId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem enviar convites' }), { status: 403, headers: corsHeaders })
    }

    const body = await req.json()
    const email = (body.email || '').trim().toLowerCase()
    const displayName = (body.displayName || '').trim() || null
    const teamId = body.teamId || null

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Email inválido' }), { status: 400, headers: corsHeaders })
    }
    if (email.length > 255) {
      return new Response(JSON.stringify({ error: 'Email muito longo' }), { status: 400, headers: corsHeaders })
    }
    if (displayName && displayName.length > 100) {
      return new Response(JSON.stringify({ error: 'Nome muito longo' }), { status: 400, headers: corsHeaders })
    }

    // Verifica se já existe usuário com esse email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 })
    const userExists = existingUsers?.users?.some(u => u.email?.toLowerCase() === email)
    if (userExists) {
      return new Response(JSON.stringify({
        error: 'Este email já tem uma conta no NEVVOH. Peça para o usuário fazer login ou adicione-o diretamente ao time.'
      }), { status: 400, headers: corsHeaders })
    }

    // Verifica convite pendente existente
    const { data: existingInvite } = await supabaseAdmin
      .from('team_invites')
      .select('id, expires_at')
      .eq('inviter_id', inviterId)
      .ilike('email', email)
      .is('accepted_at', null)
      .is('revoked_at', null)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()

    if (existingInvite) {
      return new Response(JSON.stringify({
        error: 'Já existe um convite pendente para este email. Reenvie ou revogue o convite atual.'
      }), { status: 400, headers: corsHeaders })
    }

    // Valida disponibilidade de seat
    const { data: canAdd } = await supabaseAdmin.rpc('admin_can_add_user', { _admin_id: inviterId })
    if (!canAdd) {
      return new Response(JSON.stringify({
        error: 'Limite de assentos atingido. Faça upgrade da assinatura para convidar mais usuários.'
      }), { status: 403, headers: corsHeaders })
    }

    // Se tem teamId, valida que inviter é membro do time
    if (teamId) {
      const { data: isMember } = await supabaseAdmin.rpc('is_team_member', { _user_id: inviterId, _team_id: teamId })
      if (!isMember) {
        return new Response(JSON.stringify({ error: 'Você não é membro deste time' }), { status: 403, headers: corsHeaders })
      }
    }

    // Gera token (plaintext só vai pro email) + hash (armazenado no banco)
    const inviteToken = crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
    const tokenHashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(inviteToken))
    const tokenHash = Array.from(new Uint8Array(tokenHashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    const expiresAt = new Date(Date.now() + TRIAL_INVITE_DAYS * 24 * 60 * 60 * 1000)

    const { data: invite, error: insertError } = await supabaseAdmin
      .from('team_invites')
      .insert({
        token_hash: tokenHash,
        email,
        inviter_id: inviterId,
        team_id: teamId,
        display_name: displayName,
        expires_at: expiresAt.toISOString(),
      })
      .select('id, expires_at')
      .single()

    if (insertError) {
      console.error('Insert invite error:', insertError)
      return new Response(JSON.stringify({ error: 'Erro ao criar convite' }), { status: 500, headers: corsHeaders })
    }

    // Busca dados do convidador e do time para o email
    const { data: inviterProfile } = await supabaseAdmin
      .from('profiles')
      .select('display_name')
      .eq('user_id', inviterId)
      .maybeSingle()

    let teamName: string | null = null
    if (teamId) {
      const { data: team } = await supabaseAdmin.from('teams').select('name').eq('id', teamId).maybeSingle()
      teamName = team?.name ?? null
    }

    // Dispara email transacional
    const { error: emailError } = await supabaseAdmin.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'team-invite',
        recipientEmail: email,
        templateData: {
          inviterName: inviterProfile?.display_name || 'Sua equipe',
          inviteeName: displayName || undefined,
          teamName: teamName || undefined,
          acceptUrl: `${SITE_URL}/convite/${inviteToken}`,
          expiresInDays: TRIAL_INVITE_DAYS,
        },
      },
    })

    if (emailError) {
      console.error('Email send error:', emailError)
      // Não falha o convite — admin pode reenviar
    }

    return new Response(
      JSON.stringify({ invite_id: invite.id, expires_at: invite.expires_at }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('invite-team-member error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

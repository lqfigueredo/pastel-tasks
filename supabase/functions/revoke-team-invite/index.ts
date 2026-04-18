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

    const callerId = claimsData.claims.sub
    const { inviteId } = await req.json()

    if (!inviteId) {
      return new Response(JSON.stringify({ error: 'inviteId é obrigatório' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: invite } = await supabaseAdmin
      .from('team_invites')
      .select('id, inviter_id, accepted_at, revoked_at')
      .eq('id', inviteId)
      .maybeSingle()

    if (!invite) {
      return new Response(JSON.stringify({ error: 'Convite não encontrado' }), { status: 404, headers: corsHeaders })
    }

    if (invite.inviter_id !== callerId) {
      const { data: isSolutionAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: callerId, _role: 'solution_admin' })
      if (!isSolutionAdmin) {
        return new Response(JSON.stringify({ error: 'Você não pode revogar este convite' }), { status: 403, headers: corsHeaders })
      }
    }

    if (invite.accepted_at) {
      return new Response(JSON.stringify({ error: 'Este convite já foi aceito e não pode ser revogado' }), { status: 400, headers: corsHeaders })
    }
    if (invite.revoked_at) {
      return new Response(JSON.stringify({ error: 'Convite já estava revogado' }), { status: 400, headers: corsHeaders })
    }

    await supabaseAdmin
      .from('team_invites')
      .update({ revoked_at: new Date().toISOString() })
      .eq('id', inviteId)

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error('revoke-team-invite error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

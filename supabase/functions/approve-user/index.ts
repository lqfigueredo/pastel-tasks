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
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const callerUserId = claimsData.claims.sub

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Check solution_admin role
    const { data: isSolutionAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: callerUserId, _role: 'solution_admin' })
    if (!isSolutionAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas usuários financeiros podem aprovar' }), { status: 403, headers: corsHeaders })
    }

    const { userId, action } = await req.json()

    if (!userId || !['approve', 'reject'].includes(action)) {
      return new Response(JSON.stringify({ error: 'userId e action (approve/reject) são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    if (action === 'approve') {
      // Unban the user
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })

      // Update approval status
      await supabaseAdmin
        .from('user_approvals')
        .update({ status: 'approved', reviewed_at: new Date().toISOString(), reviewed_by: callerUserId })
        .eq('user_id', userId)
    } else {
      // Keep banned, mark as rejected
      await supabaseAdmin
        .from('user_approvals')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: callerUserId })
        .eq('user_id', userId)
    }

    return new Response(JSON.stringify({ success: true, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

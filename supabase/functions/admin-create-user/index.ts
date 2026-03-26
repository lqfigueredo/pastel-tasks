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

    // Check admin role
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: callerUserId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem criar usuários' }), { status: 403, headers: corsHeaders })
    }

    const { email, password, displayName, teamId } = await req.json()

    if (!email || !password || !displayName) {
      return new Response(JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    if (password.length < 6) {
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 6 caracteres' }), { status: 400, headers: corsHeaders })
    }

    // Create user with email already confirmed
    const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName },
    })

    if (createError) {
      const msg = createError.message.includes('already been registered')
        ? 'Este email já está cadastrado'
        : createError.message
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: corsHeaders })
    }

    const newUserId = userData.user.id

    // Ban user until financial approval
    await supabaseAdmin.auth.admin.updateUserById(newUserId, {
      ban_duration: '876000h',
    })

    // Insert pending approval record
    await supabaseAdmin
      .from('user_approvals')
      .insert({ user_id: newUserId, status: 'pending' })

    // Add to team if specified
    if (teamId) {
      // Check team member count
      const { count } = await supabaseAdmin
        .from('team_members')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', teamId)

      const { data: team } = await supabaseAdmin
        .from('teams')
        .select('max_members')
        .eq('id', teamId)
        .single()

      if (team && count !== null && count >= team.max_members) {
        return new Response(JSON.stringify({ 
          error: 'Time já atingiu o limite de membros',
          user_id: newUserId 
        }), { status: 400, headers: corsHeaders })
      }

      const { error: memberError } = await supabaseAdmin
        .from('team_members')
        .insert({ team_id: teamId, user_id: newUserId })

      if (memberError) {
        console.error('Error adding to team:', memberError)
      }
    }

    return new Response(JSON.stringify({ user_id: newUserId, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

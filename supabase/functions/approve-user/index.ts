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
      return new Response(JSON.stringify({ error: 'Apenas usuários financeiros podem gerenciar aprovações' }), { status: 403, headers: corsHeaders })
    }

    const { userId, action, licenseDays, licenseExpiresAt, displayName, email, role } = await req.json()

    if (!userId || !['approve', 'reject', 'deactivate', 'update-license', 'reactivate', 'confirm-email', 'update-profile', 'get-user-info'].includes(action)) {
      return new Response(JSON.stringify({ error: 'userId e action são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    if (action === 'get-user-info') {
      const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId)
      if (userError || !userData?.user) {
        return new Response(JSON.stringify({ error: 'Usuário não encontrado' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      return new Response(JSON.stringify({ email: userData.user.email }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'approve') {
      // Unban the user
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
        email_confirm: true,
      })

      // Calculate license expiration (default 30 days)
      const days = licenseDays || 30
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + days)

      // Update approval status with license expiry
      await supabaseAdmin
        .from('user_approvals')
        .update({
          status: 'approved',
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUserId,
          license_expires_at: expiresAt.toISOString(),
        })
        .eq('user_id', userId)

    } else if (action === 'reject') {
      // Keep banned, mark as rejected
      await supabaseAdmin
        .from('user_approvals')
        .update({ status: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: callerUserId })
        .eq('user_id', userId)

    } else if (action === 'deactivate') {
      // Ban the admin
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: '876000h',
      })

      // Ban all members of teams created by this admin
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('created_by', userId)

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id)
        const { data: members } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds)

        if (members) {
          const uniqueUserIds = [...new Set(members.map(m => m.user_id).filter(id => id !== userId))]
          for (const memberId of uniqueUserIds) {
            await supabaseAdmin.auth.admin.updateUserById(memberId, {
              ban_duration: '876000h',
            })
          }
        }
      }

      // Update status to deactivated
      await supabaseAdmin
        .from('user_approvals')
        .update({
          status: 'deactivated',
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUserId,
        })
        .eq('user_id', userId)

    } else if (action === 'update-license') {
      if (!licenseExpiresAt) {
        return new Response(JSON.stringify({ error: 'licenseExpiresAt é obrigatório para update-license' }), { status: 400, headers: corsHeaders })
      }

      await supabaseAdmin
        .from('user_approvals')
        .update({
          license_expires_at: licenseExpiresAt,
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUserId,
        })
        .eq('user_id', userId)
    } else if (action === 'confirm-email') {
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        email_confirm: true,
      })

    } else if (action === 'update-profile') {
      // Update display name in profiles
      if (displayName && typeof displayName === 'string' && displayName.trim().length > 0 && displayName.trim().length <= 100) {
        await supabaseAdmin
          .from('profiles')
          .update({ display_name: displayName.trim() })
          .eq('user_id', userId)
      }

      // Update email in auth
      if (email && typeof email === 'string' && email.includes('@') && email.length <= 255) {
        const { error: emailError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          email: email.trim(),
          email_confirm: true,
        })
        if (emailError) {
          return new Response(JSON.stringify({ error: 'Erro ao atualizar e-mail: ' + emailError.message }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      // Update role
      if (role && ['admin', 'user'].includes(role)) {
        // Remove existing admin role if demoting
        if (role === 'user') {
          await supabaseAdmin.from('user_roles').delete().eq('user_id', userId).eq('role', 'admin')
        } else if (role === 'admin') {
          const { data: alreadyAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: userId, _role: 'admin' })
          if (!alreadyAdmin) {
            await supabaseAdmin.from('user_roles').insert({ user_id: userId, role: 'admin' })
          }
        }
      }

    } else if (action === 'reactivate') {
      // Unban the user
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        ban_duration: 'none',
      })

      // Set new 30-day license
      const expiresAt = new Date()
      expiresAt.setDate(expiresAt.getDate() + 30)

      await supabaseAdmin
        .from('user_approvals')
        .update({
          status: 'approved',
          license_expires_at: expiresAt.toISOString(),
          reviewed_at: new Date().toISOString(),
          reviewed_by: callerUserId,
        })
        .eq('user_id', userId)

      // Unban all members of teams created by this admin
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('created_by', userId)

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id)
        const { data: members } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds)

        if (members) {
          const uniqueUserIds = [...new Set(members.map(m => m.user_id).filter(id => id !== userId))]
          for (const memberId of uniqueUserIds) {
            await supabaseAdmin.auth.admin.updateUserById(memberId, {
              ban_duration: 'none',
            })
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, action }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

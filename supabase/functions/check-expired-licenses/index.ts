import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Find expired approved licenses
    const { data: expired, error } = await supabaseAdmin
      .from('user_approvals')
      .select('user_id')
      .eq('status', 'approved')
      .lt('license_expires_at', new Date().toISOString())

    if (error) {
      console.error('Error querying expired licenses:', error)
      return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders })
    }

    if (!expired || expired.length === 0) {
      return new Response(JSON.stringify({ message: 'Nenhuma licença expirada', processed: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let processedCount = 0

    for (const record of expired) {
      const adminUserId = record.user_id

      // Ban the admin
      await supabaseAdmin.auth.admin.updateUserById(adminUserId, {
        ban_duration: '876000h',
      })

      // Find all teams created by this admin
      const { data: teams } = await supabaseAdmin
        .from('teams')
        .select('id')
        .eq('created_by', adminUserId)

      if (teams && teams.length > 0) {
        const teamIds = teams.map(t => t.id)
        const { data: members } = await supabaseAdmin
          .from('team_members')
          .select('user_id')
          .in('team_id', teamIds)

        if (members) {
          const uniqueUserIds = [...new Set(members.map(m => m.user_id).filter(id => id !== adminUserId))]
          for (const memberId of uniqueUserIds) {
            await supabaseAdmin.auth.admin.updateUserById(memberId, {
              ban_duration: '876000h',
            })
          }
        }
      }

      // Update status to expired
      await supabaseAdmin
        .from('user_approvals')
        .update({ status: 'expired' })
        .eq('user_id', adminUserId)

      processedCount++
    }

    return new Response(JSON.stringify({ success: true, processed: processedCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})

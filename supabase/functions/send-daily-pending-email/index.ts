import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Require shared cron secret to block public callers
  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  const provided = req.headers.get('x-cron-secret')?.trim()
  if (!cronSecret || provided !== cronSecret) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const today = new Date()
  const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
  const todayFormatted = `${today.getUTCDate().toString().padStart(2, '0')}/${(today.getUTCMonth() + 1).toString().padStart(2, '0')}/${today.getUTCFullYear()}`

  console.log('Starting daily pending email job for', todayStr)

  // 1. Fetch open tasks with estimated_delivery_date <= today and no actual_end_date
  const { data: tasks, error: tasksError } = await supabase
    .from('tasks')
    .select('id, title, estimated_delivery_date, task_assignees(user_id)')
    .is('actual_end_date', null)
    .not('estimated_delivery_date', 'is', null)
    .lte('estimated_delivery_date', todayStr)

  if (tasksError) {
    console.error('Error fetching tasks', tasksError)
    return new Response(JSON.stringify({ error: 'Failed to fetch tasks' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 2. Fetch open meeting pendencies with due_date <= today
  const { data: pendencies, error: pendenciesError } = await supabase
    .from('meeting_pendencies')
    .select('id, description, due_date, meeting_id, responsible_user_id')
    .eq('is_completed', false)
    .not('due_date', 'is', null)
    .lte('due_date', todayStr)

  if (pendenciesError) {
    console.error('Error fetching pendencies', pendenciesError)
    return new Response(JSON.stringify({ error: 'Failed to fetch pendencies' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 3. Group by user
  const userItems: Record<string, {
    tasks: { title: string; estimatedDeliveryDate: string; isOverdue: boolean }[]
    meetingPendencies: { description: string; dueDate: string; meetingId: string; isOverdue: boolean }[]
  }> = {}

  const formatDate = (d: string) => {
    const [y, m, day] = d.split('-')
    return `${day}/${m}/${y}`
  }

  for (const task of tasks || []) {
    const assignees = (task as any).task_assignees as { user_id: string }[] | null
    if (!assignees || assignees.length === 0) continue
    for (const a of assignees) {
      if (!userItems[a.user_id]) userItems[a.user_id] = { tasks: [], meetingPendencies: [] }
      userItems[a.user_id].tasks.push({
        title: task.title,
        estimatedDeliveryDate: formatDate(task.estimated_delivery_date!),
        isOverdue: task.estimated_delivery_date! < todayStr,
      })
    }
  }

  for (const p of pendencies || []) {
    if (!p.responsible_user_id) continue
    if (!userItems[p.responsible_user_id]) userItems[p.responsible_user_id] = { tasks: [], meetingPendencies: [] }
    userItems[p.responsible_user_id].meetingPendencies.push({
      description: p.description,
      dueDate: formatDate(p.due_date!),
      meetingId: p.meeting_id,
      isOverdue: p.due_date! < todayStr,
    })
  }

  const userIds = Object.keys(userItems)
  if (userIds.length === 0) {
    console.log('No pending items found for any user')
    return new Response(JSON.stringify({ success: true, emailsSent: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // 4. Fetch user emails and names
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', userIds)

  const profileMap: Record<string, string> = {}
  for (const p of profiles || []) {
    profileMap[p.user_id] = p.display_name || ''
  }

  // Fetch emails from auth.users via admin API
  let emailsSent = 0

  for (const userId of userIds) {
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData?.user?.email) {
      console.warn('Could not fetch email for user', userId, userError)
      continue
    }

    const items = userItems[userId]
    const idempotencyKey = `daily-pending-${userId}-${todayStr}`

    const { error: sendError } = await supabase.functions.invoke('send-transactional-email', {
      body: {
        templateName: 'daily-pending-summary',
        recipientEmail: userData.user.email,
        idempotencyKey,
        templateData: {
          userName: profileMap[userId] || undefined,
          todayFormatted,
          tasks: items.tasks,
          meetingPendencies: items.meetingPendencies,
        },
      },
    })

    if (sendError) {
      console.error('Failed to send email to', userId, sendError)
    } else {
      emailsSent++
      console.log('Queued daily pending email for', userData.user.email)
    }
  }

  console.log(`Daily pending email job done. Emails sent: ${emailsSent}`)

  return new Response(JSON.stringify({ success: true, emailsSent }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

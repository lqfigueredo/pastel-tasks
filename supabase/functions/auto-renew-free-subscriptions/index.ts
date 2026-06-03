import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const expected = Deno.env.get('CRON_SECRET')
  const provided = req.headers.get('x-cron-secret') || new URL(req.url).searchParams.get('secret')
  if (!expected || provided !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const thresholdIso = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data: subs, error } = await supabase
    .from('subscriptions')
    .select('id, admin_user_id, current_period_end')
    .eq('price_per_seat_cents', 0)
    .lt('current_period_end', thresholdIso)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  let renewed = 0
  for (const sub of subs ?? []) {
    const start = sub.current_period_end ? new Date(sub.current_period_end) : new Date()
    if (start.getTime() < Date.now()) start.setTime(Date.now())
    const end = new Date(start.getTime())
    end.setFullYear(end.getFullYear() + 1)

    const { error: updErr } = await supabase
      .from('subscriptions')
      .update({
        status: 'active',
        current_period_start: start.toISOString(),
        current_period_end: end.toISOString(),
        past_due_since: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', sub.id)

    if (updErr) {
      console.error('Failed to renew sub', sub.id, updErr)
      continue
    }

    await supabase.from('subscription_changes').insert({
      subscription_id: sub.id,
      admin_user_id: sub.admin_user_id,
      change_type: 'auto_renewed_free',
      new_value: { current_period_end: end.toISOString() },
      reason: 'Auto-renewal of free subscription',
    })
    renewed++
  }

  return new Response(JSON.stringify({ ok: true, evaluated: subs?.length ?? 0, renewed }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
})

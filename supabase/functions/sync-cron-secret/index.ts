import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  // Require service role key to invoke (admin-only utility)
  const auth = req.headers.get('authorization') ?? ''
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if (auth !== `Bearer ${serviceKey}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET env not set' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  const { error } = await supabase.rpc('sync_cron_secret_from_value', { _value: cronSecret })

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ ok: true, length: cronSecret.length, first8: cronSecret.slice(0, 8) }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// One-shot utility: copies CRON_SECRET env -> vault. Will be deleted right after.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  const cronSecret = Deno.env.get('CRON_SECRET')?.trim()
  if (!cronSecret) {
    return new Response(JSON.stringify({ error: 'CRON_SECRET env not set' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )
  const { error } = await admin.rpc('sync_cron_secret_from_value', { _value: cronSecret })
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
  return new Response(
    JSON.stringify({ ok: true, length: cronSecret.length }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  )
})

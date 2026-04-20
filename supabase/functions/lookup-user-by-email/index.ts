import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Validate auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const supabaseAuth = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const token = authHeader.replace('Bearer ', '')
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    const callerId = claimsData.claims.sub as string

    const { email } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') {
      return jsonResponse({ error: 'Email is required' }, 400)
    }

    // Use service role to lookup user by email (kept open to authenticated users
    // because team-invite flow relies on it; enumeration is mitigated by uniform
    // 200 responses regardless of whether the email exists).
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    if (error) {
      console.error('listUsers failed', { callerId, message: error.message })
      return jsonResponse({ error: 'Failed to lookup user' }, 500)
    }

    const found = users.find(u => u.email?.toLowerCase() === email.toLowerCase())
    if (!found) {
      // Uniform 200 response (no 404) to avoid email enumeration via status code.
      return jsonResponse({ found: false, error: 'Usuário não encontrado com este email' })
    }

    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('user_id', found.id)
      .single()

    return jsonResponse({
      found: true,
      user_id: found.id,
      display_name: profile?.display_name || found.email,
      avatar_url: profile?.avatar_url || null,
      email: found.email,
    })
  } catch (err) {
    console.error('lookup-user-by-email exception', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
})

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const FREE_ACCESS_DAYS = 365

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { email, password, displayName, turnstile_token: turnstileToken } = await req.json()

    if (!email || !password || !displayName) {
      return new Response(JSON.stringify({ error: 'Email, senha e nome são obrigatórios' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (typeof password !== 'string' || password.length < 8) {
      return new Response(JSON.stringify({ error: 'A senha deve ter pelo menos 8 caracteres' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Verify Cloudflare Turnstile (bot protection)
    const turnstileSecret = Deno.env.get('TURNSTILE_SECRET_KEY')
    if (turnstileSecret) {
      if (!turnstileToken || typeof turnstileToken !== 'string') {
        return new Response(JSON.stringify({ error: 'Verificação anti-bot ausente.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      const formData = new FormData()
      formData.append('secret', turnstileSecret)
      formData.append('response', turnstileToken)
      const remoteIp = req.headers.get('cf-connecting-ip') || req.headers.get('x-forwarded-for')
      if (remoteIp) formData.append('remoteip', remoteIp.split(',')[0].trim())
      const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: formData })
      const verifyJson = (await verifyRes.json()) as { success?: boolean }
      if (!verifyJson.success) {
        return new Response(JSON.stringify({ error: 'Falha na verificação anti-bot. Tente novamente.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
    }


    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Create user with confirmed email and immediate access (no ban)
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
      return new Response(JSON.stringify({ error: msg }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const newUserId = userData.user.id

    // Promote to admin (replaces the default 'user' role created by handle_new_user trigger)
    // Remove default 'user' role first to avoid having both
    await supabaseAdmin.from('user_roles').delete().eq('user_id', newUserId).eq('role', 'user')
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({ user_id: newUserId, role: 'admin' })

    if (roleError) {
      console.error('Failed to assign admin role:', roleError)
    }

    // Pick default plan (or first active, or fallback values)
    const { data: defaultPlan } = await supabaseAdmin
      .from('plans')
      .select('id, minimum_seats, price_per_seat_cents, currency')
      .eq('is_active', true)
      .eq('is_default', true)
      .maybeSingle()

    let plan = defaultPlan
    if (!plan) {
      const { data: anyActive } = await supabaseAdmin
        .from('plans')
        .select('id, minimum_seats, price_per_seat_cents, currency')
        .eq('is_active', true)
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle()
      plan = anyActive
    }

    const minimumSeats = plan?.minimum_seats ?? 10
    const priceCents = plan?.price_per_seat_cents ?? 0
    const currency = plan?.currency ?? 'BRL'
    const planId = plan?.id ?? null

    const now = new Date()
    const periodEnd = new Date(now.getTime() + FREE_ACCESS_DAYS * 24 * 60 * 60 * 1000)

    const { error: subError } = await supabaseAdmin.from('subscriptions').insert({
      admin_user_id: newUserId,
      status: 'active',
      provider: 'free',
      plan_id: planId,
      seats_purchased: minimumSeats,
      minimum_seats: minimumSeats,
      price_per_seat_cents: 0,
      currency,
      trial_ends_at: null,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    })

    if (subError) {
      console.error('Failed to create free subscription:', subError)
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Conta criada! Você tem acesso gratuito por 1 ano. Faça login para começar.',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})

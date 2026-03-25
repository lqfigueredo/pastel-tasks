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

    const { data: { user: caller }, error: userError } = await supabaseAuth.auth.getUser()
    if (userError || !caller) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })
    }

    const callerUserId = caller.id

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Verify caller is admin
    const { data: isAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: callerUserId, _role: 'admin' })
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem gerenciar usuários' }), { status: 403, headers: corsHeaders })
    }

    const { action, targetUserId } = await req.json()

    if (!action || !targetUserId) {
      return new Response(JSON.stringify({ error: 'action e targetUserId são obrigatórios' }), { status: 400, headers: corsHeaders })
    }

    // Prevent self-actions
    if (targetUserId === callerUserId && (action === 'deactivate' || action === 'demote')) {
      return new Response(JSON.stringify({ error: 'Você não pode realizar esta ação em si mesmo' }), { status: 400, headers: corsHeaders })
    }

    switch (action) {
      case 'deactivate': {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: '876000h',
        })
        if (error) {
          return new Response(JSON.stringify({ error: 'Erro ao inativar usuário' }), { status: 500, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true, message: 'Usuário inativado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'activate': {
        const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          ban_duration: 'none',
        })
        if (error) {
          return new Response(JSON.stringify({ error: 'Erro ao reativar usuário' }), { status: 500, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true, message: 'Usuário reativado' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'promote': {
        const { data: alreadyAdmin } = await supabaseAdmin.rpc('has_role', { _user_id: targetUserId, _role: 'admin' })
        if (alreadyAdmin) {
          return new Response(JSON.stringify({ error: 'Usuário já é administrador' }), { status: 400, headers: corsHeaders })
        }
        const { error } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: targetUserId, role: 'admin' })
        if (error) {
          return new Response(JSON.stringify({ error: 'Erro ao promover usuário' }), { status: 500, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true, message: 'Usuário promovido a admin' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      case 'demote': {
        const { error } = await supabaseAdmin
          .from('user_roles')
          .delete()
          .eq('user_id', targetUserId)
          .eq('role', 'admin')
        if (error) {
          return new Response(JSON.stringify({ error: 'Erro ao remover admin' }), { status: 500, headers: corsHeaders })
        }
        return new Response(JSON.stringify({ success: true, message: 'Admin removido' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      default:
        return new Response(JSON.stringify({ error: 'Ação inválida' }), { status: 400, headers: corsHeaders })
    }
  } catch (err) {
    console.error('Error:', err)
    return new Response(JSON.stringify({ error: 'Erro interno do servidor' }), { status: 500, headers: corsHeaders })
  }
})



# Limite de usuários por administrador (definido pelo Financeiro)

## Contexto
Atualmente, administradores podem criar usuários sem limite. O financeiro (solution_admin) precisa poder definir o máximo de usuários que cada administrador pode cadastrar. O vínculo admin→usuários já existe via `user_approvals.created_by_admin`.

## Alterações

### 1. Nova coluna na tabela `user_approvals`
Adicionar `max_users` na tabela `user_approvals` para armazenar o limite por admin. Como cada admin tem um registro próprio em `user_approvals`, usaremos esse registro para guardar o limite.

**Problema**: `user_approvals` tem um registro por usuário, não por admin. Precisamos de outra abordagem.

**Solução**: Criar uma nova tabela `admin_settings` para configurações por admin.

```sql
CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL UNIQUE,
  max_users integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Solution admins podem ver e editar
CREATE POLICY "Solution admins can manage admin_settings"
  ON public.admin_settings FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'));

-- Admin pode ver suas próprias configurações
CREATE POLICY "Admin can view own settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());
```

### 2. UI no Financeiro (`Financial.tsx`)
Na tabela de aprovações, agrupar a visão por admin (aqueles com role `admin`). Para cada admin, mostrar:
- Nome do admin
- Quantidade atual de usuários criados (count de `user_approvals` onde `created_by_admin = admin_id`)
- Campo editável com o limite máximo (`max_users`)
- Botão para salvar o limite

Isso será uma nova aba "Limites" ou integrado na aba de Aprovações com uma coluna extra mostrando "Usuários: 3/10" e botão para editar o limite.

### 3. Validação na Edge Function `admin-create-user`
Antes de criar um novo usuário, verificar:
```typescript
// Contar usuários já criados por este admin
const { count } = await supabaseAdmin
  .from('user_approvals')
  .select('*', { count: 'exact', head: true })
  .eq('created_by_admin', callerUserId)

// Buscar limite
const { data: settings } = await supabaseAdmin
  .from('admin_settings')
  .select('max_users')
  .eq('admin_user_id', callerUserId)
  .single()

const maxUsers = settings?.max_users ?? 10
if (count !== null && count >= maxUsers) {
  return error 403: "Limite de usuários atingido"
}
```

### 4. Exibir limite no painel Admin (`Admin.tsx`)
Mostrar ao admin quantos usuários ele ainda pode criar: "Usuários: 3/10".

## Arquivos modificados
- **Migração SQL**: criar tabela `admin_settings`
- **`supabase/functions/admin-create-user/index.ts`**: adicionar validação de limite
- **`src/pages/Financial.tsx`**: adicionar UI para definir limite por admin
- **`src/pages/Admin.tsx`**: exibir limite atual do admin


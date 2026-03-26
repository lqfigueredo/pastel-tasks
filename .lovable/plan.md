

# Aprovação de Usuários pelo Financeiro (solution_admin)

## Resumo

Quando um `admin` cria um usuário, esse usuário ficará com status "pendente de aprovação". O `solution_admin` verá a lista de usuários pendentes na tela Financeiro e poderá aprovar ou rejeitar. Somente após aprovação o usuário poderá fazer login. Usuários já existentes ficam automaticamente aprovados.

## Banco de Dados

### Tabela `user_approvals`

```sql
CREATE TABLE public.user_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

-- solution_admin pode ver e atualizar
CREATE POLICY "Solution admins can view approvals"
  ON public.user_approvals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

CREATE POLICY "Solution admins can update approvals"
  ON public.user_approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

-- Admins podem inserir (ao criar usuário)
CREATE POLICY "Admins can insert approvals"
  ON public.user_approvals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Edge functions com service role também inserem
```

## Edge Functions

### `admin-create-user` (modificar)

Após criar o usuário:
1. Inserir registro em `user_approvals` com status `pending`
2. Banir o usuário imediatamente (`ban_duration: '876000h'`) para impedir login até aprovação

### Nova edge function: `approve-user`

Recebe `{ userId, action: 'approve' | 'reject' }`:
- Valida que o chamador tem role `solution_admin`
- Se `approve`: desbanir o usuário (`ban_duration: 'none'`), atualizar `user_approvals` para `approved`
- Se `reject`: manter banido, atualizar para `rejected`

## Front-end

### `Financial.tsx` — reformular com abas

Usar `Tabs` com duas abas:
1. **Leads** — tabela atual de leads
2. **Aprovações** — lista de usuários pendentes de aprovação com botões Aprovar/Rejeitar

A aba Aprovações mostra:
- Nome (via join com `profiles`), status, data de solicitação
- Botões de ação para aprovar/rejeitar
- Badge com contagem de pendentes

## Arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar tabela `user_approvals` com RLS |
| `supabase/functions/admin-create-user/index.ts` | Inserir approval + banir novo usuário |
| `supabase/functions/approve-user/index.ts` | Nova function para aprovar/rejeitar |
| `src/pages/Financial.tsx` | Adicionar aba de aprovações com ações |


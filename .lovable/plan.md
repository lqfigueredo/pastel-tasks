

# Cadastro de Usuário pelo Admin (com Time)

Criar uma página de administração onde admins podem cadastrar novos usuários e já associá-los a um time.

## Mudanças

### 1. Edge Function `admin-create-user`

Nova edge function que recebe `{ email, password, displayName, teamId? }` e:
- Valida que o chamador tem role `admin` (via token JWT)
- Usa `supabase.auth.admin.createUser()` com `email_confirm: true` (já confirmado)
- O trigger `handle_new_user` já cria o profile e o role `user` automaticamente
- Se `teamId` fornecido, insere em `team_members`
- Retorna o `user_id` criado

### 2. Página Admin (`src/pages/Admin.tsx`)

Acessível apenas por admins. Contém:
- **Formulário de cadastro**: campos Nome, Email, Senha, seletor de Time (opcional, dropdown com times existentes)
- **Lista de usuários**: tabela com nome, email, time, data de criação
- Verificação de role admin via `has_role` no carregamento — se não for admin, redireciona ou mostra mensagem de acesso negado

### 3. Rota e Navegação

- Adicionar rota `/admin` em `App.tsx`
- Adicionar item "Administração" no sidebar (`AppSidebar.tsx`), visível apenas para admins
- Usar `ShieldCheck` icon do lucide

### 4. Migration — RLS para admin listar usuários

Não é necessário migration extra: o edge function usa `service_role` para criar usuários, e a listagem de profiles já permite SELECT para todos autenticados. Para listar times, a policy existente já cobre membros — mas o admin precisa ver todos os times:

```sql
CREATE POLICY "Admins can view all teams" ON public.teams
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
```

## Arquivos

| Arquivo | Alteração |
|---|---|
| `supabase/functions/admin-create-user/index.ts` | Nova edge function |
| Migration SQL | Policy admin view all teams |
| `src/pages/Admin.tsx` | Nova página de administração |
| `src/App.tsx` | Adicionar rota `/admin` |
| `src/components/AppSidebar.tsx` | Item "Administração" condicional para admins |

## Fluxo

1. Admin acessa "Administração" no sidebar
2. Preenche nome, email, senha e opcionalmente seleciona um time
3. Clica "Cadastrar" → edge function cria o usuário (já confirmado) e adiciona ao time
4. Usuário aparece na lista e pode fazer login imediatamente




# Restringir visibilidade de usuários ao admin que os criou

## Problema
Na página Admin, qualquer admin vê **todos** os perfis do sistema. O correto é que cada admin veja apenas seu próprio cadastro e os usuários que ele mesmo criou.

## Solução

### 1. Adicionar coluna `created_by_admin` na tabela `user_approvals`
Nova coluna `uuid` nullable que armazena o ID do admin que criou o usuário. Será `null` para auto-cadastros (fluxo público).

```sql
ALTER TABLE public.user_approvals ADD COLUMN created_by_admin uuid;
```

### 2. Atualizar edge function `admin-create-user`
Gravar `created_by_admin = callerUserId` no registro de `user_approvals` ao criar o usuário.

### 3. Filtrar dados na página Admin (`src/pages/Admin.tsx`)
Em vez de carregar todos os profiles, carregar apenas:
- O próprio perfil do admin
- Perfis de usuários cujo `user_approvals.created_by_admin` é o admin logado

Consulta: buscar `user_approvals` onde `created_by_admin = user.id`, extrair os `user_id`s, e filtrar os profiles por esses IDs + o próprio ID.

### 4. Adicionar RLS policy para admin ver approvals que criou
```sql
CREATE POLICY "Admins can view own created approvals"
ON public.user_approvals
FOR SELECT TO authenticated
USING (created_by_admin = auth.uid());
```

### Resultado
- Admin só vê e gerencia usuários que ele próprio cadastrou
- Solution_admin (financeiro) continua vendo todos
- Auto-cadastros (`created_by_admin = null`) ficam visíveis apenas para solution_admin

## Detalhes técnicos
- Migration: 1 coluna nova + 1 RLS policy
- Edge function: `admin-create-user` (gravar `created_by_admin`)
- Frontend: `Admin.tsx` (filtrar por vínculo)


## Problema
O perfil financeiro (`solution_admin`) recebe erro 403 (RLS) ao criar status:
> `new row violates row-level security policy for table "task_statuses"`

A política `Users can insert statuses` exige que o usuário tenha role `admin` quando `team_id IS NULL`. O `solution_admin` não tem essa role, então é bloqueado mesmo sendo o admin financeiro do sistema.

As políticas de UPDATE e DELETE também não contemplam `solution_admin`, então renomear, reordenar ou arquivar status criados por ele também falhariam.

## Solução — Migration de RLS

Atualizar as políticas da tabela `task_statuses` para incluir `solution_admin`:

### 1. INSERT
Substituir `Users can insert statuses` para permitir:
- `admin` com team (mantém atual), OU
- `admin` sem team (mantém atual), OU
- **`solution_admin` (qualquer caso)** ← novo

### 2. UPDATE
Substituir `Users can update own statuses` para permitir owner/team_member **OU** `solution_admin` sobre seus próprios status.

### 3. DELETE
Substituir `Users can delete own statuses` similarmente — mantendo a proteção de não excluir `is_default`.

### 4. SELECT
Manter inalterado — o filtro client-side em `useStatusesQuery` já restringe a visualização do solution_admin aos próprios + defaults.

## Arquivo
- Nova migration SQL com `DROP POLICY` + `CREATE POLICY` para INSERT/UPDATE/DELETE em `public.task_statuses`.

## Validação
Após aplicar, o solution_admin deverá conseguir criar "Aguardando" sem erro 403, e a listagem continuará mostrando apenas seus status + defaults.
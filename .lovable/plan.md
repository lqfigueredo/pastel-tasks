

# Restringir visibilidade de status do Kanban por admin

## Problema
A tabela `task_statuses` não tem coluna `created_by`, e a RLS de SELECT permite que todos vejam todos os status (`USING (true)`). Cada admin deveria ver apenas os status que ele criou.

## Solução

### 1. Migration: adicionar `created_by` à tabela `task_statuses`
- Adicionar coluna `created_by uuid` nullable (para não quebrar registros existentes)
- Atualizar a RLS de SELECT: trocar `USING (true)` por `USING (created_by = auth.uid())`, mantendo acesso para statuses com `team_id` via `is_team_member` e statuses default
- Política final de SELECT:
  ```sql
  (created_by = auth.uid())
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR is_default = true
  ```

### 2. Migration: vincular status existentes aos admins corretos
- Consultar os status existentes e atribuir o `created_by` correto com base nos dados conhecidos (lqfigueredo e luciano@institutototum)

### 3. Frontend: gravar `created_by` ao criar status
- `src/pages/Settings.tsx`: adicionar `created_by: user!.id` no insert de `task_statuses`

### Resultado
- Cada admin vê apenas seus próprios status e os status default
- Status de equipe continuam visíveis para membros do time




# Correção: Responsáveis não aparecem para membros do time

## Problema
A tabela `task_assignees` tem políticas RLS que só permitem visualização para:
1. O próprio assignee (`user_id = auth.uid()`)
2. O dono da tarefa (`is_task_owner`)

Usuários que veem a tarefa via **membership de time** conseguem ver a tarefa, mas **não conseguem ler os registros de `task_assignees`**, resultando na lista de responsáveis vazia.

## Solução
Adicionar uma nova política RLS SELECT na tabela `task_assignees` para permitir que membros do time vejam os assignees das tarefas do time:

```sql
CREATE POLICY "Team members can view task assignees"
  ON public.task_assignees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE t.id = task_assignees.task_id
        AND t.team_id IS NOT NULL
        AND is_team_member(auth.uid(), t.team_id)
    )
  );
```

## Arquivo editado
- Nova migration SQL (política RLS em `task_assignees`)


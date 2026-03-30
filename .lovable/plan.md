

# Francisco não vê as tarefas — problema na RLS de `task_statuses`

## Causa raiz

Os status "Em andamento" e "Finalizado" foram criados pelo admin e **não são marcados como `is_default`**. A política RLS de `task_statuses` só permite ver status que:
- O próprio usuário criou (`created_by = auth.uid()`)
- São default (`is_default = true`)
- Pertencem a um time do qual o usuário é membro

Como francisco não criou esses status, eles não são default, e não têm time associado, ele **não consegue vê-los**. Sem os status visíveis, as tarefas atribuídas a ele não aparecem em nenhuma coluna.

## Solução

Adicionar uma nova política RLS na tabela `task_statuses` que permita a qualquer usuário autenticado ver status que são usados em tarefas atribuídas a ele:

```sql
CREATE POLICY "Assignees can view statuses of assigned tasks"
ON public.task_statuses FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t
    JOIN public.task_assignees ta ON ta.task_id = t.id
    WHERE t.status_id = task_statuses.id
    AND ta.user_id = auth.uid()
  )
);
```

**Alternativa mais simples**: marcar os status globais (sem `team_id`) como visíveis para todos os usuários autenticados, já que são status compartilhados do sistema:

```sql
CREATE POLICY "All users can view global statuses"
ON public.task_statuses FOR SELECT
TO authenticated
USING (team_id IS NULL);
```

A segunda opção é mais simples e cobre o caso de uso: status sem time são globais e devem ser visíveis a todos.

## Recomendação

Usar a alternativa simples (`team_id IS NULL`), pois status globais já são compartilhados por definição. Isso resolve o problema do francisco e de qualquer outro usuário que receba tarefas.

### Arquivos editados
- Nova migration SQL (política RLS em `task_statuses`)


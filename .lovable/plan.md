

# Por que francisco@institutototum.com.br nao ve as tarefas do admin

## Causa raiz

A query do `KanbanBoard.tsx` (linha 52) filtra tarefas apenas por `created_by = user.id`:

```typescript
supabase.from('tasks').select('*').eq('created_by', user.id)
```

Isso significa que cada usuario so ve tarefas que **ele proprio criou**. Se o admin criou uma tarefa e atribuiu francisco como responsavel, francisco nao a vera porque nao e o `created_by`.

## Solucao

### 1. Alterar a query de tarefas no `KanbanBoard.tsx`

Buscar tarefas onde o usuario e criador **OU** e assignee:

- Primeiro, buscar os `task_id`s da tabela `task_assignees` onde `user_id = user.id`
- Depois, buscar tasks com filtro `or(created_by.eq.{userId}, id.in.({assignedTaskIds}))`
- Alternativa mais simples: usar duas queries paralelas e fazer merge/dedupe no frontend

### 2. Verificar RLS na tabela `tasks`

A RLS ja tem uma policy "Users can view own tasks" (`created_by = auth.uid()`) mas **nao tem** uma policy para assignees verem tarefas atribuidas a eles. Precisamos adicionar:

```sql
CREATE POLICY "Assignees can view assigned tasks"
ON public.tasks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.task_assignees
    WHERE task_assignees.task_id = tasks.id
    AND task_assignees.user_id = auth.uid()
  )
);
```

### 3. Atualizar a query no frontend

Remover o filtro `.eq('created_by', user.id)` e confiar nas policies RLS para filtrar os resultados corretos. A query ficaria:

```typescript
supabase.from('tasks').select('*').order('created_at', { ascending: false })
```

A RLS ja garante que o usuario so vera: tasks proprias, tasks do time, e (com a nova policy) tasks onde e assignee.

### Arquivos editados
- Nova migration SQL (policy RLS para assignees)
- `src/components/kanban/KanbanBoard.tsx` (remover filtro `created_by`)


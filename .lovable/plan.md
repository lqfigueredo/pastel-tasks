

# Dashboard: incluir tarefas atribuídas ao usuário

Atualmente o Dashboard busca apenas tarefas onde `created_by = user.id`. A mudança incluirá tambem tarefas onde o usuario e assignee.

## Mudança

### `src/pages/Dashboard.tsx` — `fetchData`

1. Buscar os `task_id`s onde o usuario e assignee: filtrar `assigneeRes.data` por `user_id === user.id` para obter a lista de task IDs atribuidos
2. Fazer uma segunda query de tasks por esses IDs (usando `.in('id', assignedTaskIds)`) — ou alternativamente, remover o filtro `eq('created_by')` e usar RLS que ja permite ver tasks do time
3. Mesclar as duas listas (tasks criadas + tasks atribuidas), removendo duplicatas por `id`
4. Continuar o fluxo normal de montar assignees e renderizar

### Abordagem concreta

- Manter a query atual `tasks.eq('created_by', user.id)` 
- Adicionar query: `supabase.from('task_assignees').select('task_id').eq('user_id', user.id)` para obter IDs de tasks atribuidas
- Com esses IDs, buscar `supabase.from('tasks').select('*').in('id', assignedTaskIds)` 
- Merge ambas listas, dedup por `Set` de IDs
- Nota: a RLS ja tem policy "Team members can view team tasks" que permite SELECT em tasks do time, entao as tasks atribuidas serao visiveis

### Detalhes

- Arquivo unico: `src/pages/Dashboard.tsx`
- Sem mudanca de banco de dados
- A query de assignees para o usuario pode ser feita em paralelo com as outras queries existentes


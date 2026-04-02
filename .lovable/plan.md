

# Vincular Ideias diretamente pela Tarefa

## Situação atual
O componente `TaskLinkedIdeas` (exibido no dialog da tarefa) e somente leitura - mostra ideias vinculadas mas nao permite adicionar ou remover vinculos. Apenas o dialog da ideia (`IdeaLinkedTasks`) permite gerenciar vinculos.

## Problema de RLS
A policy atual `idea_tasks` so permite INSERT/DELETE para o **dono da ideia** (`ideas.created_by = auth.uid()`). Para vincular a partir da tarefa, preciso adicionar uma policy que permita ao **dono da tarefa** tambem gerenciar vinculos.

## Plano

### 1. Migration - nova RLS policy
Adicionar policy permitindo que o criador da tarefa possa inserir e deletar registros em `idea_tasks`:

```sql
CREATE POLICY "Task owner can manage idea links"
  ON public.idea_tasks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM tasks WHERE id = idea_tasks.task_id AND created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM tasks WHERE id = idea_tasks.task_id AND created_by = auth.uid())
  );
```

### 2. Expandir `TaskLinkedIdeas` com busca e vinculacao
Transformar o componente de somente-leitura para incluir:
- Busca de ideias por titulo (similar ao `IdeaLinkedTasks`)
- Botao para vincular ideia encontrada
- Botao X para desvincular
- Receber prop `isOwner` (criador da tarefa) para controlar permissoes de edicao

### 3. Atualizar `TaskDetailDialog`
Passar `isOwner={task.created_by === user?.id}` para o `TaskLinkedIdeas`.

### Arquivos
- `supabase/migrations/` — nova policy RLS
- `src/components/kanban/TaskLinkedIdeas.tsx` — adicionar busca, vincular/desvincular
- `src/components/kanban/TaskDetailDialog.tsx` — passar prop `isOwner`


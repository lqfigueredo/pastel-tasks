

# Vincular Ideias a Tarefas (relação muitos-para-muitos)

## Resumo
Criar uma tabela de junção `idea_tasks` para vincular ideias a tarefas. Exibir as tarefas vinculadas dentro do dialog da ideia e as ideias vinculadas dentro do dialog da tarefa.

## Banco de dados

Nova tabela `idea_tasks`:
```sql
CREATE TABLE public.idea_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL,
  task_id uuid NOT NULL,
  linked_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(idea_id, task_id)
);

ALTER TABLE public.idea_tasks ENABLE ROW LEVEL SECURITY;

-- Todos autenticados podem ver os vínculos
CREATE POLICY "Authenticated can view idea_tasks"
  ON public.idea_tasks FOR SELECT TO authenticated
  USING (true);

-- Criador da ideia pode gerenciar vínculos
CREATE POLICY "Idea owner can manage links"
  ON public.idea_tasks FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM ideas WHERE id = idea_tasks.idea_id AND created_by = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM ideas WHERE id = idea_tasks.idea_id AND created_by = auth.uid())
  );
```

## Componentes

### 1. Novo componente `IdeaLinkedTasks` (src/components/ideas/IdeaLinkedTasks.tsx)
- Exibido no `EditIdeaDialog`, mostra lista de tarefas vinculadas (título + status)
- Se o usuário for dono da ideia, mostra um seletor para buscar e vincular tarefas existentes
- Botao para desvincular tarefa

### 2. Novo componente `TaskLinkedIdeas` (src/components/kanban/TaskLinkedIdeas.tsx)
- Exibido no `TaskDetailDialog`, mostra lista de ideias vinculadas (título + badge implementada/pendente)
- Somente leitura (vínculo é gerenciado pela ideia)

### 3. Alterações em arquivos existentes
- **EditIdeaDialog.tsx**: adicionar `<IdeaLinkedTasks ideaId={idea.id} isOwner={isOwner} />` abaixo dos anexos
- **TaskDetailDialog.tsx**: adicionar `<TaskLinkedIdeas taskId={task.id} />` na seção de detalhes

## Arquivos
- `supabase/migrations/` — nova migration para `idea_tasks`
- `src/components/ideas/IdeaLinkedTasks.tsx` (novo)
- `src/components/kanban/TaskLinkedIdeas.tsx` (novo)
- `src/components/ideas/EditIdeaDialog.tsx` — adicionar componente
- `src/components/kanban/TaskDetailDialog.tsx` — adicionar componente


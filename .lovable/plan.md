

# Timer de Horas por Tarefa

## Resumo
Adicionar um cronômetro (timer) nas tarefas que permite ao usuário registrar sessões de trabalho com início/fim, visualizar o histórico de sessões e consolidar o total de horas gastas.

## 1. Banco de Dados

### Nova tabela `task_time_entries`
```sql
CREATE TABLE public.task_time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;

-- Quem pode ver: dono da tarefa, assignees, membros do time
CREATE POLICY "Task owner can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (is_task_owner(task_id, auth.uid()));

CREATE POLICY "Assignees can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (is_task_assignee(task_id, auth.uid()));

CREATE POLICY "Team members can view time entries" ON public.task_time_entries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM tasks t
    WHERE t.id = task_time_entries.task_id
      AND t.team_id IS NOT NULL
      AND is_team_member(auth.uid(), t.team_id)
  ));

-- Usuário pode gerenciar seus próprios registros
CREATE POLICY "Users can manage own time entries" ON public.task_time_entries
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE INDEX idx_task_time_entries_task ON public.task_time_entries(task_id);
CREATE INDEX idx_task_time_entries_user ON public.task_time_entries(user_id);
```

## 2. Componente `TaskTimer.tsx`
Novo componente `src/components/kanban/TaskTimer.tsx`:
- Botão "Iniciar" que cria um registro com `started_at = now()` e `ended_at = null`
- Enquanto ativo, mostra cronômetro em tempo real (hh:mm:ss)
- Botão "Parar" que atualiza `ended_at = now()` no registro aberto
- Lista de sessões anteriores com data/hora início, fim e duração
- Botão "Consolidar Horas" que calcula e exibe o total por usuário
- Apenas o próprio usuário pode iniciar/parar seu timer

## 3. Integração no `TaskDetailDialog.tsx`
- Adicionar o componente `TaskTimer` dentro do dialog de detalhes, após os anexos
- Separado por `<Separator />`

## 4. Fluxo do Usuário
1. Abre o card da tarefa
2. Clica em "Iniciar Timer" → registro criado, cronômetro começa
3. Trabalha na atividade
4. Clica em "Parar Timer" → registro atualizado com hora de fim
5. Pode iniciar novamente para nova sessão
6. Clica em "Consolidar Horas" → vê tabela com total por usuário

## Arquivos criados/editados
- **Migration SQL**: tabela `task_time_entries` com RLS
- `src/components/kanban/TaskTimer.tsx` (novo)
- `src/components/kanban/TaskDetailDialog.tsx` (adicionar TaskTimer)


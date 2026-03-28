

# Adicionar campo "Tarefa Crítica" com indicador visual

## Mudanças no Banco de Dados

### Migration: adicionar coluna `is_critical` na tabela `tasks`
```sql
ALTER TABLE public.tasks ADD COLUMN is_critical boolean NOT NULL DEFAULT false;
```

## Mudanças no Frontend

### 1. Atualizar interface `Task` em `KanbanBoard.tsx`
- Adicionar `is_critical: boolean` à interface `Task`

### 2. `CreateTaskDialog.tsx` — toggle para marcar como crítica
- Adicionar `Switch` com label "Tarefa Crítica" no formulário de criação
- Salvar `is_critical` no insert

### 3. `TaskDetailDialog.tsx` — toggle para editar criticidade
- Adicionar `Switch` para alterar `is_critical`
- Salvar no update junto com os outros campos

### 4. `KanbanCard.tsx` — indicador visual chamativo
- Se `task.is_critical`, exibir ícone `AlertTriangle` (lucide) em vermelho/laranja ao lado do título
- Adicionar borda lateral colorida (ex: `border-l-4 border-red-500`) para destaque visual sem quebrar o design

### 5. `TaskTooltip.tsx` — exibir indicação no tooltip do Dashboard
- Se `is_critical`, mostrar badge/texto "Crítica" com ícone de exclamação

## Resultado
- Tarefas críticas ficam visualmente destacadas no Kanban e no Dashboard
- O destaque usa cores de alerta (vermelho/laranja) harmonizadas com o tema claro e escuro
- Toggle simples na criação e edição da tarefa


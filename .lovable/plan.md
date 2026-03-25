

# Adicionar campo "Fim Real" (data de conclusão) com marca visual no calendário

## O que muda

### 1. Nova coluna no banco de dados
Adicionar coluna `actual_end_date` (tipo `date`, nullable) na tabela `tasks` — representa a data real de conclusão da tarefa.

### 2. Atualizar interface `Task` em `src/components/kanban/KanbanBoard.tsx`
Adicionar `actual_end_date: string | null` ao tipo `Task`.

### 3. Atualizar `TaskDetailDialog` em `src/components/kanban/TaskDetailDialog.tsx`
- Adicionar campo de data "Fim Real" no formulário de edição
- Salvar o valor no banco ao atualizar a tarefa

### 4. Marca visual no calendário em `src/pages/Dashboard.tsx`
- No dia correspondente ao `actual_end_date`, renderizar um indicador visual destacado — um badge/chip com ícone de check (✓) e borda mais forte, diferenciando-o dos outros dias da barra
- A barra multi-dia continua normalmente, mas o dia do "Fim Real" recebe uma marcação especial (ex: ícone ✓ + fundo mais escuro/sólido na cor do status)
- Para tarefas de um dia só que têm `actual_end_date`, o badge ganha o mesmo destaque

### Detalhes técnicos
- Migração SQL: `ALTER TABLE tasks ADD COLUMN actual_end_date date;`
- O `getTaskInterval` continua usando `start_date`/`end_date` para a barra — o `actual_end_date` é apenas uma marcação adicional no calendário
- Na renderização das barras e badges, verificar se `isSameDay(day, parseISO(task.actual_end_date))` para aplicar estilo diferenciado


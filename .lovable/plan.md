

# Dashboard com Calendário Mensal

Criar uma nova página Dashboard como rota inicial, com um calendário mensal mostrando as tarefas por dia. Clicar numa tarefa abre o detalhe para comentar.

## Mudanças

### 1. Nova página `src/pages/Dashboard.tsx`

- Calendário mensal customizado (grid 7 colunas x 5-6 linhas)
- Busca tarefas do usuário via `supabase.from('tasks')` com assignees
- Busca statuses para passar ao `TaskDetailDialog`
- Cada dia mostra os títulos das tarefas cuja `estimated_delivery_date` cai naquele dia
- Tarefas aparecem como chips coloridos (cor do status) dentro da célula do dia
- Clicar numa tarefa abre o `TaskDetailDialog` existente (já tem comentários)
- Navegação mês anterior/próximo com botões no header do calendário
- Indicador visual para "hoje"

### 2. Atualizar rotas em `src/App.tsx`

- Nova rota `/dashboard` renderiza `Dashboard`
- Rota `/` continua com o Kanban (Index)

### 3. Atualizar sidebar em `src/components/AppSidebar.tsx`

- Adicionar item "Dashboard" com ícone `CalendarDays` no topo do menu
- URL: `/dashboard`
- "Minhas Tarefas" permanece apontando para `/`

### 4. Estrutura do calendário

```text
┌─────────────────────────────────────────┐
│  ← Março 2026 →                         │
├─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ Dom │ Seg │ Ter │ Qua │ Qui │ Sex │ Sáb │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│     │     │     │  1  │  2  │  3  │  4  │
│     │     │     │[T1] │     │     │     │
├─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│  5  │  6  │ ... │     │     │     │     │
│     │[T2] │     │     │     │     │     │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

- Cada `[Tx]` é um badge clicável com o título truncado e cor do status
- Máximo de 3 tarefas visíveis por dia, com "+N mais" se houver mais
- Clicar no badge abre `TaskDetailDialog` com todas as funcionalidades (edição, comentários, anexos)

### Detalhes técnicos

- Usar `date-fns` (já instalado) para manipulação de datas: `startOfMonth`, `endOfMonth`, `eachDayOfInterval`, `isSameDay`, `format`
- Reutilizar `TaskDetailDialog` e tipos `Task`/`TaskStatus` do `KanbanBoard`
- Filtro de tarefas por `estimated_delivery_date` no mês visível
- Nenhuma mudança de banco necessária


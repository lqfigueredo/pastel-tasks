## Objetivo

Permitir marcar uma tarefa como concluída para ocultá-la do Kanban, mantendo-a consultável quando necessário.

## Solução

### 1. Marcar como concluída
- Adicionar botão **"Concluir e arquivar"** no `TaskDetailDialog` (ao lado das ações existentes) e uma ação rápida de check no `KanbanCard` (ícone ✓ no hover).
- Ao clicar: faz `UPDATE tasks SET actual_end_date = CURRENT_DATE` (e mantém o status atual). Tarefas com `actual_end_date != null` são consideradas arquivadas.
- Botão complementar **"Reabrir"** quando `actual_end_date` já estiver preenchido (limpa o campo, voltando a aparecer no board).

### 2. Ocultar do board por padrão
- Em `KanbanBoard.tsx`, filtrar `tasks` removendo as que têm `actual_end_date` quando o toggle estiver desligado (padrão).
- Mesmo filtro aplicado ao `KanbanMobileView`.

### 3. Visualizar concluídas
- Adicionar **toggle "Mostrar concluídas"** (Switch + label) no header da página `Index.tsx` (ao lado dos filtros de assignee / "New Kanban").
- Estado persistido em `localStorage` (`kanban-show-completed`) para sobreviver à navegação.
- Quando ligado: tarefas concluídas reaparecem nas suas colunas originais com estilo apagado (`opacity-60`, badge "Concluída em DD/MM").

### 4. i18n
- Adicionar chaves em `src/i18n/locales/{pt-BR,en}/kanban.json`:
  - `card.completeAndArchive`, `card.reopen`, `card.completedOn`
  - `board.showCompleted`, `board.hideCompleted`

## Arquivos a alterar

- `src/components/kanban/KanbanBoard.tsx` — nova prop `showCompleted`, filtro.
- `src/components/kanban/KanbanCard.tsx` — botão check rápido, estilo apagado quando concluída.
- `src/components/kanban/TaskDetailDialog.tsx` — botões Concluir / Reabrir.
- `src/pages/Index.tsx` — toggle no header + persistência localStorage.
- `src/i18n/locales/pt-BR/kanban.json` e `src/i18n/locales/en/kanban.json` — novas chaves.

## Por que não usar uma coluna "Concluído"?

Você pediu uma ação explícita "Concluir e arquivar". Usar `actual_end_date` como flag de arquivamento mantém a coluna/status atual da tarefa intactos para o histórico, evita migração de dados e aproveita um campo que já existe e já é editável no detalhe.

## Sem alterações de schema

Nenhuma migration necessária — `actual_end_date` já existe em `tasks`.

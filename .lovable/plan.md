

## Filtro por responsável na tela de Tarefas

### O que será feito

Adicionar um filtro dropdown na página `/tarefas` que permite selecionar um responsável (assignee) para filtrar as tarefas exibidas no Kanban. O filtro mostrará "Todos" por padrão e listará os perfis disponíveis.

### Implementação

#### 1. Atualizar `src/pages/Index.tsx`
- Adicionar estado `filterAssigneeId` (string | null)
- Importar `useProfilesQuery` para obter a lista de perfis
- Renderizar um `Select` dropdown ao lado do botão "Nova Tarefa" com as opções: "Todos os responsáveis" + lista de perfis
- Passar `filterAssigneeId` como prop para o `KanbanBoard`

#### 2. Atualizar `src/components/kanban/KanbanBoard.tsx`
- Aceitar prop `filterAssigneeId?: string | null`
- Filtrar `localTasks` pelo assignee selecionado antes de passar para as colunas: se `filterAssigneeId` estiver definido, exibir apenas tarefas cujo array `assignees` contenha esse user_id
- Atualizar a interface `KanbanBoardRef` e o `forwardRef` para aceitar props

### Arquivos modificados
- `src/pages/Index.tsx` — adicionar Select de filtro e estado
- `src/components/kanban/KanbanBoard.tsx` — aceitar e aplicar prop de filtro


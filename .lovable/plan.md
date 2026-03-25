

# Edição, Remoção de Status e Status Padrão "Não Afiliado"

## Resumo

Permitir editar nome/cor de status existentes, remover status (migrando tarefas para um status padrão fallback), e criar um status especial "Não Afiliado" que recebe automaticamente tarefas órfãs.

## Mudanças

### 1. Migration — UPDATE policy + status padrão "Não Afiliado"

- Adicionar RLS policy para `UPDATE` em `task_statuses` (authenticated, `is_default = false` para nome/cor, ou sem restrição se quisermos editar todos).
- Inserir um novo status default chamado **"Não Afiliado"** com `is_default = true`, position 0, cor cinza neutra (`#CFD8DC`). Este será o fallback.

### 2. Remoção de status com migração de tarefas

Alterar `handleDelete` em `Settings.tsx`:
- Em vez de bloquear a exclusão quando há tarefas, **mover automaticamente** todas as tarefas do status removido para o status "Não Afiliado" (primeiro status com `is_default = true` e position mais baixo).
- Exibir confirmação informando quantas tarefas serão migradas antes de excluir.

### 3. Edição inline de status na Settings

Adicionar modo de edição em cada item da lista de status:
- Botão de editar (ícone lápis) ao lado do botão de excluir.
- Ao clicar, o nome vira um `Input` editável e a cor mostra o seletor de cores.
- Botões salvar/cancelar. Salvar faz `UPDATE` no `task_statuses`.
- Status default também podem ter nome/cor editados.

### 4. KanbanBoard — fallback para status inexistente

No `KanbanBoard`, após carregar tasks e statuses, verificar se alguma task tem `status_id` que não existe nos statuses carregados. Se sim, movê-la automaticamente para o status "Não Afiliado".

## Arquivos modificados

| Arquivo | Alteração |
|---|---|
| Migration SQL | Policy UPDATE + insert "Não Afiliado" |
| `src/pages/Settings.tsx` | Edição inline, remoção com migração de tarefas |
| `src/components/kanban/KanbanBoard.tsx` | Fallback para tarefas com status inexistente |


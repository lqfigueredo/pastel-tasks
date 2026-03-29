

# Melhorias na movimentação de tarefas no Kanban

## Situação atual
O drag-and-drop já está implementado via HTML5 nativo (`draggable`, `onDragStart`, `onDragOver`, `onDrop`). Funciona em desktop com mouse.

## Problema
- Em dispositivos touch (mobile/tablet), o drag-and-drop HTML5 nativo não funciona
- Não há indicação visual clara de que os cards são arrastáveis
- Não existe alternativa de botões para mover tarefas

## Proposta de melhorias

### 1. Adicionar botões de seta para mover tarefas entre colunas
- No `KanbanCard`, adicionar botões `←` e `→` (setas) que aparecem no hover ou sempre visíveis em mobile
- Ao clicar, move a tarefa para o status anterior/próximo (baseado na `position` do status)
- Solução simples que funciona em qualquer dispositivo

### 2. Melhorar feedback visual do drag-and-drop
- Adicionar `cursor-grab` no card e `cursor-grabbing` durante o arraste
- Destacar a coluna de destino com borda colorida durante o drag

### Arquivos editados
- `src/components/kanban/KanbanCard.tsx` — adicionar botões de seta e melhorar cursor
- `src/components/kanban/KanbanColumn.tsx` — melhorar feedback visual da coluna destino

## Resultado
Usuários poderão mover tarefas tanto arrastando (desktop) quanto clicando nos botões de seta (qualquer dispositivo).


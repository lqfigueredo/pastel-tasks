## Objetivo
Mostrar o ID da tarefa ao abrir o dialog de detalhes, facilitando referência e organização (ex.: citar tarefas em comentários, mensagens, e-mails).

## Decisão de UX
O `task.id` é um UUID completo (36 caracteres) — pouco amigável para leitura. Proposta:

- Exibir os **8 primeiros caracteres** do UUID como "ID curto" (ex.: `#a1b2c3d4`) ao lado do título no cabeçalho do dialog.
- Adicionar um **botão de copiar** (ícone `Copy` do lucide-react) que copia o **UUID completo** para a área de transferência, com toast de confirmação ("ID copiado!").
- Tooltip no badge mostrando o UUID completo ao passar o mouse.

Isso mantém a interface limpa e dá ao usuário tanto a referência rápida quanto o ID completo quando necessário.

## Alterações

### `src/components/kanban/TaskDetailDialog.tsx`
1. Importar `Copy` de `lucide-react`, `Badge` de `@/components/ui/badge` e `Tooltip` de `@/components/ui/tooltip`.
2. Substituir o `ResponsiveDialogHeader` atual (linhas 222-225) por um cabeçalho que inclui:
   - Título "Detalhes da Tarefa"
   - Badge com `#{task.id.slice(0, 8)}` + botão pequeno de copiar
   - Tooltip exibindo o UUID completo
3. Adicionar handler `handleCopyId` que usa `navigator.clipboard.writeText(task.id)` e dispara `toast({ title: 'ID copiado!' })`.

## Fora de escopo
- Não alterar `KanbanCard` (manteria o card limpo). Se desejar, podemos adicionar o ID curto também no card numa rodada futura.
- Não alterar o esquema do banco — usaremos o UUID já existente.
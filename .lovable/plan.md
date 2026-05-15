## Diagnóstico

Verifiquei a tarefa "REC Horário" no banco: `actual_end_date` continua `NULL`. O clique não foi persistido.

A causa é o comportamento do botão **"Concluir e arquivar"** dentro do `TaskDetailDialog`:

```tsx
onClick={() => setActualEndDate(new Date().toISOString().slice(0, 10))}
```

Ele apenas atualiza o estado local do campo de data — a gravação só ocorre quando o usuário também clica em **"Salvar"**. Se o diálogo é fechado (X / clicar fora / Cancelar) sem clicar em Salvar, nada é persistido e a tarefa continua aparecendo no board.

O botão de check no `KanbanCard` (canto superior direito) já persiste corretamente via `UPDATE tasks SET actual_end_date = ...`. Provavelmente passou despercebido porque é pequeno.

## Correção

Tornar o botão **"Concluir e arquivar" / "Reabrir"** do `TaskDetailDialog` uma ação direta, igual ao botão do card:

1. Em `TaskDetailDialog.tsx`, trocar o `onClick` que só altera estado local por uma função `handleToggleArchive` que:
   - Faz `UPDATE tasks SET actual_end_date = <hoje | null>` via Supabase.
   - Sincroniza `meeting_pendencies` (`is_completed`, `completed_at`) quando a tarefa veio de uma reunião — mesmo padrão já usado no `KanbanCard`.
   - Em sucesso: dispara `onRefresh()` e fecha o diálogo (`onOpenChange(false)`), exibindo um toast de confirmação ("Tarefa arquivada" / "Tarefa reaberta").
   - Em erro: usa `errorToast` e mantém o diálogo aberto.
2. Manter o input de data `actual_end_date` editável para casos onde o usuário queira registrar uma data diferente de hoje — esse fluxo continua usando o botão "Salvar".
3. Também destacar visualmente o botão de check no `KanbanCard`: aumentar levemente o ícone (`h-4 w-4`) e adicionar `bg-success/10` no hover do estado não-arquivado, para ficar mais perceptível.

## Por que não exigir um Salvar separado?

A ação "Concluir e arquivar" é uma decisão única e atômica — pedir um segundo clique em Salvar quebra a expectativa do usuário (foi exatamente o que aconteceu no teste com REC Horário). O botão do card já segue esse padrão; o do detalhe deve fazer o mesmo.

## Arquivos a alterar

- `src/components/kanban/TaskDetailDialog.tsx` — nova função `handleToggleArchive`, novos handlers nos dois botões, fechar/refresh ao concluir.
- `src/components/kanban/KanbanCard.tsx` — leve melhoria visual no botão de check.
- `src/i18n/locales/{pt-BR,en}/kanban.json` — chaves de toast: `detail.archivedToast`, `detail.reopenedToast`.

## Sem alterações de schema, hooks ou queries.



# Sincronizar Pendência da Ata com Tarefa no Kanban

## Problema
A sincronização entre pendências e tarefas funciona apenas em **uma direção**: quando o usuário conclui uma tarefa no Kanban (define `actual_end_date`), o sistema marca a pendência como encerrada. Porém, o **caminho inverso não existe** — quando o usuário marca uma pendência como encerrada na tela de Atas, a tarefa vinculada no Kanban continua aberta (sem `actual_end_date`).

## Causa raiz
O método `togglePendency` em `MeetingMinuteDetail.tsx` (linha 97) atualiza apenas a tabela `meeting_pendencies`, sem verificar se existe uma tarefa vinculada via `meeting_pendency_id` na tabela `tasks`.

## Solução
Após atualizar a pendência, buscar se existe uma tarefa com `meeting_pendency_id = pendency.id` e atualizar seu `actual_end_date`:
- Se pendência **encerrada** → definir `actual_end_date = hoje`
- Se pendência **reaberta** → limpar `actual_end_date = null`

## Alteração

### `src/pages/MeetingMinuteDetail.tsx` — método `togglePendency`
Após o update na `meeting_pendencies` (linha 105), adicionar:

```typescript
// Sync linked task in Kanban
const { data: linkedTask } = await supabase
  .from('tasks')
  .select('id, actual_end_date')
  .eq('meeting_pendency_id', pendency.id)
  .maybeSingle();

if (linkedTask) {
  await supabase.from('tasks').update({
    actual_end_date: newCompleted ? new Date().toISOString().split('T')[0] : null,
  }).eq('id', linkedTask.id);
}
```

Isso garante a sincronização bidirecional: Atas ↔ Kanban.

### Arquivos editados
- `src/pages/MeetingMinuteDetail.tsx` — ~8 linhas adicionadas no `togglePendency`


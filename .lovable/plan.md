

# Marcar pendência de reunião como concluída ao concluir tarefa

## Problema
Quando uma tarefa vinculada a uma pendência de reunião (`meeting_pendency_id`) recebe uma data de conclusão (`actual_end_date`), a pendência correspondente na tabela `meeting_pendencies` não é marcada como concluída automaticamente.

## Solução

### Alterar `src/components/kanban/TaskDetailDialog.tsx`
Após salvar a tarefa com sucesso (linha ~166), verificar se:
1. A tarefa tem `meeting_pendency_id`
2. O `actual_end_date` foi preenchido (e antes estava vazio)

Se ambas condições forem verdadeiras, atualizar a pendência correspondente:

```typescript
// Após o update da tarefa ser bem-sucedido (~linha 167)
if (task.meeting_pendency_id && actualEndDate && !task.actual_end_date) {
  await supabase.from('meeting_pendencies').update({
    is_completed: true,
    completed_at: new Date().toISOString(),
  }).eq('id', task.meeting_pendency_id);
}

// Caso contrário, se removeu a data de conclusão, desmarcar a pendência
if (task.meeting_pendency_id && !actualEndDate && task.actual_end_date) {
  await supabase.from('meeting_pendencies').update({
    is_completed: false,
    completed_at: null,
  }).eq('id', task.meeting_pendency_id);
}
```

### Resultado
- Ao definir `actual_end_date` numa tarefa com pendência vinculada, a pendência é marcada como concluída
- Ao remover a data de conclusão, a pendência volta a ficar pendente
- Nenhuma alteração em banco de dados necessária (RLS já permite update por participantes/criador)


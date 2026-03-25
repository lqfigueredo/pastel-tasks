

# Melhorar visibilidade das tarefas atribuídas ao usuário

O problema: no calendário, tarefas criadas pelo usuário e tarefas atribuídas a ele aparecem visualmente idênticas. Nao ha como distinguir rapidamente quais sao "minhas" vs "atribuidas por outros".

## Mudanca proposta

### `src/pages/Dashboard.tsx`

1. **Indicador visual nas barras multi-dia**: Tarefas onde o usuario e assignee (mas nao criador) recebem um icone de avatar/pessoa no inicio da barra, antes do titulo.

2. **Indicador visual nos badges single-day**: Mesma logica — tarefas atribuidas ganham um pequeno icone de pessoa (UserCircle) ao lado do dot de status.

3. **Borda diferenciada**: Barras de tarefas atribuidas recebem borda tracejada (dashed) em vez de solida, criando distincao visual imediata.

4. **Logica de deteccao**: Usar `myAssignedIds.has(task.id) && task.created_by !== user.id` para identificar tarefas atribuidas por outros.

### Detalhes de implementacao

- Importar `UserCircle` do lucide-react
- Nas barras multi-dia (`bars.map`): se a tarefa e atribuida, adicionar icone `UserCircle` (12px) antes do titulo e mudar `borderLeft` para `border-left-style: dashed`
- Nos badges single-day (`singleTasks.map`): adicionar icone `UserCircle` (10px) entre o dot de status e o titulo
- Nos badges de conclusao (`completedOnDay.map`): mesma logica

Arquivo unico: `src/pages/Dashboard.tsx`


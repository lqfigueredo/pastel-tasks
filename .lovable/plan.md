

# Calendário: mostrar tarefas pelo intervalo start_date → end_date

Atualmente o calendário exibe tarefas apenas no dia da `estimated_delivery_date`. A mudança fará com que uma tarefa apareça em **todos os dias** entre `start_date` e `end_date` (inclusive), além de continuar aparecendo na `estimated_delivery_date` caso não tenha start/end definidos.

## Mudança

### `src/pages/Dashboard.tsx` — função `getTasksForDay`

Alterar a lógica de filtragem:

- Se a tarefa tem `start_date` e `end_date`: mostrar em todos os dias do intervalo (usar `isWithinInterval` do date-fns)
- Se a tarefa tem apenas `start_date`: mostrar do start_date em diante (sem limite)
- Se a tarefa tem apenas `end_date`: mostrar até o end_date
- Fallback: se nenhum dos dois existe, usar `estimated_delivery_date` (comportamento atual)

Visualmente, tarefas que ocupam múltiplos dias aparecerão como badges repetidos em cada célula — mantendo o mesmo estilo atual com o dot colorido e título truncado.

### Importação adicional

Adicionar `isWithinInterval` do `date-fns` aos imports.


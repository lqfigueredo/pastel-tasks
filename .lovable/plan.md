

## Corrigir Dashboard que não carrega

### Diagnóstico

O Dashboard está crashando devido a um `RangeError: Invalid time value` em `src/components/dashboard/TaskTooltip.tsx` (linha 27, função `formatDate`).

A função atual:
```ts
function formatDate(dateStr: string | null) {
  if (!dateStr) return null;
  return format(parseISO(dateStr), "dd 'de' MMM", { locale: ptBR });
}
```

Ela protege apenas contra `null`/string vazia, mas alguma tarefa tem um campo de data (`start_date`, `end_date`, `estimated_delivery_date` ou `actual_end_date`) com valor inválido (string malformada que `parseISO` retorna como `Invalid Date`). Quando `format` recebe `Invalid Date`, lança o erro, que sobe pela árvore React e quebra a página inteira do Dashboard (não há error boundary).

### Correção

1. **`src/components/dashboard/TaskTooltip.tsx`** — tornar `formatDate` defensiva:
   - Após `parseISO`, validar com `isValid(parsed)` (de `date-fns`); se inválido, retornar `null`.
   - Envolver em `try/catch` como segurança extra.

### Investigação adicional (opcional)

Após a correção, podemos investigar quais tarefas estão com datas inválidas no banco para limpar os dados na origem. Mas a correção do componente já desbloqueia o Dashboard imediatamente.

### Arquivos modificados
- `src/components/dashboard/TaskTooltip.tsx`


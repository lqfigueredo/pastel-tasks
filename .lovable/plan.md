## Problema

Na lista de Atas de Reunião (`/atas`), o badge laranja de "pendências" e a borda laranja no card permanecem aparecendo mesmo quando todas as pendências da ata já foram marcadas como concluídas.

**Causa:** em `src/pages/MeetingMinutes.tsx` (linha 48), a query usa `meeting_pendencies(count)` sem filtro, ou seja, conta também as pendências com `is_completed = true`.

## Solução

Alterar a contagem para considerar **apenas pendências em aberto** (`is_completed = false`).

### Mudança em `src/pages/MeetingMinutes.tsx`

Trocar o select para usar um alias com filtro do PostgREST:

```ts
.select('*, meeting_participants(count), meeting_pendencies!inner(count)')
```

não funciona bem aqui porque `!inner` esconderia atas sem pendências. A abordagem correta é usar embed com filtro de coluna via alias:

```ts
.select(`
  *,
  meeting_participants(count),
  open_pendencies:meeting_pendencies(count)
`)
```

e filtrar o embed com `.eq` em escopo aninhado não é suportado diretamente; portanto a forma confiável é trazer só as pendências em aberto via filtro no embed usando a sintaxe:

```ts
.select(`
  *,
  meeting_participants(count),
  meeting_pendencies(count).eq(is_completed,false)
`)
```

Como essa sintaxe inline pode ser frágil, a solução robusta e consistente com o resto do código é fazer uma **segunda query agregada** apenas das pendências abertas e mesclar o resultado no client:

1. Manter o select atual mas remover o `meeting_pendencies(count)`.
2. Executar `supabase.from('meeting_pendencies').select('meeting_id').eq('is_completed', false)` para todas as atas.
3. No client, contar por `meeting_id` e atribuir `pendency_count` em cada ata.

Isso garante que o badge "pendências" e a borda laranja só aparecem enquanto existir pelo menos uma pendência **em aberto**. Quando todas forem marcadas como concluídas, o card volta ao estado normal e mostra "Sem pendências".

### Comportamento após a correção

- Ata com pendências abertas → borda laranja + badge "X pendência(s)".
- Ata com todas as pendências concluídas → sem borda laranja, exibe "Sem pendências".
- Filtro "Apenas com pendências" também passa a considerar somente pendências em aberto.

Nenhuma mudança de schema, RLS ou tradução é necessária.

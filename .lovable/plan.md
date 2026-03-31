

# Melhorias de visibilidade de pendências nas Atas de Reunião

## Mudanças no arquivo `src/pages/MeetingMinutes.tsx`

### 1. Destacar visualmente pendências nos cards
- Quando `pendency_count > 0`, aplicar uma borda lateral colorida (ex: `border-l-4 border-orange-500`) no card
- Usar Badge com cor de destaque (laranja/vermelho) no contador de pendências em vez de texto cinza discreto
- Manter o estilo neutro para atas sem pendências

### 2. Adicionar filtro "Com pendências"
- Novo estado `onlyWithPendencies` (boolean toggle)
- Botão toggle na barra de filtros: "Com pendências" — quando ativo, filtra `pendency_count > 0`
- Incluir no `hasFilters` e no `clearFilters`

### 3. Ordenar por data de criação (`created_at`)
- Alterar `.order('meeting_date', { ascending: false })` para `.order('created_at', { ascending: false })`
- Isso ordena pela data de criação da ata, não pela data da reunião

### Arquivos editados
- `src/pages/MeetingMinutes.tsx`


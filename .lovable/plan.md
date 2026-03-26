

# Filtros na Listagem de Atas de Reunião

## Mudanças em `src/pages/MeetingMinutes.tsx`

Adicionar uma barra de filtros entre o cabeçalho e a lista de cards:

1. **Campo de texto** — busca por descrição (título) da ata, filtragem client-side com `description.toLowerCase().includes(search)`
2. **Datepicker de período** — dois seletores (data início / data fim) usando `Popover` + `Calendar`, filtrando por `meeting_date`
3. **Botão limpar filtros** — reseta busca e datas

A filtragem será aplicada no array `meetings` já carregado em memória (client-side), sem queries adicionais ao banco.

| Arquivo | Mudança |
|---|---|
| `src/pages/MeetingMinutes.tsx` | Adicionar estados de filtro, barra de filtros e lógica de filtragem |




# Barra visual contínua para tarefas multi-dia

Substituir os badges repetidos por barras horizontais contínuas que se estendem visualmente entre os dias, similar ao Google Calendar.

## Abordagem

### Renderização em camadas no `src/pages/Dashboard.tsx`

A lógica muda de "listar tarefas por dia" para "posicionar barras por semana":

1. **Pré-processamento por semana**: Para cada linha (semana) do calendário, calcular quais tarefas multi-dia cruzam aquela semana e determinar:
   - `startCol`: coluna onde a barra começa (0-6), clampada ao início da semana
   - `endCol`: coluna onde a barra termina (0-6), clampada ao fim da semana
   - `row`: slot vertical (para empilhar barras sem sobreposição)

2. **Layout da célula**: Cada célula de dia terá altura fixa com área reservada para as barras (posicionamento absoluto relativo à linha da semana). As barras usam `position: absolute`, `left` e `width` calculados em % (cada coluna = 1/7).

3. **Estilo da barra**:
   - Fundo com a cor do status (com opacidade ~30%)
   - Texto do título truncado, fonte 11px
   - Bordas arredondadas apenas nas extremidades reais da tarefa (não nas quebras de semana)
   - Clicável para abrir `TaskDetailDialog`

4. **Tarefas de um dia só**: Continuam como badge inline (comportamento atual).

### Estrutura do grid por semana

```text
Semana renderizada como container relative:
┌───────┬───────┬───────┬───────┬───────┬───────┬───────┐
│  23   │  24   │  25   │  26   │  27   │  28   │  29   │
│ ████████████████████████████  ← barra task A (col 0-3)│
│       │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ ← task B│
│       │       │[T3]  │       │       │       │       │
└───────┴───────┴───────┴───────┴───────┴───────┴───────┘
```

### Algoritmo de slot allocation

- Para cada semana, iterar tarefas multi-dia ordenadas por duração (maior primeiro)
- Atribuir cada tarefa ao primeiro slot (row) livre que não tenha sobreposição de colunas
- Limitar a MAX_VISIBLE slots (3), excedentes mostram "+N mais"

### Mudanças no arquivo

**`src/pages/Dashboard.tsx`** — refatorar o grid para renderizar por semana em vez de por dia individual:
- Agrupar `days` em chunks de 7 (semanas)
- Para cada semana: calcular barras multi-dia + tarefas single-day
- Cada semana é um `div relative` com grid 7 colunas
- Barras multi-dia são `button` com `position: absolute` sobrepostas ao grid
- Tarefas single-day ficam abaixo das barras como badges normais
- Importar `differenceInDays`, `max`, `min` do date-fns


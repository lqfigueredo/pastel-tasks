

## Dashboard Gráfico no Temporizador

### O que será feito

Adicionar uma seção de dashboard gráfico na página do Temporizador (`/temporizador`) com três visualizações:

1. **Tempo Total** — Card com o tempo total acumulado de todas as sessões
2. **Tempo por Atividade** — Gráfico de barras horizontais agrupando sessões pela descrição (atividade), mostrando tempo total por cada uma
3. **Tempo por Dia** — Gráfico de barras verticais mostrando o tempo total registrado em cada dia (últimos 14 dias)

### Detalhes técnicos

- Buscar todas as sessões do usuário (remover o `limit(50)` atual ou aumentar para cobrir o período do dashboard)
- Usar os componentes `recharts` já disponíveis via `src/components/ui/chart.tsx`
- Criar um componente `src/components/timer/TimerDashboard.tsx` com:
  - Card de tempo total (soma de `duration_seconds`)
  - `BarChart` horizontal: agrupa por `description` (sessões sem descrição agrupadas como "Sem descrição"), soma `duration_seconds`, formata em hh:mm
  - `BarChart` vertical: agrupa por data (`created_at` → dia), soma `duration_seconds`, exibe últimos 14 dias
- Integrar o componente na página `src/pages/Timer.tsx` entre o timer e o histórico, usando Tabs para alternar entre "Temporizador" e "Dashboard"

### Arquivos
- `src/components/timer/TimerDashboard.tsx` (novo)
- `src/pages/Timer.tsx` (adicionar aba Dashboard)


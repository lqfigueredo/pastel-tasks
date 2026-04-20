

## Plano: Otimização de carregamento e processo

### Diagnóstico (o que está custando hoje)

1. **Recarregamento total a cada navegação.** `Index.tsx` (Tarefas) já usa React Query (cache 30s), mas `MeetingMinutes`, `MeetingMinuteDetail`, `Ideas`, `WorkInstructions`, `Team`, `TeamList`, `PersonalCalendar`, `Admin`, `Billing`, `Financial`, `Settings`, `NotificationBell` e `TimeReport` usam o padrão `useState + useEffect + supabase.from(...)`. Resultado: cada vez que o usuário sai e volta para `/atas`, refaz todos os SELECTs do zero (visível nos network logs — 2 chamadas idênticas a `support_tickets` em sequência ao abrir Admin).
2. **Componentes globais sem suspensão.** `SubscriptionStatusBanner`, `TrialBanner`, `NotificationBell`, `GlobalTimerIndicator`, `OnboardingWizard` são montados no `AppLayout` síncrono. Todos disparam fetches/realtime no mount, atrasando a primeira pintura útil.
3. **Landing carrega muita coisa ansiosamente.** `featurePreviews.tsx` (12KB de mocks JSX), `FeaturePreviewDialog`, `FloatingTasksBackground` e `TaskMarquee` entram no bundle inicial da `/` mesmo sem o usuário rolar. A landing é a primeira impressão — deveria ser leve.
4. **Sidebar com chips/permissões refazendo cálculo.** `useUserRoles` tem cache em módulo (bom), mas `Index.tsx` faz uma query extra `visible-user-ids` síncrona com o board — bloqueia a montagem do filtro de responsável.
5. **Re-render desnecessário.** `Dashboard.tsx` recria `statusColorMap`/`statusNameMap` a cada render (não está em `useMemo`), e `getSingleDayTasks` filtra `tasks` por dia × 42 dias do calendário a cada render.
6. **Build chunks.** `vite.config.ts` já agrupa vendors, mas várias páginas pesadas (`Financial` 632 linhas, `Admin` 469, `MeetingMinuteDetail`) não estão pré-divididas — boas candidatas a `lazy` granular ou divisão por aba.

### Mudanças propostas (priorizadas por ROI)

**P1 — Migrar fetches de página para React Query (maior ganho percebido)**

Trocar o padrão `useState + useEffect + setLoading` por `useQuery` nas páginas mais navegadas:

- `MeetingMinutes` → `useQuery(['meetings'])`
- `MeetingMinuteDetail` → `useQuery(['meeting', id])` com 3 queries paralelas
- `Ideas` → `useQuery(['ideas'])`
- `WorkInstructions` → `useQuery(['work-instructions'])`
- `Team` / `TeamList` → `useQuery(['team', id])` / `['teams']`
- `PersonalCalendar` → `useQuery(['calendar-events', monthKey])`
- `Admin` → `useQuery(['admin-data', user.id])`
- `Billing` → `useQuery(['billing', user.id])`
- `Financial` → `useQuery(['financial-data'])` + `['hot-tickets']` separados
- `NotificationBell` → `useQuery(['notifications', user.id])`

Benefício: navegação instantânea (cache `staleTime: 30_000` igual ao `queryClient`), invalidação centralizada após mutations, sem flicker de "Carregando…" ao voltar para a tela.

**P2 — Adiar componentes globais não-críticos**

Em `AppLayout.tsx`, envolver `SubscriptionStatusBanner`, `TrialBanner`, `NotificationBell`, `GlobalTimerIndicator` e `OnboardingWizard` em `lazy()` + `Suspense fallback={null}`. Eles não precisam estar no caminho crítico da primeira pintura — atualmente atrasam o `<Outlet />`.

**P3 — Tornar a Landing realmente leve**

- `lazy()` para `FeaturePreviewDialog`, `featurePreviews.tsx`, `FloatingTasksBackground`, `TaskMarquee`. Carregar sob demanda quando a seção entra no viewport (já há `IntersectionObserver` em `RevealOnScroll` — reaproveitar).
- `KanbanPreview` no hero pode ficar inline (é necessário no above-the-fold), mas o restante do `featurePreviews.tsx` só carrega quando o grid de features fica visível.
- Remover `aria-hidden` mocks pesados do bundle inicial.

**P4 — Memoizar derivações caras no Dashboard**

- `statusColorMap` e `statusNameMap` em `useMemo([statuses])`.
- Pré-indexar tarefas por dia (`Map<dateKey, Task[]>`) uma vez por mudança de `tasks`, em vez de filtrar por dia em loop.

**P5 — Eliminar fetches duplicados**

- Network logs mostram `GET /support_tickets` chamado 2× em sequência no Admin/Financial. Causa: `loadHotTickets` + `SupportTicketList` montam quase juntos. Unificar via React Query (`['support-tickets']`) — segundo consumidor reaproveita o cache.
- `Index.tsx` faz query `visible-user-ids` que duplica info já obtida em outras telas (team_members, user_approvals). Reaproveitar uma query compartilhada `useVisibleUserIdsQuery()`.

**P6 — Code-splitting fino para páginas pesadas**

- `Financial.tsx` (632 linhas) já é `lazy`, mas suas abas (`SubscriptionsTab`, `VouchersTab`, `PlansTab`, `HelpTextsManager`, `EmailDashboard`) podem virar `lazy` por aba — só carrega ao clicar.
- Mesmo tratamento em `Admin.tsx` (`EmailDashboard`, `SupportTicketList`).

### Métricas esperadas

- **Tempo para conteúdo ao navegar entre páginas já visitadas**: ~500-1500ms → ~50ms (cache).
- **Bundle inicial da Landing**: redução estimada de ~60-80KB (mocks lazy).
- **Requisições redundantes por sessão**: -30 a -50% em sessões de 5+ navegações.

### Plano de execução em fases

1. **Fase 1 (alto impacto, baixo risco)**: P2 + P3 + P4 + P5 — mudanças isoladas, sem mexer em lógica de negócio.
2. **Fase 2 (impacto alto, escopo médio)**: P1 — migrar 3 páginas por vez para `useQuery`, validar entre etapas.
3. **Fase 3 (refinamento)**: P6 — splits por aba.

### Fora de escopo
- Refatorar lógica de RLS ou edge functions.
- Mexer em `useTasksQuery`/`useTasksRealtime` (já otimizados).
- Mudar bibliotecas (manter Tanstack Query, date-fns, lucide).
- Aumentar instância do Lovable Cloud (não é gargalo de servidor — é de cliente/cache).

### Pergunta antes de executar
Prefere que eu execute **Fase 1 inteira em um único passo** (mais visível, mais arquivos), ou que comece só pelas páginas que você mais usa (sugiro: `MeetingMinutes`, `Ideas`, `PersonalCalendar`, `Admin`, `Billing`)?


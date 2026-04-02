

# Otimização de Velocidade da Aplicação

## Problemas Identificados

### 1. Consultas duplicadas ao banco de dados
- **Dashboard.tsx** busca `tasks`, `profiles`, `task_assignees` e `task_statuses` — exatamente as mesmas tabelas que o **KanbanBoard.tsx** já busca. Quando o usuário navega entre as páginas, as mesmas queries são refeitas sem cache.
- **TimeReport.tsx** (dentro do Dashboard) faz **mais 3 queries** (`task_time_entries`, `tasks`, `profiles`) — `tasks` e `profiles` já foram buscados pelo componente pai.
- **useUserRoles** faz 3 RPCs `has_role` separadas em vez de uma única query ao `user_roles`.

### 2. Falta de React Query para cache e deduplicação
- Todas as queries usam `supabase.from(...).select()` diretamente em `useEffect`, sem cache. Ao reabrir uma página, tudo é buscado novamente.
- Não há `staleTime` configurado no `QueryClient`.

### 3. TimeReport filtra datas com mutação
- Linha 85 de `TimeReport.tsx`: `new Date(startDate.setHours(...))` **muda o objeto Date original**, causando bugs sutis e re-renders desnecessários.

### 4. Dashboard renderiza todos os dias sem virtualização
- Aceitável para calendário mensal (max ~42 cells), mas `computeBarsForWeek` roda para cada semana a cada render e `getSingleDayTasks` filtra todas as tasks para cada dia.

### 5. NotificationBell sem polling/refetch
- Busca notificações apenas 1 vez (mount). Tudo bem graças ao realtime, mas a query inicial não tem cache.

---

## Plano de Otimização

### Etapa 1 — Migrar queries principais para React Query (maior impacto)
Criar hooks reutilizáveis com `useQuery` para as entidades mais acessadas:

- **`useTasksQuery()`** — busca `tasks`, `task_assignees`, `profiles`, retorna tasks com assignees já mapeados. `staleTime: 30s`.
- **`useStatusesQuery()`** — busca `task_statuses`. `staleTime: 60s`.
- **`useProfilesQuery()`** — busca `profiles`. `staleTime: 120s`.

Isso elimina queries duplicadas entre Dashboard, KanbanBoard e TimeReport. Componentes que modificam dados chamam `queryClient.invalidateQueries()`.

Configurar `QueryClient` com `defaultOptions.queries.staleTime = 30_000`.

### Etapa 2 — Otimizar `useUserRoles`
Substituir 3 chamadas RPC por uma única query:
```sql
SELECT role FROM user_roles WHERE user_id = $1
```
Reduz de 3 round-trips para 1.

### Etapa 3 — Corrigir bug de mutação de Date no TimeReport
Trocar `new Date(startDate.setHours(...))` por:
```ts
const start = new Date(startDate);
start.setHours(0, 0, 0, 0);
```

### Etapa 4 — Passar dados do Dashboard para TimeReport via props
Em vez do TimeReport fazer suas próprias queries, receber `tasks` e `profiles` do Dashboard (que já os tem via React Query), buscando apenas `task_time_entries`.

### Etapa 5 — Memoizar filtros do Dashboard
`getSingleDayTasks` e `computeBarsForWeek` já usam `useCallback`/`useMemo`, mas os `tasks` filtrados por `useMemo` dependem de `allTasks` que muda de referência a cada fetch. Com React Query, a referência será estável quando os dados não mudam.

---

## Arquivos criados/editados

- `src/hooks/useTasksQuery.ts` (novo) — hook com React Query para tasks + assignees
- `src/hooks/useStatusesQuery.ts` (novo) — hook com React Query para statuses
- `src/hooks/useProfilesQuery.ts` (novo) — hook com React Query para profiles
- `src/hooks/useUserRoles.ts` — 3 RPCs → 1 query
- `src/App.tsx` — configurar `staleTime` no QueryClient
- `src/pages/Dashboard.tsx` — usar os novos hooks
- `src/components/kanban/KanbanBoard.tsx` — usar os novos hooks
- `src/components/dashboard/TimeReport.tsx` — receber props, corrigir bug de Date
- `src/components/kanban/TaskTimer.tsx` — usar `useProfilesQuery` em vez de fetch próprio


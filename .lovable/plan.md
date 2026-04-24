## Otimizações de Performance — Itens 1, 2 e 4

Plano em três frentes complementares. Cada item é independente: se um falhar não bloqueia o outro.

---

### Item 4 — RPC `get_visible_user_ids` (eliminar cascata em `Index.tsx`)

**Migração SQL** (nova função `SECURITY DEFINER`):

```sql
CREATE OR REPLACE FUNCTION public.get_visible_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id
  UNION
  SELECT user_id FROM public.user_approvals WHERE created_by_admin = _user_id
  UNION
  SELECT tm2.user_id
  FROM public.team_members tm1
  JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
  WHERE tm1.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_user_ids(uuid) TO authenticated;
```

**Refator em `src/pages/Index.tsx`:**
- Substituir os 3 `Promise.all` (`team_members`, `user_approvals`, segundo `team_members`) por uma única chamada:
  ```ts
  const { data } = await supabase.rpc('get_visible_user_ids', { _user_id: user.id });
  return new Set<string>(data ?? []);
  ```
- Mantém a queryKey `['visible-user-ids', user?.id]` e o `staleTime`.

**Ganho:** 3 round-trips → 1; a lógica de união roda no Postgres.

---

### Item 1 — Migrar fetches manuais para React Query

#### 1a. `src/pages/Financial.tsx`
Criar hook `src/hooks/useFinancialDataQuery.ts` consolidando os três fetches do `loadData()`:
- `leads`, `user_approvals`, `admin_settings` (todos só executam se `isSolutionAdmin`).
- QueryKey: `['financial-overview']`, staleTime 30s.
- Substituir `useState` de `leads/approvals/adminLimits/loading` pelos valores da query.
- Mutações (aprovar/rejeitar/editar limite/etc.) chamarão `useInvalidateFinancial()` no sucesso, no lugar do `loadData()` atual.
- Manter `isSolutionAdmin` como hoje (já é uma chamada `rpc('has_role')` rápida).

#### 1b. `src/pages/Settings.tsx`
- Trocar `fetchStatuses` + `useState(statuses, archivedStatuses)` por `useStatusesQuery` (já existe) + uma nova `useArchivedStatusesQuery` (mesma tabela, filtro `is('deleted_at', null)` invertido).
- Após criar/editar/arquivar status, chamar `useInvalidateStatuses()`.
- Remove o `useEffect(fetchStatuses, [])` e o estado `loading` redundante.

#### 1c. `src/pages/Team.tsx`
Criar hook `src/hooks/useTeamDetailQuery.ts(teamId)` que retorna `{ team, members, tasks }` em uma única `queryFn` (mantendo as 5 queries internas que já existem hoje, mas com cache + dedup).
- QueryKey: `['team-detail', teamId]`, staleTime 30s.
- Refresh após convite/remoção/edição via `queryClient.invalidateQueries(['team-detail', teamId])`.

#### 1d. `src/components/NotificationBell.tsx`
- Migrar `fetchNotifications` para `useQuery` com key `['notifications', user?.id]`, staleTime 15s.
- Manter o canal Realtime, mas em vez de `setNotifications` chamar `queryClient.invalidateQueries(['notifications'])`.

---

### Item 2 — Substituir `select('*')` por colunas explícitas

Foco nos hotspots de maior impacto (tabelas com colunas grandes/JSONB ou queries muito frequentes). Demais ocorrências ficam para uma rodada futura.

| Arquivo | Tabela | Colunas necessárias |
|---|---|---|
| `src/hooks/useTasksQuery.ts` | `tasks` | `id, title, description, status_id, start_date, estimated_delivery_date, actual_end_date, is_critical, team_id, created_by, created_at, updated_at` |
| `src/hooks/useStatusesQuery.ts` | `task_statuses` | `id, name, color, position, is_default, team_id, created_by, created_at, deleted_at` |
| `src/hooks/useSupportTicketsQuery.ts` | `support_tickets` | `id, subject, status, created_by, created_at, closed_at` |
| `src/components/NotificationBell.tsx` | `notifications` | `id, type, title, message, reference_id, is_read, created_at` |
| `src/pages/Settings.tsx` (fetchStatuses) | `task_statuses` | mesmas do hook acima |
| `src/pages/Financial.tsx` (loadData) | `leads`/`user_approvals`/`admin_settings` | só campos usados pela UI |
| `src/components/financial/SubscriptionsTab.tsx` (linha 53) | `subscriptions` | `id, admin_user_id, status, seats_purchased, minimum_seats, price_per_seat_cents, current_period_end, trial_ends_at, plan_id` |
| `src/components/financial/SubscriptionDetailDrawer.tsx` (4 selects) | colunas exibidas pelo drawer |
| `src/components/billing/InvoiceHistory.tsx` | `invoices` | `id, period_start, period_end, amount_cents, currency, status, paid_at, payment_method, invoice_number, pdf_url` |

> Não vou tocar nos `select('*')` de tabelas raramente lidas (ex.: `LegalDocumentsEditor`, `HelpTextsManager`) nesta rodada — risco × ganho não compensa.

---

### Ordem de execução proposta

1. Migração SQL do item 4 (precisa de aprovação separada do banco).
2. Refator de `Index.tsx` consumindo a RPC.
3. Hooks novos (`useFinancialDataQuery`, `useArchivedStatusesQuery`, `useTeamDetailQuery`) + refator das páginas (item 1).
4. Aplicar trim de colunas (item 2) nos hooks já tocados — assim cada arquivo é editado uma vez só.
5. Smoke test manual das telas afetadas: `/tarefas`, `/financeiro`, `/configuracoes`, `/equipe/:id`, sino de notificações.

### Riscos e mitigação
- **Quebra de tipos:** ao trocar `select('*')` por colunas, o tipo retornado fica mais estreito; vou garantir que as interfaces locais (`Lead`, `UserApproval`, etc.) continuem cobertas.
- **Realtime + React Query:** invalidar a query é mais barato que refazer fetch manual, mas pode disparar refetches em cascata. Vou usar `invalidateQueries` apenas no canal já existente (sem novos canais).
- **RPC nova:** se a migração falhar, o refator de `Index.tsx` é revertido (mantém o `Promise.all` atual). Os itens 1 e 2 não dependem da RPC.

### Arquivos editados
- **Novos:** `src/hooks/useFinancialDataQuery.ts`, `src/hooks/useArchivedStatusesQuery.ts`, `src/hooks/useTeamDetailQuery.ts`, `src/hooks/useNotificationsQuery.ts`, migração SQL.
- **Modificados:** `src/pages/Index.tsx`, `src/pages/Financial.tsx`, `src/pages/Settings.tsx`, `src/pages/Team.tsx`, `src/components/NotificationBell.tsx`, `src/hooks/useTasksQuery.ts`, `src/hooks/useStatusesQuery.ts`, `src/hooks/useSupportTicketsQuery.ts`, `src/components/financial/SubscriptionsTab.tsx`, `src/components/financial/SubscriptionDetailDrawer.tsx`, `src/components/billing/InvoiceHistory.tsx`.

Posso aplicar?
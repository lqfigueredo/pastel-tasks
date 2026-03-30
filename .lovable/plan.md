

# Otimizações de Desempenho — Análise e Plano

## Problemas Identificados

### 1. Chamadas RPC duplicadas para verificar roles (ALTO IMPACTO)
O `AppSidebar` faz 3 chamadas RPC separadas (`has_role` para admin, solution_admin, user) **a cada render**. O `Index.tsx` faz as mesmas 3 chamadas novamente. Isso gera **6 RPCs redundantes** toda vez que o usuário navega.

**Solução**: Criar um hook `useUserRoles` com cache (React Query ou estado no AuthContext) que busca as roles uma única vez e compartilha entre todos os componentes.

### 2. Dashboard busca tarefas com `.eq('created_by', user.id)` e ignora RLS (MÉDIO)
O `Dashboard.tsx` (linha 82) ainda filtra por `created_by`, fazendo uma segunda query para tarefas atribuídas (linha 115). Isso gera 2 round-trips ao banco quando uma query sem filtro (confiando na RLS) bastaria — igual ao que já foi corrigido no `KanbanBoard`.

**Solução**: Remover `.eq('created_by', user.id)` e a query extra de assigned tasks, unificando em uma só query.

### 3. N+1 de queries no `TaskChangeHistory` (ALTO IMPACTO)
Cada `KanbanCard` renderiza um `TaskChangeHistory` que, ao expandir, faz 2 queries (logs + profiles). Mas o componente está **dentro de cada card**, então se houver 30 tarefas, são potencialmente 60 queries individuais. Além disso, os profiles já foram carregados no `KanbanBoard`.

**Solução**: Carregar o histórico sob demanda apenas no `TaskDetailDialog`, não no card. No card, mostrar apenas um botão/indicador sem fetch.

### 4. Todas as páginas são importadas eagerly no App.tsx (MÉDIO)
O `App.tsx` importa todas as 13 páginas no bundle inicial. Páginas como Admin, Financial, WorkInstructions, Settings só são usadas por uma fração dos usuários.

**Solução**: Usar `React.lazy()` + `Suspense` para code-splitting das rotas.

### 5. Fetch de todos os profiles e todos os assignees no KanbanBoard (BAIXO-MÉDIO)
O `KanbanBoard` busca **todos** os profiles do sistema (`profiles.select('*')`) e **todos** os task_assignees. Para uma empresa com muitos usuários, isso cresce linearmente.

**Solução**: Buscar apenas os profiles dos assignees das tarefas visíveis, usando `.in('user_id', relevantIds)`.

### 6. MeetingMinutes faz N+1 para contar participantes e pendências (MÉDIO)
Após buscar as reuniões, faz uma query separada de `meeting_participants` e outra de `meeting_pendencies` para cada reunião, processando no frontend.

**Solução**: Usar uma query com count via Supabase (`select('*, meeting_participants(count), meeting_pendencies(count)')`) para eliminar as queries extras.

## Plano de Implementação

### Etapa 1 — Hook centralizado de roles
- Criar `src/hooks/useUserRoles.ts`
- Buscar as 3 roles em uma única `Promise.all` ao login
- Cachear no contexto de auth ou em React Query
- Substituir as chamadas individuais em `AppSidebar`, `Index`, e qualquer outro componente

### Etapa 2 — Code-splitting com React.lazy
- Converter imports de páginas em `App.tsx` para `React.lazy()`
- Adicionar `<Suspense>` com fallback de loading
- Páginas candidatas: Admin, Financial, FinancialRegister, Settings, WorkInstructions, MeetingMinutes, MeetingMinuteDetail, PersonalCalendar

### Etapa 3 — Unificar query de tarefas no Dashboard
- Remover `.eq('created_by', user.id)` da query de tasks
- Remover a segunda query `.in('id', assignedTaskIds)`
- Confiar na RLS (já corrigida) para filtrar

### Etapa 4 — Otimizar TaskChangeHistory
- Remover `TaskChangeHistory` do `KanbanCard`
- Manter apenas no `TaskDetailDialog` (onde faz sentido ver detalhes)
- Reduz queries e peso de renderização dos cards

### Etapa 5 — Otimizar fetches de profiles e assignees
- No `KanbanBoard`, após buscar tasks, extrair os `created_by` + assignee user_ids
- Buscar profiles apenas desses IDs com `.in('user_id', ids)`
- Mesmo padrão no Dashboard

### Etapa 6 — Otimizar query de MeetingMinutes
- Usar relational query do Supabase para contar participantes e pendências em uma única chamada

## Arquivos editados
- `src/hooks/useUserRoles.ts` (novo)
- `src/contexts/AuthContext.tsx` (opcional, se roles forem integradas)
- `src/components/AppSidebar.tsx`
- `src/pages/Index.tsx`
- `src/App.tsx` (lazy imports)
- `src/pages/Dashboard.tsx` (query unificada)
- `src/components/kanban/KanbanCard.tsx` (remover TaskChangeHistory)
- `src/components/kanban/KanbanBoard.tsx` (profiles otimizados)
- `src/pages/MeetingMinutes.tsx` (query relacional)


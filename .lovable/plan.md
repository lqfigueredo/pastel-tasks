

## Fase 4 — Melhorias de alta prioridade

Três frentes em paralelo: **performance**, **observabilidade** e **UX**. Sem dependência entre elas, mas entregues numa única leva para reduzir overhead.

---

### 1. Code-splitting e lazy loading de rotas

**Estado atual**: `src/App.tsx` já usa `lazy()` em todas as rotas + `Suspense` com `PageLoader`. ✅ Surpresa boa — isso já está feito.

**O que falta de fato:**

- **Manual chunks**: `vite.config.ts` já separa `vendor-react`, `vendor-query`, `vendor-ui`, `vendor-supabase`, `vendor-icons`. Adicionar:
  - `vendor-charts` (recharts, usado só em Dashboard/TimeReport)
  - `vendor-dnd` (libs de drag-and-drop do Kanban)
  - `vendor-pdf` (qualquer lib de PDF usada em WorkInstructions)
  - `vendor-date` (date-fns separado)
- **Lazy de componentes pesados dentro de páginas** (não só rotas):
  - `MeetingRecorder` (MediaRecorder API + UI grande) — lazy dentro de `MeetingMinuteDetail`
  - `TimeReport` (recharts) — lazy dentro de `Dashboard`
  - `EmailDashboard` — lazy dentro de `Admin`
  - Diálogos pouco usados: `CompActivationDialog`, `DirectDiscountDialog`, `ManualPaymentDialog` em Financial
- **Prefetch on hover**: `NavLink` faz prefetch do chunk da rota ao passar o mouse (melhora percepção sem aumentar JS inicial).

### 2. Error tracking com Sentry

**Setup mínimo** (sem inflar bundle):

- Adicionar `@sentry/react` (~30KB gz, lazy-loaded só em produção).
- Inicializar em `src/main.tsx` apenas quando `import.meta.env.PROD` E variável `VITE_SENTRY_DSN` estiver definida.
- Configurar:
  - `tracesSampleRate: 0.1` (10% das transações)
  - `replaysSessionSampleRate: 0`, `replaysOnErrorSampleRate: 1.0` (replay só em erro)
  - Ignorar erros conhecidos (ResizeObserver, network aborts).
- **Contexto de usuário**: integrar em `AuthContext` — `Sentry.setUser({ id, email })` no login, `setUser(null)` no logout.
- **ErrorBoundary global**: criar `src/components/ErrorBoundary.tsx` envolvendo `<Routes>` no `App.tsx`. Mostra fallback amigável + botão "Recarregar" + reporta ao Sentry.
- **Source maps**: configurar upload no build (Sentry CLI) — opcional, requer auth token. Para começar, sem upload (stack trace minificado mas funcional).

**Secret necessário**: `VITE_SENTRY_DSN` (público por design — DSN do Sentry é seguro no client).

### 3. Busca global (Cmd/Ctrl+K)

Paleta de comandos unificada usando `cmdk` (já presente em `src/components/ui/command.tsx`).

**Componente**: `src/components/GlobalSearch.tsx`

- Atalho global `⌘K` / `Ctrl+K` registrado em `AppLayout.tsx`.
- Botão de busca discreto no header (mobile) e atalho visível no sidebar (desktop).
- Dialog `CommandDialog` com:
  - **Input** com debounce de 200ms
  - **Grupos**:
    - Tarefas (busca em `tasks.title` + `description`)
    - Ideias (busca em `ideas.title` + `description`)
    - Instruções (busca em `work_instructions.title`)
    - Reuniões (busca em `meetings.title`)
    - Knowledge (busca em `knowledge_sources.title`)
    - **Ações rápidas**: "Nova tarefa", "Nova reunião", "Ir para Dashboard", etc.
- **Hook**: `useGlobalSearch(query)` — React Query com `enabled: query.length >= 2`, executa 5 queries em paralelo limitadas a 5 resultados cada.
- **Navegação**: ao selecionar um item, navega para a rota correspondente e abre o detalhe (ex: `/tarefas?taskId=xxx` que `Index.tsx` já trata).
- **RLS**: usa o client autenticado normal — busca já vem filtrada pelo backend.

### 4. ErrorBoundary + correções colaterais

- `ErrorBoundary` (mencionado em #2) também serve de rede de segurança independente do Sentry.
- Fallback em PT-BR com botão "Recarregar página" e "Voltar ao início".
- Reset automático ao mudar de rota (via `useLocation`).

---

### Arquivos afetados

**Novos:**
- `src/components/ErrorBoundary.tsx`
- `src/components/GlobalSearch.tsx`
- `src/hooks/useGlobalSearch.ts`
- `src/lib/sentry.ts` (init helper)

**Modificados:**
- `vite.config.ts` — adicionar manual chunks (charts, dnd, pdf, date)
- `src/main.tsx` — init Sentry condicional
- `src/App.tsx` — envolver `<Routes>` em `<ErrorBoundary>`
- `src/contexts/AuthContext.tsx` — `Sentry.setUser` no login/logout
- `src/components/AppLayout.tsx` — registrar atalho `⌘K` + montar `<GlobalSearch />`
- `src/components/AppSidebar.tsx` — botão visual de busca com hint do atalho
- `src/components/NavLink.tsx` — prefetch on hover
- `src/pages/Dashboard.tsx` — lazy `TimeReport`
- `src/pages/Admin.tsx` — lazy `EmailDashboard`
- `src/pages/MeetingMinuteDetail.tsx` — lazy `MeetingRecorder`
- `src/pages/Financial.tsx` — lazy diálogos pouco usados
- `package.json` — adicionar `@sentry/react`

**Secret a configurar:**
- `VITE_SENTRY_DSN` (você cria projeto em sentry.io → copia DSN)

---

### Ordem de execução

1. **Code-splitting** (rápido, sem dependências externas) — entrega ganho de performance imediato.
2. **ErrorBoundary** (sem dependências) — rede de segurança antes do Sentry.
3. **Busca global** (médio porte, isolado) — alto impacto de UX.
4. **Sentry** (requer DSN do usuário) — pedido de secret no fim, para não bloquear o resto.

### Riscos e mitigação

- **Lazy de componentes pesados**: pode causar flash de loading. Mitigação: usar `Suspense` com `<Skeleton />` no contexto correto, não `PageLoader` fullscreen.
- **Busca global**: 5 queries paralelas a cada digitação pode pesar. Mitigação: debounce 200ms + `staleTime: 60s` + limit 5 por entidade.
- **Sentry sem DSN**: se o usuário não fornecer, o init é no-op silencioso — não quebra nada.
- **Manual chunks**: divisão errada pode aumentar requests. Vou validar com `vite build` mentalmente antes (libs realmente independentes).

### Fora deste plano (próxima leva)

- **PWA / install prompt** (já listado como média)
- **Preview inline de PDF/imagem** em anexos
- **Filtros salvos no Kanban**
- **Export CSV/PDF do TimeReport**




## Avaliação das Fases 1 e 2 + Plano Fase 3 (Fluidez)

### O que está bom ✅
- **`useTasksQuery`** com optimistic update e rollback funcionando.
- **Triggers Postgres** (`log_task_changes`, `log_task_assignee_changes`) substituíram inserts manuais → logs garantidos.
- **`useColumnOrderQuery`** centralizado, sem `useEffect` solto.
- **`safeFormatDate`/`safeParseISO`** criados em `src/lib/date.ts`.
- **`KanbanBoard`** sem estado duplicado, derivando tudo via `useMemo`.

### Pendências detectadas que afetam fluidez 🔴

**1. Imports de tipos ainda apontam para `KanbanBoard`** (não migrados na Fase 2)
`KanbanCard`, `KanbanColumn`, `TaskDetailDialog`, `TaskTooltip`, `Dashboard` ainda fazem `import { Task, TaskStatus } from './KanbanBoard'`. Funciona via re-export, mas mantém ciclo de dependências e quebra tree-shaking. Migrar para `@/types/kanban`.

**2. `KanbanCard` e `KanbanColumn` não são memoizados**
Cada drag/move re-renderiza TODOS os cards do board (centenas de componentes em escala). Gargalo claro de fluidez no Kanban.

**3. `toggleMinimize` no `KanbanCard` não é otimista**
Aguarda round-trip do Supabase antes de refletir visualmente. Deveria usar `useOptimisticTaskUpdate`.

**4. `TaskDetailDialog` faz fetch sequencial** (comments + pendency) sem React Query
Sem cache, sem deduplicação. Reabrir o diálogo sempre re-busca tudo.

**5. Sem realtime em `tasks`/`task_assignees`**
Usuário precisa F5 para ver mudanças de colegas. Pesa muito na percepção de "vivacidade" do app.

**6. `useTasksQuery` ainda faz 3 queries paralelas + retorna `assigneeRes`/`profileMap` que ninguém consome**
Pode simplificar payload retornado.

**7. Sem `error boundary`** — qualquer crash em uma página derruba o app inteiro.

---

### Plano de execução — Fase 3 (Fluidez)

**Etapa A — Memoização e otimismo no Kanban (impacto alto, risco baixo)**
1. Envolver `KanbanCard` e `KanbanColumn` em `React.memo` com comparação rasa.
2. Estabilizar handlers em `KanbanBoard` com `useCallback`.
3. Tornar `toggleMinimize` otimista usando `useOptimisticTaskUpdate`.

**Etapa B — Migrar imports de tipos**
4. Trocar `from './KanbanBoard'` → `from '@/types/kanban'` em: `KanbanCard`, `KanbanColumn`, `TaskDetailDialog`, `TaskTooltip`, `Dashboard`.
5. Limpar re-export desnecessário em `KanbanBoard.tsx`.

**Etapa C — Realtime nas tarefas (impacto alto)**
6. Migration: `ALTER PUBLICATION supabase_realtime ADD TABLE tasks, task_assignees;` + `REPLICA IDENTITY FULL`.
7. Hook `useTasksRealtime()` em `KanbanBoard` que escuta `postgres_changes` e chama `invalidateTasks()` (debounced 300ms para evitar tempestade).

**Etapa D — `TaskDetailDialog` com React Query**
8. Criar `useTaskCommentsQuery(taskId)` e `useMeetingPendencyQuery(pendencyId)`.
9. Substituir os `useEffect` de fetch por esses hooks.

**Etapa E — Resiliência**
10. Criar `<RouteErrorBoundary>` simples e envolver cada `<Route>` autenticada em `App.tsx`.

---

### Diagrama de fluxo após Fase 3

```text
User drag → optimistic setQueryData (instant UI)
        ↓
      Supabase UPDATE
        ↓
   Trigger logs change
        ↓
   Realtime broadcast → other users' invalidateTasks (debounced)
        ↓
   Memoized KanbanCard re-renders only the affected card
```

### O que NÃO vou fazer agora
- Code-splitting por feature (ganho marginal frente ao resto).
- Testes (vale uma fase dedicada).
- Migrar todos os `new Date()` espalhados — só os críticos quando aparecerem como bug.

### Recomendação
Executar **Etapas A, B, C** em uma sessão (núcleo da fluidez). D e E em sessão separada se preferir focar primeiro no impacto visual.


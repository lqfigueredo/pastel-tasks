

## Análise Crítica do Código — Oportunidades de Melhoria e Refatoração

Fiz uma varredura no código compartilhado e identifiquei pontos relevantes. Abaixo está a análise organizada por **prioridade** (impacto × esforço).

---

### 🔴 Alta prioridade — Problemas reais

**1. RLS de `tasks` causa N+1 e bloqueia visibilidade cruzada**

Hoje a tabela `tasks` tem 3 políticas SELECT separadas (own, assignee, team). Isso já é OK em termos de segurança, mas o `useTasksQuery` faz:

```ts
supabase.from('tasks').select('*')        // 1 query
supabase.from('task_assignees').select(...) // 2 query (TODAS as linhas globais)
supabase.from('profiles').select(...)       // 3 query (TODOS perfis)
```

Problemas:
- `task_assignees` e `profiles` puxam TUDO que o RLS permitir, sem filtro. Em escala, isso vira centenas de KB no payload.
- Não há paginação nem filtro por equipe/usuário no client.
- O `profiles` é refeito em vários hooks (`useProfilesQuery`, `useTasksQuery`).

**Refatoração proposta**: trocar por uma única query com join:
```ts
supabase.from('tasks').select(`
  *,
  task_assignees ( user_id, profiles ( user_id, display_name, avatar_url ) )
`)
```
Reduz 3 round-trips para 1, e o RLS aplica naturalmente nas joins.

---

**2. `KanbanBoard` faz fetch redundante de `user_column_order` em `useEffect`**

Toda vez que `statusesData` muda, o componente refaz a query de column order direto no Supabase, fora do React Query — perdendo cache e causando re-fetches. Deveria ser um `useColumnOrderQuery` próprio com cache.

---

**3. Estado duplicado: `localTasks` espelhando `tasksData.tasks`**

```ts
const [localTasks, setLocalTasks] = useState<Task[]>([]);
useEffect(() => { if (tasksData) setLocalTasks(tasksData.tasks); }, [tasksData]);
```

Isso é anti-pattern. Cria duas fontes de verdade e perde o benefício do cache. Para drag & drop otimista, o correto é `queryClient.setQueryData` com rollback no erro — não duplicar estado local.

---

**4. Logs de mudança escritos do client (`task_change_logs`)**

No `moveTask`, o client insere em `task_change_logs` após o update. Problemas:
- Se o usuário fechar a aba entre o UPDATE e o INSERT, o log se perde.
- Pode ser burlado (cliente malicioso pode pular o log).
- Duplica responsabilidade em todo lugar onde tarefas são editadas.

**Solução**: trigger no Postgres em `tasks AFTER UPDATE` que registra automaticamente as mudanças de campos relevantes. Garante consistência e simplifica todos os componentes.

---

### 🟡 Média prioridade — Qualidade de código

**5. Tipos duplicados**

`Task`, `TaskStatus`, `Profile` estão redefinidos em `KanbanBoard.tsx`, `useTasksQuery.ts`, `useStatusesQuery.ts` e `AssigneeSelector.tsx`. Centralizar em `src/types/kanban.ts`.

**6. `TaskTooltip` (e outros) usam `parseISO` sem `isValid`**

Já corrigimos um caso. Vale uma utility `safeFormatDate(dateStr, formatStr)` em `src/lib/date.ts` para reutilizar e nunca mais cair no `RangeError`.

**7. `App.tsx` tem 18 `lazy()` mas todas as rotas autenticadas estão dentro do mesmo `AppLayout`**

Como `AppLayout` carrega o sidebar com referências a quase tudo, o ganho do `lazy` é menor que o esperado. Vale agrupar bundles por feature (ex: tudo de "financeiro" num chunk só) via `vite-plugin-chunk-split` ou comentários `webpackChunkName`.

**8. `useProfilesQuery` e `useTasksQuery` ambos buscam `profiles`**

Consolidar: `useTasksQuery` consome `useProfilesQuery` em vez de re-fetch.

---

### 🟢 Baixa prioridade — Polimento

**9. Falta de `error boundaries`** por rota — um crash em qualquer página derruba o app.

**10. `staleTime` inconsistente** — 30s em `tasks`, 60s em `statuses`, 120s em `profiles`. Documentar o critério ou padronizar.

**11. Realtime não usado para tarefas** — usuários precisam recarregar para ver mudanças de outros. Já existe infra de realtime (mencionado nas memories) mas não aplicado a `tasks`/`task_assignees`.

**12. Sem testes** — só existe `example.test.ts`. As funções críticas (`moveTask`, RLS helpers, `safeFormatDate`) merecem testes.

---

### Plano de execução proposto (em fases)

**Fase 1 — Correções críticas (1 sessão)**
- Criar `src/lib/date.ts` com `safeFormatDate`/`safeParseISO` e migrar usos.
- Refatorar `useTasksQuery` para usar join único + consumir `useProfilesQuery`.
- Eliminar `localTasks` duplicado em `KanbanBoard` usando `queryClient.setQueryData` para updates otimistas.

**Fase 2 — Consolidação (1 sessão)**
- Centralizar tipos em `src/types/`.
- Criar `useColumnOrderQuery` e remover `useEffect` solto no `KanbanBoard`.
- Trigger Postgres para `task_change_logs` (migration) + remover inserts manuais do client.

**Fase 3 — Melhorias estruturais (opcional, separado)**
- Realtime em `tasks`.
- Error boundaries por rota.
- Code-splitting por feature.
- Testes para hooks/utilities críticos.

---

### O que NÃO vou mexer

- RLS policies já estão sólidas (vi várias com `SECURITY DEFINER` e helpers tipo `is_task_owner`). Não há sinal de privilégio escapando.
- Estrutura de `AuthContext` está correta (subscribe + getSession na ordem certa).
- `client.ts` e `types.ts` do Supabase — gerados automaticamente.

---

### Minha recomendação

Começar pela **Fase 1**. As 3 mudanças derrubam latência percebida no Kanban, eliminam o risco de `RangeError` em qualquer componente de data, e removem ~40 linhas de código duplicado. Risco baixo, ganho alto.

Posso seguir só com a Fase 1, ou prefere que eu detalhe uma fase específica antes de implementar?


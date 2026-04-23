

## Destaque visual para cards do usuário logado

Adicionar um indicador visual sutil nos cards do Kanban quando a tarefa estiver atribuída ao usuário que está logado, facilitando a identificação rápida das demandas próprias mesmo quando o filtro "Todos" está ativo.

### Estilo proposto

- **Borda lateral esquerda colorida** (4px) na cor `primary` (verde Mint da identidade), igual ao padrão já usado para tarefas críticas (que usa `border-l-destructive`).
- **Fundo levemente tingido** (`bg-primary/5`) para reforçar a distinção sem competir com o conteúdo.
- Quando o card for **crítico E do usuário logado**, a borda crítica (vermelha) tem prioridade — apenas o leve tingimento de fundo do "minha tarefa" permanece, mantendo o alerta visual da criticidade.

### Alterações técnicas

**Arquivo único:** `src/components/kanban/KanbanCard.tsx`

1. Importar `useAuth` de `@/contexts/AuthContext`.
2. Calcular `isMine = task.assignees?.some(a => a.user_id === user?.id)`.
3. No `className` do `<Card>`:
   - Adicionar `isMine && !task.is_critical && "border-l-4 border-l-primary"`.
   - Adicionar `isMine && "bg-primary/5"` (sobrescreve o `bg-card` base de forma sutil).

Nenhuma mudança em queries, RLS ou tipos. Sem impacto em performance — `useAuth` já está disponível no contexto e o cálculo é O(n) sobre os assignees (geralmente 1–3 itens).

### Resultado esperado

No board, o usuário identifica imediatamente seus próprios cards por uma faixa verde à esquerda + fundo levemente esverdeado, mesmo ao visualizar o board completo do time.




## Corrigir tela branca após login (conflito de canais Realtime)

### Causa raiz

`useTasksRealtime` (no Kanban) e `NotificationBell` criam canais Realtime com **o mesmo nome** (`user:${user.id}`). O Supabase Realtime reusa a instância do canal por nome — o segundo hook a montar tenta adicionar listeners num canal já `subscribe()`-ado, lança erro fatal e o `ErrorBoundary` mostra "Algo deu errado" (tela branca pro usuário).

Erro exato:
```
cannot add `postgres_changes` callbacks for realtime:user:<uuid> after `subscribe()`.
```

### Solução

Dar nomes únicos por feature aos canais, mantendo o padrão `user:<uuid>:<feature>` exigido pela policy `can_access_realtime_topic` (o prefixo `user:<uuid>` continua presente para autorização — verifico a policy antes de aplicar).

**Mudanças:**

1. `src/hooks/useTasksRealtime.ts` — canal vira `user:${user.id}:tasks`
2. `src/components/NotificationBell.tsx` — canal vira `user:${user.id}:notifications`

Se a policy `can_access_realtime_topic` exigir match exato `user:<uuid>` (sem sufixo), faço o ajuste alternativo:
- Unificar num único canal compartilhado via Context, OU
- Atualizar a policy para aceitar `user:<uuid>%` (LIKE prefix)

Vou inspecionar a policy antes para escolher o caminho seguro.

### Hardening adicional

- No `useTasksRealtime`, adicionar guarda contra StrictMode (double-mount em dev): se `channel.state === 'joined'`, não re-adicionar listeners.
- Pequeno ajuste no `ErrorBoundary` para que erros de Realtime não derrubem a tela inteira — apenas logar no Sentry e seguir (UX continua funcional, só sem live updates).

### Arquivos

**Modificados:**
- `src/hooks/useTasksRealtime.ts`
- `src/components/NotificationBell.tsx`
- `src/components/ErrorBoundary.tsx` (ajuste leve para tolerar erro de canal duplicado)

**Possível migration** (só se policy exigir):
- Atualizar `can_access_realtime_topic` para aceitar prefixo `user:<uuid>:*`

### Validação

Após a mudança, fazer login novamente e confirmar que:
1. `/tarefas` carrega sem cair no ErrorBoundary
2. Console não mostra mais o erro `cannot add postgres_changes`
3. Notificações e atualizações de tarefas em tempo real continuam funcionando


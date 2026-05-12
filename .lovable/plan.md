## Filtrar envio diário apenas para usuários ativos

### Problema
A função `send-daily-pending-email` hoje envia o resumo para qualquer responsável de tarefa ou pendência, sem checar se o usuário está ativo. Isso pode mandar email para:
- Usuários com status `pending` (ainda não aprovados)
- Usuários com status `rejected` (recusados pelo admin)
- Usuários com licença expirada (`license_expires_at < now()`)
- Usuários cujo admin está com assinatura `suspended` ou `canceled`

### Definição de "usuário ativo"
- `user_approvals.status = 'approved'`
- `user_approvals.license_expires_at IS NULL OR license_expires_at > now()`
- (opcional) admin do usuário com `subscriptions.status NOT IN ('suspended','canceled')`

Confirmar se incluímos a regra de admin suspenso ou apenas approved+licença válida.

### Mudança
Em `supabase/functions/send-daily-pending-email/index.ts`, após coletar `userIds`, filtrar contra `user_approvals` antes de buscar emails:

```ts
const { data: active } = await supabase
  .from('user_approvals')
  .select('user_id')
  .in('user_id', userIds)
  .eq('status', 'approved')
  .or('license_expires_at.is.null,license_expires_at.gt.' + new Date().toISOString())

const activeIds = new Set((active || []).map(a => a.user_id))
const filteredUserIds = userIds.filter(id => activeIds.has(id))
```

Loop subsequente passa a usar `filteredUserIds`. Logar quantos foram pulados por inatividade.

### Validação
1. Disparar manualmente a função após o deploy.
2. Conferir nos logs `Skipped (inactive): N` e `Emails sent: M`.
3. Conferir em `email_send_log` que nenhum recipient pulado recebeu.

Sem mudanças no banco. Apenas edição da Edge Function + redeploy.



User quer implementar só o item 2 da avaliação anterior: trial automático sem fricção. Vou olhar register-user e o fluxo de aprovação para planejar a mudança certa.

Pontos que já sei:
- `register-user/index.ts` cria user, **bane** com `ban_duration: '876000h'`, e insere `user_approvals` com status `pending`.
- `subscriptions.status` aceita `trialing`. Trigger `sync_admin_max_users` espelha em `admin_settings.max_users` (e como trialing não está na lista de suspensos, já libera assentos).
- `admin_can_add_user` já trata trialing como ativo (só bloqueia suspended/canceled).
- Nova conta hoje não recebe role `admin` — só role `user` via `handle_new_user`. Para um cadastro virar "cliente pagante" precisa role `admin` (senão não aparece como admin no resto do sistema, não tem sidebar de cobrança, etc).
- `Auth.tsx` ainda mostra toast "Aguarde aprovação do financeiro" depois do signup — precisa mudar para "Trial iniciado, faça login".

Decisões a tomar:
- Plano usado para o trial: usar `plans.is_default = true` se existir; senão fallback (price 0, 10 seats, 14 dias).
- Aprovação manual: hoje todo signup → `user_approvals.pending`. Para trial automático, o **admin pagante** deve nascer aprovado. Os usuários convidados pelo admin continuam no fluxo atual de aprovação (não mexer nisso).
- Plano cobre só o cadastro pela landing/`/auth` (que cria admin novo). Convite de equipe é outro tema.

Não preciso fazer perguntas — escopo claro.

---

## Plano — Trial automático de 14 dias ao se cadastrar

### O que muda

**Hoje:** `/auth` → cria user → bane → `user_approvals.pending` → espera `solution_admin` aprovar manualmente.

**Depois:** `/auth` → cria user → atribui role `admin` → cria `subscription` em `trialing` por 14 dias → libera acesso direto. Sem ban, sem `user_approvals.pending`.

### 1. Edge function `register-user`

Reescrever o fluxo:
1. Validar email/senha/nome (igual hoje).
2. `auth.admin.createUser` com `email_confirm: true`. **Remover** o `ban_duration`.
3. Atribuir role `admin` em `user_roles` (substitui o `user` default que o trigger cria).
4. Buscar `plans` ativo + `is_default = true` (fallback: primeiro `is_active`, depois hardcoded).
5. `INSERT` em `subscriptions`:
   - `admin_user_id = newUserId`
   - `status = 'trialing'`
   - `provider = 'pending'`
   - `seats_purchased = plan.minimum_seats`
   - `minimum_seats = plan.minimum_seats`
   - `price_per_seat_cents = plan.price_per_seat_cents`
   - `plan_id = plan.id`
   - `trial_ends_at = now() + 14 days`
   - `current_period_start = now()`, `current_period_end = trial_ends_at`
6. **Não** inserir em `user_approvals`. (O fluxo de aprovação continua valendo só para usuários criados via `admin-create-user`.)
7. Retornar mensagem: "Conta criada! Você tem 14 dias grátis para testar. Faça login para começar."

Trigger `sync_admin_max_users` já vai criar `admin_settings` automaticamente porque `trialing` não é suspended/canceled.

### 2. `Auth.tsx`

Trocar o toast pós-signup:
- De: "Aguarde aprovação do financeiro para acessar o sistema."
- Para: "Conta criada! Você tem 14 dias grátis. Faça login para começar."

Opcional: após signup bem-sucedido, alternar para o modo login automaticamente para o usuário só digitar a senha.

### 3. Banner de trial em `/cobranca` (Billing.tsx)

Atualizar `SubscriptionStatusBanner` para tratar `trialing`:
- Mostrar dias restantes ("Faltam X dias do seu período de teste")
- CTA "Ativar assinatura" (placeholder por enquanto — abre toast informando que checkout será habilitado em breve, igual hoje, ou simplesmente "Fale conosco para continuar").
- Quando faltarem ≤3 dias, banner em destaque (`destructive` ou `warning`).

### 4. Banner global para admins em trial (opcional, pequeno)

Adicionar uma faixa fina no topo de `AppLayout` quando o admin logado tem `subscription.status = 'trialing'`, mostrando "Trial: X dias restantes — Ativar agora" linkando para `/cobranca`. Some quando `status` muda para `active`.

### 5. Compatibilidade com o que já existe

- **Usuários criados pelo admin** (via `admin-create-user`): nada muda. Continuam passando por `user_approvals` com aprovação do `solution_admin`/admin do time. RLS e fluxo intactos.
- **Admins legados** (criados antes desta mudança): já têm subscription seedada como `active` pela migração inicial. Não afetados.
- **Página de aprovação de leads/usuários** em `/financeiro`: continua funcionando para os casos restantes.

### Arquivos afetados

- `supabase/functions/register-user/index.ts` — reescrever fluxo
- `src/pages/Auth.tsx` — texto pós-signup + auto-switch para login
- `src/components/billing/SubscriptionStatusBanner.tsx` — tratar `trialing` com dias restantes e CTA
- `src/components/AppLayout.tsx` — faixa global de trial (pequena adição)

Sem migrações de schema — `subscriptions` já tem todos os campos necessários (`trial_ends_at`, `status='trialing'`, `plan_id`).


---
name: Billing & Subscriptions
description: Per-seat monthly billing for admins with 10-seat minimum, subscription as source of truth syncing admin_settings.max_users
type: feature
---

## Modelo
- Cobrança mensal por assento, mínimo 10 (hard floor via CHECK constraint).
- Cliente pagante = admin. Solution_admin gerencia tudo.
- `subscriptions` é fonte de verdade; trigger `subscriptions_sync_max_users` espelha `seats_purchased` em `admin_settings.max_users` (0 quando suspended/canceled).

## Tabelas
- `subscriptions` (1 por admin, UNIQUE admin_user_id): provider, status (`trialing|active|past_due|canceled|suspended|pending`), seats_purchased, minimum_seats=10, price_per_seat_cents, currency=BRL, trial_ends_at, current_period_*, cancel_at_period_end, past_due_since.
- `billing_events`: log de webhooks com idempotência via UNIQUE (provider, event_id).

## Funções
- `sync_admin_max_users()` trigger AFTER INSERT/UPDATE em subscriptions.
- `get_admin_active_users_count(_admin_id)` — conta user_approvals approved.
- `admin_can_add_user(_admin_id)` — usado em `admin-create-user` para bloquear acima do limite. Considera status suspended/canceled.

## Enforcement
- `supabase/functions/admin-create-user/index.ts` chama RPC `admin_can_add_user` antes de criar.
- Mensagem específica para suspensão/cancelamento vs. limite atingido.

## Frontend
- Rota `/cobranca` (Billing.tsx) — exibe assinatura, slider de assentos, mensalidade estimada, ciclo, status.
- Link na sidebar para admins (CreditCard icon).
- Botões de upgrade/portal são placeholders (provider="Decidir depois") — exibem toast informativo.

## Seed
- Admins existentes ganharam subscription `provider='manual'`, `status='active'` com seats_purchased = max(admin_settings.max_users, 10).

## Pendente (próximas fases)
- Escolher e habilitar provider (Paddle/Stripe via tools de pagamento Lovable).
- Edge functions: `create-checkout`, `billing-portal`, `billing-webhook`.
- Trial 14 dias com cartão (decisão do usuário).
- Lógica de suspensão automática (cron) após 3 dias em past_due.
- Visão MRR/churn em `Financial.tsx` para solution_admin.

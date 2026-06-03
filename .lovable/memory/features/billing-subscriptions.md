---
name: Billing & Subscriptions
description: Free-for-everyone access. All subscriptions price = 0, 1-year period that auto-renews indefinitely; 10-seat minimum preserved.
type: feature
---

## Modelo atual (acesso gratuito)
- O NEVVOH é gratuito para todos: `plans.price_per_seat_cents = 0`, default da coluna em `plans` e `subscriptions` = 0.
- Cada admin recebe uma `subscriptions` com `status='active'`, `provider='free'`, `current_period_end = now() + 1 year`, sem trial.
- Mínimo de 10 assentos mantido (hard floor via CHECK).
- `subscriptions` continua sendo a fonte de verdade; trigger `subscriptions_sync_max_users` espelha seats em `admin_settings.max_users`.

## Auto-renovação
- Edge function `auto-renew-free-subscriptions` roda diariamente via pg_cron (`0 3 * * *`, job `auto-renew-free-subscriptions-daily`).
- Estende por mais 1 ano qualquer subscription com `price_per_seat_cents = 0` cujo `current_period_end < now() + 30 days`.
- Registra cada renovação em `subscription_changes` (`change_type='auto_renewed_free'`).
- Protegida via header `x-cron-secret` = `CRON_SECRET`.

## Tabelas
- `subscriptions` (1 por admin, UNIQUE admin_user_id): status (`trialing|active|past_due|canceled|suspended|pending|free` em uso atual: `active`).
- `billing_events`: log de webhooks com idempotência via UNIQUE (provider, event_id).

## Funções relevantes (mantidas)
- `sync_admin_max_users()` AFTER INSERT/UPDATE em subscriptions.
- `admin_can_add_user(_admin_id)` — bloqueia acima do limite. Free subs com status='active' permitem até `seats_purchased`.
- `calculate_invoice_amount` — retorna 0 naturalmente com price=0.
- Funções de pagamento manual / vouchers / comp_activation seguem disponíveis para uso futuro.

## Frontend
- Pricing page (`/precos`): mostra "Plano gratuito — R$ 0", badge "Gratuito por 1 ano" e CTA "Começar de graça". Sem slider de preço.
- Landing (`/`): hero CTA "Começar de graça", note "Gratuito por 1 ano · sem cartão de crédito".
- Billing (`/cobranca`): banner "Plano gratuito ativo — liberado até {date}" quando `price_per_seat_cents = 0`.
- Cadastro (`register-user`): cria subscription gratuita de 1 ano (constant `FREE_ACCESS_DAYS = 365`).

## Histórico
- Migração de "cobrança mensal por assento" para acesso gratuito feita em Jun/2026.
- Toda subscription existente em `trialing|pending|past_due` foi convertida para `active` com 1 ano grátis.
- Subscriptions já `active` pagantes foram preservadas.

## Reativando cobrança (se necessário no futuro)
1. Restaurar `price_per_seat_cents > 0` em `plans`.
2. Reverter `register-user` para criar `trialing` com `trial_ends_at`.
3. Desativar o cron `auto-renew-free-subscriptions-daily`.
4. Restaurar copy de Pricing/Landing/Billing.

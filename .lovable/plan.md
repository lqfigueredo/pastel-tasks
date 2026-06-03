# Free access — R$ 0 per seat, 1 year per cycle, auto-renew

Make the product free for all current trials and every new sign-up, with a 1-year subscription window that automatically rolls over to another free year when it ends. The 10-seat minimum stays in place. Existing **paid** (active, non-trial) subscriptions are left untouched per the scope you picked.

## What changes

### 1. Pricing on the plan + new subscriptions
- `plans.price_per_seat_cents = 0` for the primary plan (and any other active plan).
- `subscriptions.price_per_seat_cents = 0` default for newly created rows.
- `minimum_seats` stays at 10.
- Subscription creation (register flow + admin signup) sets `current_period_end = now() + 1 year`, `status = 'active'`, no trial.

### 2. Backfill existing subscriptions in scope
One data update for rows where `status IN ('trialing','pending','past_due')`:
- `price_per_seat_cents = 0`
- `status = 'active'`
- `current_period_start = now()`
- `current_period_end = now() + 1 year`
- `trial_ends_at = NULL`, `past_due_since = NULL`, `cancel_at_period_end = false`

Already-paying `active` subs are untouched (you can convert them manually later if desired).

### 3. Auto-renew every year
New scheduled edge function `auto-renew-free-subscriptions` triggered daily by pg_cron:
- For every subscription with `price_per_seat_cents = 0` and `current_period_end < now() + 30 days`, extend `current_period_end` by 1 year and set `status = 'active'`.
- Logs each extension via `subscription_changes` (`change_type = 'auto_renewed_free'`).

This gives you the "1-year window that renews indefinitely" behavior without ever charging anyone.

### 4. Invoice & billing safeguards
- `calculate_invoice_amount` already multiplies seats × `price_per_seat_cents`, so it naturally returns 0 — no change needed.
- `register-manual-payment` and Stripe/Paddle flows aren't invoked while the price is 0, so no payment gateway changes.
- Suspension cron (`check-expired-licenses`) keeps working; with auto-renew running first, no free sub will hit past_due.

### 5. Marketing copy (PT-BR + EN)
- **Pricing page** (`src/pages/Pricing.tsx` + `pricing.json`): replace the "R$ X por usuário" hero with a "Gratuito por 1 ano — renovação automática" badge, hide the seat slider's price calculation (show "R$ 0,00 / mês"), update meta `title`/`description` and JSON-LD `price` to `0`.
- **Landing** (`landing.json`): swap pricing CTA and hero subline to advertise free access.
- **Onboarding / sign-up screens**: remove "14 dias de teste" wording, replace with "Acesso gratuito por 1 ano".
- **Billing page** (`Billing.tsx`): show "Plano gratuito — válido até {date}" instead of monthly total.
- Add both PT-BR and EN keys.

## Technical details

**Migration** (schema-safe ALTERs only, defaults adjusted):
```sql
ALTER TABLE public.subscriptions
  ALTER COLUMN price_per_seat_cents SET DEFAULT 0;
ALTER TABLE public.plans
  ALTER COLUMN price_per_seat_cents SET DEFAULT 0;
```

**Data update** (via insert tool):
```sql
UPDATE public.plans SET price_per_seat_cents = 0;
UPDATE public.subscriptions
SET price_per_seat_cents = 0,
    status = 'active',
    current_period_start = now(),
    current_period_end = now() + interval '1 year',
    trial_ends_at = NULL,
    past_due_since = NULL,
    cancel_at_period_end = false,
    updated_at = now()
WHERE status IN ('trialing','pending','past_due');
```

**New edge function**: `supabase/functions/auto-renew-free-subscriptions/index.ts` + pg_cron schedule (`0 3 * * *`, uses `CRON_SECRET`).

**Files touched**:
- Migration + data update (above)
- `supabase/functions/auto-renew-free-subscriptions/` (new)
- `supabase/functions/register-user/index.ts`, `admin-create-user/index.ts` — set 1-year period at creation
- `src/pages/Pricing.tsx`, `src/pages/Landing.tsx`, `src/pages/Billing.tsx`
- `src/i18n/locales/{pt-BR,en}/{pricing,landing,billing,onboarding,auth}.json`

## Out of scope
- Active paid customers (left as-is).
- Removing the Stripe/Paddle BYOK integration code — kept dormant in case you want to monetize again later.
- Changing the 10-seat floor.

Approve to implement.

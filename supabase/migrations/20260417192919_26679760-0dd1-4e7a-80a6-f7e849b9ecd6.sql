
-- =========================================
-- SUBSCRIPTIONS TABLE
-- =========================================
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_user_id UUID NOT NULL UNIQUE,
  provider TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'paddle' | 'stripe' | 'manual'
  provider_customer_id TEXT,
  provider_subscription_id TEXT,
  status TEXT NOT NULL DEFAULT 'trialing', -- 'trialing' | 'active' | 'past_due' | 'canceled' | 'suspended' | 'pending'
  seats_purchased INTEGER NOT NULL DEFAULT 10,
  price_per_seat_cents INTEGER NOT NULL DEFAULT 0,
  minimum_seats INTEGER NOT NULL DEFAULT 10,
  currency TEXT NOT NULL DEFAULT 'BRL',
  trial_ends_at TIMESTAMPTZ,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN NOT NULL DEFAULT false,
  past_due_since TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_seats_min CHECK (seats_purchased >= minimum_seats),
  CONSTRAINT subscriptions_minimum_floor CHECK (minimum_seats >= 10)
);

CREATE INDEX idx_subscriptions_admin ON public.subscriptions(admin_user_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);
CREATE INDEX idx_subscriptions_provider_sub ON public.subscriptions(provider_subscription_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- Admin sees own subscription
CREATE POLICY "Admin can view own subscription"
ON public.subscriptions FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

-- Solution admins manage everything
CREATE POLICY "Solution admins manage subscriptions"
ON public.subscriptions FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

-- Service role full access (for webhooks)
CREATE POLICY "Service role full access subscriptions"
ON public.subscriptions FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================================
-- BILLING EVENTS TABLE (webhook log + idempotency)
-- =========================================
CREATE TABLE public.billing_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL, -- provider event id, used for idempotency
  event_type TEXT NOT NULL,
  subscription_id UUID REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  admin_user_id UUID,
  payload JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT billing_events_unique UNIQUE (provider, event_id)
);

CREATE INDEX idx_billing_events_admin ON public.billing_events(admin_user_id);
CREATE INDEX idx_billing_events_processed ON public.billing_events(processed);

ALTER TABLE public.billing_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own billing events"
ON public.billing_events FOR SELECT
TO authenticated
USING (admin_user_id = auth.uid());

CREATE POLICY "Solution admins view all billing events"
ON public.billing_events FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Service role manages billing events"
ON public.billing_events FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =========================================
-- updated_at trigger for subscriptions
-- =========================================
CREATE TRIGGER subscriptions_set_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================
-- Sync admin_settings.max_users with subscription seats
-- =========================================
CREATE OR REPLACE FUNCTION public.sync_admin_max_users()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  effective_seats INTEGER;
BEGIN
  -- Effective seats: 0 if subscription is suspended/canceled, otherwise contracted seats
  IF NEW.status IN ('suspended', 'canceled') THEN
    effective_seats := 0;
  ELSE
    effective_seats := GREATEST(NEW.seats_purchased, NEW.minimum_seats);
  END IF;

  -- Upsert into admin_settings
  INSERT INTO public.admin_settings (admin_user_id, max_users)
  VALUES (NEW.admin_user_id, effective_seats)
  ON CONFLICT (admin_user_id) DO UPDATE
  SET max_users = EXCLUDED.max_users,
      updated_at = now();

  RETURN NEW;
END;
$$;

-- admin_settings needs unique constraint on admin_user_id for ON CONFLICT
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'admin_settings_admin_user_id_key'
  ) THEN
    ALTER TABLE public.admin_settings
      ADD CONSTRAINT admin_settings_admin_user_id_key UNIQUE (admin_user_id);
  END IF;
END$$;

CREATE TRIGGER subscriptions_sync_max_users
AFTER INSERT OR UPDATE OF seats_purchased, status, minimum_seats
ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.sync_admin_max_users();

-- =========================================
-- Helper: count active users for an admin
-- "Active" = approved AND not (we treat ban via auth.users)
-- For now, we use approved approvals created by the admin.
-- =========================================
CREATE OR REPLACE FUNCTION public.get_admin_active_users_count(_admin_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.user_approvals
  WHERE created_by_admin = _admin_id
    AND status = 'approved';
$$;

-- =========================================
-- Helper: can the admin add another user?
-- =========================================
CREATE OR REPLACE FUNCTION public.admin_can_add_user(_admin_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  current_count INTEGER;
  total_count INTEGER;
BEGIN
  SELECT * INTO sub FROM public.subscriptions WHERE admin_user_id = _admin_id;

  -- If no subscription yet, fall back to admin_settings limit (legacy admins)
  IF NOT FOUND THEN
    SELECT COUNT(*) INTO total_count
    FROM public.user_approvals
    WHERE created_by_admin = _admin_id;
    RETURN total_count < COALESCE(
      (SELECT max_users FROM public.admin_settings WHERE admin_user_id = _admin_id),
      10
    );
  END IF;

  -- Block if subscription is suspended/canceled
  IF sub.status IN ('suspended', 'canceled') THEN
    RETURN false;
  END IF;

  SELECT COUNT(*) INTO total_count
  FROM public.user_approvals
  WHERE created_by_admin = _admin_id;

  RETURN total_count < GREATEST(sub.seats_purchased, sub.minimum_seats);
END;
$$;

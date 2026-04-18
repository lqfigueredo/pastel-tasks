
-- ============================================
-- 1. billing_profiles (dados fiscais)
-- ============================================
CREATE TABLE public.billing_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL UNIQUE,
  entity_type TEXT NOT NULL DEFAULT 'individual' CHECK (entity_type IN ('individual', 'company')),
  legal_name TEXT NOT NULL,
  tax_id TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  country TEXT NOT NULL DEFAULT 'BR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.billing_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own billing profile"
  ON public.billing_profiles FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Admin can manage own billing profile"
  ON public.billing_profiles FOR ALL TO authenticated
  USING (admin_user_id = auth.uid())
  WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Solution admins manage all billing profiles"
  ON public.billing_profiles FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE TRIGGER update_billing_profiles_updated_at
  BEFORE UPDATE ON public.billing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 2. invoices (faturas)
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  invoice_number TEXT,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'BRL',
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'failed', 'void', 'refunded')),
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT CHECK (payment_method IN ('card', 'boleto', 'pix', 'manual', 'other')),
  payment_reference TEXT,
  external_invoice_id TEXT,
  pdf_url TEXT,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoices_admin_user_id ON public.invoices(admin_user_id);
CREATE INDEX idx_invoices_subscription_id ON public.invoices(subscription_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own invoices"
  ON public.invoices FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Solution admins manage all invoices"
  ON public.invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Service role full access invoices"
  ON public.invoices FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 3. payment_methods (placeholder até provider)
-- ============================================
CREATE TABLE public.payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id UUID NOT NULL,
  provider TEXT NOT NULL DEFAULT 'manual',
  type TEXT NOT NULL CHECK (type IN ('card', 'boleto', 'pix', 'manual')),
  brand TEXT,
  last4 TEXT,
  expires_at DATE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  external_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_methods_admin_user_id ON public.payment_methods(admin_user_id);

ALTER TABLE public.payment_methods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own payment methods"
  ON public.payment_methods FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Solution admins manage all payment methods"
  ON public.payment_methods FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Service role full access payment methods"
  ON public.payment_methods FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE TRIGGER update_payment_methods_updated_at
  BEFORE UPDATE ON public.payment_methods
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- 4. subscription_changes (auditoria)
-- ============================================
CREATE TABLE public.subscription_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL,
  change_type TEXT NOT NULL CHECK (change_type IN ('seats_changed', 'status_changed', 'trial_extended', 'manual_payment', 'cycle_advanced', 'created', 'cancellation_scheduled', 'reactivated', 'note')),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  changed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_changes_subscription_id ON public.subscription_changes(subscription_id);
CREATE INDEX idx_subscription_changes_admin_user_id ON public.subscription_changes(admin_user_id);
CREATE INDEX idx_subscription_changes_created_at ON public.subscription_changes(created_at DESC);

ALTER TABLE public.subscription_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin can view own subscription changes"
  ON public.subscription_changes FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE POLICY "Solution admins manage all subscription changes"
  ON public.subscription_changes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Service role full access subscription changes"
  ON public.subscription_changes FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================
-- 5. subscription_notes (notas internas — só solution_admin)
-- ============================================
CREATE TABLE public.subscription_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_subscription_notes_subscription_id ON public.subscription_notes(subscription_id);

ALTER TABLE public.subscription_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Only solution admins manage subscription notes"
  ON public.subscription_notes FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

-- ============================================
-- 6. Trigger de auditoria em subscriptions
-- ============================================
CREATE OR REPLACE FUNCTION public.log_subscription_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  actor_id UUID := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, new_value, changed_by)
    VALUES (NEW.id, NEW.admin_user_id, 'created',
      jsonb_build_object('status', NEW.status, 'seats_purchased', NEW.seats_purchased, 'trial_ends_at', NEW.trial_ends_at),
      actor_id);
    RETURN NEW;
  END IF;

  IF NEW.seats_purchased IS DISTINCT FROM OLD.seats_purchased THEN
    INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.admin_user_id, 'seats_changed',
      jsonb_build_object('seats_purchased', OLD.seats_purchased),
      jsonb_build_object('seats_purchased', NEW.seats_purchased),
      actor_id);
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.admin_user_id, 'status_changed',
      jsonb_build_object('status', OLD.status),
      jsonb_build_object('status', NEW.status),
      actor_id);
  END IF;

  IF NEW.trial_ends_at IS DISTINCT FROM OLD.trial_ends_at THEN
    INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, old_value, new_value, changed_by)
    VALUES (NEW.id, NEW.admin_user_id, 'trial_extended',
      jsonb_build_object('trial_ends_at', OLD.trial_ends_at),
      jsonb_build_object('trial_ends_at', NEW.trial_ends_at),
      actor_id);
  END IF;

  IF NEW.cancel_at_period_end IS DISTINCT FROM OLD.cancel_at_period_end AND NEW.cancel_at_period_end = true THEN
    INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, new_value, changed_by)
    VALUES (NEW.id, NEW.admin_user_id, 'cancellation_scheduled',
      jsonb_build_object('current_period_end', NEW.current_period_end),
      actor_id);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_log_subscription_changes ON public.subscriptions;
CREATE TRIGGER trg_log_subscription_changes
  AFTER INSERT OR UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.log_subscription_changes();

-- ============================================
-- 7. RPC para registrar pagamento manual
-- ============================================
CREATE OR REPLACE FUNCTION public.register_manual_payment(
  _subscription_id UUID,
  _amount_cents INTEGER,
  _payment_method TEXT,
  _payment_reference TEXT DEFAULT NULL,
  _notes TEXT DEFAULT NULL,
  _advance_cycle BOOLEAN DEFAULT true
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  new_invoice_id UUID;
  new_period_start TIMESTAMPTZ;
  new_period_end TIMESTAMPTZ;
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can register manual payments';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Subscription not found';
  END IF;

  new_period_start := COALESCE(sub.current_period_end, now());
  new_period_end := new_period_start + INTERVAL '1 month';

  INSERT INTO public.invoices (
    subscription_id, admin_user_id, period_start, period_end,
    amount_cents, currency, status, paid_at, payment_method,
    payment_reference, notes, created_by
  ) VALUES (
    _subscription_id, sub.admin_user_id,
    COALESCE(sub.current_period_start, now()),
    COALESCE(sub.current_period_end, now() + INTERVAL '1 month'),
    _amount_cents, sub.currency, 'paid', now(), _payment_method,
    _payment_reference, _notes, auth.uid()
  ) RETURNING id INTO new_invoice_id;

  IF _advance_cycle THEN
    UPDATE public.subscriptions
    SET current_period_start = new_period_start,
        current_period_end = new_period_end,
        status = CASE WHEN status IN ('past_due', 'suspended', 'trialing', 'pending') THEN 'active' ELSE status END,
        past_due_since = NULL,
        updated_at = now()
    WHERE id = _subscription_id;
  END IF;

  INSERT INTO public.subscription_changes (
    subscription_id, admin_user_id, change_type, new_value, reason, changed_by
  ) VALUES (
    _subscription_id, sub.admin_user_id, 'manual_payment',
    jsonb_build_object('invoice_id', new_invoice_id, 'amount_cents', _amount_cents, 'method', _payment_method),
    _notes, auth.uid()
  );

  RETURN new_invoice_id;
END;
$$;

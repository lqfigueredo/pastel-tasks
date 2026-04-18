-- =============================================================
-- PLANOS (catálogo)
-- =============================================================
CREATE TABLE public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  price_per_seat_cents INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'BRL',
  minimum_seats INTEGER NOT NULL DEFAULT 10,
  billing_interval TEXT NOT NULL DEFAULT 'month',
  features JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT plans_billing_interval_check CHECK (billing_interval IN ('month','year')),
  CONSTRAINT plans_minimum_seats_positive CHECK (minimum_seats >= 1),
  CONSTRAINT plans_price_non_negative CHECK (price_per_seat_cents >= 0)
);

CREATE UNIQUE INDEX plans_only_one_default ON public.plans (is_default) WHERE is_default = true;

ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solution admins manage plans"
  ON public.plans FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Authenticated can view active plans"
  ON public.plans FOR SELECT TO authenticated
  USING (is_active = true OR has_role(auth.uid(), 'solution_admin'::app_role));

CREATE TRIGGER trg_plans_updated_at
  BEFORE UPDATE ON public.plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Plano padrão de retrocompatibilidade
INSERT INTO public.plans (code, name, description, price_per_seat_cents, minimum_seats, is_default, is_active)
VALUES ('default', 'Plano Padrão', 'Plano base por assento', 0, 10, true, true);

-- =============================================================
-- VOUCHERS DE DESCONTO
-- =============================================================
CREATE TABLE public.discount_vouchers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT NOT NULL UNIQUE,
  description TEXT,
  discount_type TEXT NOT NULL,
  discount_value INTEGER NOT NULL,
  duration TEXT NOT NULL DEFAULT 'once',
  duration_in_months INTEGER,
  max_redemptions INTEGER,
  times_redeemed INTEGER NOT NULL DEFAULT 0,
  valid_from TIMESTAMPTZ,
  valid_until TIMESTAMPTZ,
  applies_to_plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT vouchers_discount_type_check CHECK (discount_type IN ('percent','fixed_amount')),
  CONSTRAINT vouchers_duration_check CHECK (duration IN ('once','repeating','forever')),
  CONSTRAINT vouchers_value_positive CHECK (discount_value > 0),
  CONSTRAINT vouchers_percent_max CHECK (discount_type <> 'percent' OR discount_value <= 100),
  CONSTRAINT vouchers_repeating_needs_months CHECK (duration <> 'repeating' OR duration_in_months IS NOT NULL)
);

-- code único case-insensitive
CREATE UNIQUE INDEX discount_vouchers_code_lower ON public.discount_vouchers (LOWER(code));

ALTER TABLE public.discount_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solution admins manage vouchers"
  ON public.discount_vouchers FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON public.discount_vouchers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- VINCULO VOUCHER × ASSINATURA
-- =============================================================
CREATE TABLE public.subscription_discounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES public.subscriptions(id) ON DELETE CASCADE,
  voucher_id UUID NOT NULL REFERENCES public.discount_vouchers(id) ON DELETE RESTRICT,
  applied_by UUID,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ,
  invoices_remaining INTEGER,
  is_active BOOLEAN NOT NULL DEFAULT true,
  removed_at TIMESTAMPTZ,
  removed_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX subscription_discounts_active_unique
  ON public.subscription_discounts (subscription_id, voucher_id)
  WHERE is_active = true;

CREATE INDEX subscription_discounts_sub_idx ON public.subscription_discounts (subscription_id);

ALTER TABLE public.subscription_discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solution admins manage subscription discounts"
  ON public.subscription_discounts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'solution_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Admin can view own subscription discounts"
  ON public.subscription_discounts FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.id = subscription_discounts.subscription_id AND s.admin_user_id = auth.uid()
  ));

-- =============================================================
-- COLUNAS NOVAS EM subscriptions e invoices
-- =============================================================
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES public.plans(id) ON DELETE SET NULL;

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS subtotal_cents INTEGER,
  ADD COLUMN IF NOT EXISTS discount_cents INTEGER NOT NULL DEFAULT 0;

-- =============================================================
-- FUNCOES
-- =============================================================

-- Aplicar voucher
CREATE OR REPLACE FUNCTION public.apply_voucher(_subscription_id UUID, _code TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v RECORD;
  sub RECORD;
  exp TIMESTAMPTZ;
  remaining INTEGER;
  new_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can apply vouchers';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  SELECT * INTO v FROM public.discount_vouchers WHERE LOWER(code) = LOWER(_code);
  IF NOT FOUND THEN RAISE EXCEPTION 'Voucher not found'; END IF;
  IF NOT v.is_active THEN RAISE EXCEPTION 'Voucher is inactive'; END IF;
  IF v.valid_from IS NOT NULL AND now() < v.valid_from THEN RAISE EXCEPTION 'Voucher not yet valid'; END IF;
  IF v.valid_until IS NOT NULL AND now() > v.valid_until THEN RAISE EXCEPTION 'Voucher expired'; END IF;
  IF v.max_redemptions IS NOT NULL AND v.times_redeemed >= v.max_redemptions THEN
    RAISE EXCEPTION 'Voucher max redemptions reached';
  END IF;
  IF v.applies_to_plan_id IS NOT NULL AND sub.plan_id IS DISTINCT FROM v.applies_to_plan_id THEN
    RAISE EXCEPTION 'Voucher does not apply to this plan';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.subscription_discounts
    WHERE subscription_id = _subscription_id AND voucher_id = v.id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'Voucher already applied to this subscription';
  END IF;

  IF v.duration = 'once' THEN
    remaining := 1;
    exp := NULL;
  ELSIF v.duration = 'repeating' THEN
    remaining := v.duration_in_months;
    exp := now() + (v.duration_in_months || ' months')::INTERVAL;
  ELSE
    remaining := NULL;
    exp := NULL;
  END IF;

  INSERT INTO public.subscription_discounts (subscription_id, voucher_id, applied_by, expires_at, invoices_remaining)
  VALUES (_subscription_id, v.id, auth.uid(), exp, remaining)
  RETURNING id INTO new_id;

  UPDATE public.discount_vouchers SET times_redeemed = times_redeemed + 1, updated_at = now() WHERE id = v.id;

  INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, new_value, changed_by)
  VALUES (_subscription_id, sub.admin_user_id, 'voucher_applied',
    jsonb_build_object('voucher_code', v.code, 'voucher_id', v.id, 'discount_type', v.discount_type, 'discount_value', v.discount_value),
    auth.uid());

  RETURN new_id;
END;
$$;

-- Remover voucher
CREATE OR REPLACE FUNCTION public.remove_voucher(_subscription_discount_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sd RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can remove vouchers';
  END IF;

  SELECT sd.*, s.admin_user_id, dv.code AS voucher_code
  INTO sd
  FROM public.subscription_discounts sd
  JOIN public.subscriptions s ON s.id = sd.subscription_id
  JOIN public.discount_vouchers dv ON dv.id = sd.voucher_id
  WHERE sd.id = _subscription_discount_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription discount not found'; END IF;

  UPDATE public.subscription_discounts
  SET is_active = false, removed_at = now(), removed_by = auth.uid()
  WHERE id = _subscription_discount_id;

  INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, new_value, changed_by)
  VALUES (sd.subscription_id, sd.admin_user_id, 'voucher_removed',
    jsonb_build_object('voucher_code', sd.voucher_code), auth.uid());

  RETURN true;
END;
$$;

-- Calcular valor da próxima fatura
CREATE OR REPLACE FUNCTION public.calculate_invoice_amount(_subscription_id UUID)
RETURNS TABLE(subtotal_cents INTEGER, discount_cents INTEGER, total_cents INTEGER)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  sub_subtotal INTEGER;
  sub_discount INTEGER := 0;
  d RECORD;
  this_discount INTEGER;
BEGIN
  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  sub_subtotal := GREATEST(sub.seats_purchased, sub.minimum_seats) * sub.price_per_seat_cents;

  FOR d IN
    SELECT sd.*, dv.discount_type, dv.discount_value, dv.code
    FROM public.subscription_discounts sd
    JOIN public.discount_vouchers dv ON dv.id = sd.voucher_id
    WHERE sd.subscription_id = _subscription_id
      AND sd.is_active = true
      AND (sd.expires_at IS NULL OR sd.expires_at > now())
      AND (sd.invoices_remaining IS NULL OR sd.invoices_remaining > 0)
  LOOP
    IF d.discount_type = 'percent' THEN
      this_discount := (sub_subtotal * d.discount_value) / 100;
    ELSE
      this_discount := d.discount_value;
    END IF;
    sub_discount := sub_discount + this_discount;
  END LOOP;

  IF sub_discount > sub_subtotal THEN sub_discount := sub_subtotal; END IF;

  RETURN QUERY SELECT sub_subtotal, sub_discount, (sub_subtotal - sub_discount);
END;
$$;

-- Atualiza register_manual_payment para gravar subtotal/desconto e consumir cupons
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
  calc RECORD;
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can register manual payments';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  SELECT * INTO calc FROM public.calculate_invoice_amount(_subscription_id);

  new_period_start := COALESCE(sub.current_period_end, now());
  new_period_end := new_period_start + INTERVAL '1 month';

  INSERT INTO public.invoices (
    subscription_id, admin_user_id, period_start, period_end,
    subtotal_cents, discount_cents, amount_cents, currency, status, paid_at,
    payment_method, payment_reference, notes, created_by
  ) VALUES (
    _subscription_id, sub.admin_user_id,
    COALESCE(sub.current_period_start, now()),
    COALESCE(sub.current_period_end, now() + INTERVAL '1 month'),
    calc.subtotal_cents, calc.discount_cents, _amount_cents,
    sub.currency, 'paid', now(), _payment_method, _payment_reference, _notes, auth.uid()
  ) RETURNING id INTO new_invoice_id;

  -- Consome cupons "repeating" (decrementa invoices_remaining)
  UPDATE public.subscription_discounts
  SET invoices_remaining = invoices_remaining - 1,
      is_active = CASE WHEN invoices_remaining - 1 <= 0 THEN false ELSE is_active END
  WHERE subscription_id = _subscription_id
    AND is_active = true
    AND invoices_remaining IS NOT NULL;

  IF _advance_cycle THEN
    UPDATE public.subscriptions
    SET current_period_start = new_period_start,
        current_period_end = new_period_end,
        status = CASE WHEN status IN ('past_due','suspended','trialing','pending') THEN 'active' ELSE status END,
        past_due_since = NULL,
        updated_at = now()
    WHERE id = _subscription_id;
  END IF;

  INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, new_value, reason, changed_by)
  VALUES (_subscription_id, sub.admin_user_id, 'manual_payment',
    jsonb_build_object('invoice_id', new_invoice_id, 'amount_cents', _amount_cents, 'method', _payment_method),
    _notes, auth.uid());

  RETURN new_invoice_id;
END;
$$;
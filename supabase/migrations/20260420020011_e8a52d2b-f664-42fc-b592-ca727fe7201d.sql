-- 1. Add is_adhoc column to discount_vouchers
ALTER TABLE public.discount_vouchers
ADD COLUMN IF NOT EXISTS is_adhoc boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_discount_vouchers_is_adhoc
ON public.discount_vouchers (is_adhoc);

-- 2. RPC: apply_direct_discount
CREATE OR REPLACE FUNCTION public.apply_direct_discount(
  _subscription_id uuid,
  _discount_type text,
  _discount_value integer,
  _duration text,
  _duration_in_months integer,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sub RECORD;
  new_voucher_id UUID;
  new_code TEXT;
  exp TIMESTAMPTZ;
  remaining INTEGER;
  new_discount_id UUID;
BEGIN
  -- Authorization
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can apply direct discounts';
  END IF;

  -- Reason validation
  IF _reason IS NULL OR LENGTH(TRIM(_reason)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  -- Discount type validation
  IF _discount_type NOT IN ('percent', 'fixed_amount') THEN
    RAISE EXCEPTION 'discount_type deve ser percent ou fixed_amount';
  END IF;

  -- Value validation
  IF _discount_type = 'percent' THEN
    IF _discount_value < 1 OR _discount_value > 100 THEN
      RAISE EXCEPTION 'Percentual deve estar entre 1 e 100';
    END IF;
  ELSE
    IF _discount_value <= 0 THEN
      RAISE EXCEPTION 'Valor fixo deve ser maior que zero (em centavos)';
    END IF;
  END IF;

  -- Duration validation
  IF _duration NOT IN ('once', 'repeating', 'forever') THEN
    RAISE EXCEPTION 'duration deve ser once, repeating ou forever';
  END IF;

  IF _duration = 'repeating' AND (_duration_in_months IS NULL OR _duration_in_months < 1) THEN
    RAISE EXCEPTION 'duration_in_months obrigatório (>=1) quando duration=repeating';
  END IF;

  -- Subscription
  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  -- Build unique code: ADHOC-<sub_short>-<epoch_ms>
  new_code := 'ADHOC-' || UPPER(SUBSTRING(_subscription_id::text, 1, 8))
              || '-' || EXTRACT(EPOCH FROM clock_timestamp())::BIGINT;

  -- Create the ad-hoc voucher
  INSERT INTO public.discount_vouchers (
    code, description, discount_type, discount_value,
    duration, duration_in_months,
    max_redemptions, times_redeemed,
    is_active, is_adhoc, applies_to_plan_id, created_by
  ) VALUES (
    new_code,
    'Desconto direto: ' || _reason,
    _discount_type, _discount_value,
    _duration, _duration_in_months,
    1, 1,
    true, true, NULL, auth.uid()
  ) RETURNING id INTO new_voucher_id;

  -- Compute application window (mirrors apply_voucher)
  IF _duration = 'once' THEN
    remaining := 1;
    exp := NULL;
  ELSIF _duration = 'repeating' THEN
    remaining := _duration_in_months;
    exp := now() + (_duration_in_months || ' months')::INTERVAL;
  ELSE
    remaining := NULL;
    exp := NULL;
  END IF;

  -- Apply to subscription
  INSERT INTO public.subscription_discounts (
    subscription_id, voucher_id, applied_by, expires_at, invoices_remaining
  ) VALUES (
    _subscription_id, new_voucher_id, auth.uid(), exp, remaining
  ) RETURNING id INTO new_discount_id;

  -- Audit
  INSERT INTO public.subscription_changes (
    subscription_id, admin_user_id, change_type, new_value, reason, changed_by
  ) VALUES (
    _subscription_id, sub.admin_user_id, 'direct_discount',
    jsonb_build_object(
      'voucher_id', new_voucher_id,
      'voucher_code', new_code,
      'discount_type', _discount_type,
      'discount_value', _discount_value,
      'duration', _duration,
      'duration_in_months', _duration_in_months
    ),
    _reason,
    auth.uid()
  );

  RETURN new_discount_id;
END;
$$;
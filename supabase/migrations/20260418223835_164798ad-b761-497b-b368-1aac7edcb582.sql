-- Helper: returns missing required fiscal fields for an admin
CREATE OR REPLACE FUNCTION public.billing_profile_missing_fields(_admin_id uuid)
RETURNS text[]
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bp RECORD;
  missing text[] := '{}';
BEGIN
  SELECT * INTO bp FROM public.billing_profiles WHERE admin_user_id = _admin_id;
  IF NOT FOUND THEN
    RETURN ARRAY[
      'legal_name','tax_id','email','postal_code',
      'address_line1','address_number','neighborhood','city','state'
    ];
  END IF;

  IF COALESCE(TRIM(bp.legal_name), '') = '' THEN missing := array_append(missing, 'legal_name'); END IF;
  IF COALESCE(TRIM(bp.tax_id), '') = '' THEN missing := array_append(missing, 'tax_id'); END IF;
  IF COALESCE(TRIM(bp.email), '') = '' THEN missing := array_append(missing, 'email'); END IF;
  IF COALESCE(TRIM(bp.postal_code), '') = '' THEN missing := array_append(missing, 'postal_code'); END IF;
  IF COALESCE(TRIM(bp.address_line1), '') = '' THEN missing := array_append(missing, 'address_line1'); END IF;
  IF COALESCE(TRIM(bp.address_number), '') = '' THEN missing := array_append(missing, 'address_number'); END IF;
  IF COALESCE(TRIM(bp.neighborhood), '') = '' THEN missing := array_append(missing, 'neighborhood'); END IF;
  IF COALESCE(TRIM(bp.city), '') = '' THEN missing := array_append(missing, 'city'); END IF;
  IF COALESCE(TRIM(bp.state), '') = '' THEN missing := array_append(missing, 'state'); END IF;

  RETURN missing;
END;
$$;

-- Update register_manual_payment to refuse incomplete fiscal data
CREATE OR REPLACE FUNCTION public.register_manual_payment(
  _subscription_id uuid,
  _amount_cents integer,
  _payment_method text,
  _payment_reference text DEFAULT NULL,
  _notes text DEFAULT NULL,
  _advance_cycle boolean DEFAULT true
)
RETURNS uuid
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
  missing text[];
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can register manual payments';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  -- Block if fiscal data is incomplete
  missing := public.billing_profile_missing_fields(sub.admin_user_id);
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'FISCAL_INCOMPLETE: Dados fiscais incompletos. Campos pendentes: %', array_to_string(missing, ', ');
  END IF;

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
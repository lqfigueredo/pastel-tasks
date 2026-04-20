-- 1. Atualizar trigger para respeitar flag de sessão
CREATE OR REPLACE FUNCTION public.log_subscription_changes()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  actor_id UUID := auth.uid();
  suppress_status TEXT;
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
    -- Só loga status_changed genérico se RPC chamadora não suprimiu
    suppress_status := current_setting('app.suppress_status_log', true);
    IF suppress_status IS DISTINCT FROM 'true' THEN
      INSERT INTO public.subscription_changes (subscription_id, admin_user_id, change_type, old_value, new_value, changed_by)
      VALUES (NEW.id, NEW.admin_user_id, 'status_changed',
        jsonb_build_object('status', OLD.status),
        jsonb_build_object('status', NEW.status),
        actor_id);
    END IF;
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
$function$;

-- 2. Atualizar comp_activate_subscription para setar flag antes do UPDATE
CREATE OR REPLACE FUNCTION public.comp_activate_subscription(_subscription_id uuid, _months integer, _reason text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  sub RECORD;
  new_period_end TIMESTAMPTZ;
  new_change_id UUID;
BEGIN
  IF NOT has_role(auth.uid(), 'solution_admin'::app_role) THEN
    RAISE EXCEPTION 'Only solution_admin can comp-activate subscriptions';
  END IF;

  IF _reason IS NULL OR LENGTH(TRIM(_reason)) < 5 THEN
    RAISE EXCEPTION 'Motivo obrigatório (mínimo 5 caracteres)';
  END IF;

  IF _months IS NOT NULL AND (_months < 1 OR _months > 60) THEN
    RAISE EXCEPTION 'Duração deve estar entre 1 e 60 meses, ou nula (indefinida)';
  END IF;

  SELECT * INTO sub FROM public.subscriptions WHERE id = _subscription_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Subscription not found'; END IF;

  IF _months IS NULL THEN
    new_period_end := NULL;
  ELSE
    new_period_end := now() + (_months || ' months')::INTERVAL;
  END IF;

  -- Suprime log genérico de status_changed (já vamos logar comp_activation específico)
  PERFORM set_config('app.suppress_status_log', 'true', true);

  UPDATE public.subscriptions
  SET status = 'active',
      current_period_start = now(),
      current_period_end = new_period_end,
      trial_ends_at = NULL,
      past_due_since = NULL,
      updated_at = now()
  WHERE id = _subscription_id;

  INSERT INTO public.subscription_changes (
    subscription_id, admin_user_id, change_type, new_value, reason, changed_by
  ) VALUES (
    _subscription_id, sub.admin_user_id, 'comp_activation',
    jsonb_build_object(
      'months', _months,
      'period_end', new_period_end,
      'previous_status', sub.status
    ),
    _reason,
    auth.uid()
  ) RETURNING id INTO new_change_id;

  INSERT INTO public.subscription_notes (subscription_id, author_id, content)
  VALUES (
    _subscription_id,
    auth.uid(),
    'Ativação como cortesia (' ||
      CASE WHEN _months IS NULL THEN 'indefinida' ELSE _months || ' meses' END ||
    '): ' || _reason
  );

  RETURN new_change_id;
END;
$function$;

-- 3. Atualizar register_manual_payment para setar flag antes do UPDATE
CREATE OR REPLACE FUNCTION public.register_manual_payment(_subscription_id uuid, _amount_cents integer, _payment_method text, _payment_reference text DEFAULT NULL::text, _notes text DEFAULT NULL::text, _advance_cycle boolean DEFAULT true)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    -- Suprime log genérico de status_changed (já vamos logar manual_payment específico)
    PERFORM set_config('app.suppress_status_log', 'true', true);

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
$function$;
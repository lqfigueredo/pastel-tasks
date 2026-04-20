CREATE OR REPLACE FUNCTION public.comp_activate_subscription(
  _subscription_id uuid,
  _months integer,
  _reason text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;
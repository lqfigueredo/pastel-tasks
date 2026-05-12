CREATE OR REPLACE FUNCTION public.sync_cron_secret_from_value(_value text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'CRON_SECRET';
  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, _value, 'CRON_SECRET');
  ELSE
    PERFORM vault.create_secret(_value, 'CRON_SECRET');
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_cron_secret_from_value(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_cron_secret_from_value(text) TO service_role;
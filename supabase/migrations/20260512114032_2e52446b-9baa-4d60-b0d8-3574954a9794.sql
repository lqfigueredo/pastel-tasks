DO $$
DECLARE
  new_secret text := encode(gen_random_bytes(32), 'hex');
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'CRON_SECRET';
  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, new_secret, 'CRON_SECRET');
  ELSE
    PERFORM vault.create_secret(new_secret, 'CRON_SECRET');
  END IF;
  RAISE NOTICE 'NEW_CRON_SECRET=%', new_secret;
END $$;
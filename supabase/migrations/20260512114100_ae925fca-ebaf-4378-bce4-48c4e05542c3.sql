DO $$
DECLARE
  fixed_secret text := 'nevvoh_cron_2026_8f3a9c1d7e4b5a6f2c8d9e1a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c';
  existing_id uuid;
BEGIN
  SELECT id INTO existing_id FROM vault.secrets WHERE name = 'CRON_SECRET';
  IF existing_id IS NOT NULL THEN
    PERFORM vault.update_secret(existing_id, fixed_secret, 'CRON_SECRET');
  ELSE
    PERFORM vault.create_secret(fixed_secret, 'CRON_SECRET');
  END IF;
END $$;
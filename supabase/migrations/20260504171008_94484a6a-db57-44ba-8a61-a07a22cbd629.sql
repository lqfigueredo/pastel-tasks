SELECT cron.unschedule('check-notifications-hourly');
SELECT cron.unschedule('send-daily-pending-email-job');
SELECT cron.unschedule('process-recurring-tasks-daily');
SELECT cron.unschedule('expire-trials-daily');
SELECT cron.unschedule('check-expired-licenses-daily');

SELECT cron.schedule(
  'check-notifications-hourly',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://pzhwmxmlozmwvscndirw.supabase.co/functions/v1/check-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'send-daily-pending-email-job',
  '0 10 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pzhwmxmlozmwvscndirw.supabase.co/functions/v1/send-daily-pending-email',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'process-recurring-tasks-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pzhwmxmlozmwvscndirw.supabase.co/functions/v1/process-recurring-tasks',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'expire-trials-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pzhwmxmlozmwvscndirw.supabase.co/functions/v1/expire-trials',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := jsonb_build_object('time', now())
  ) AS request_id;
  $$
);

SELECT cron.schedule(
  'check-expired-licenses-daily',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://pzhwmxmlozmwvscndirw.supabase.co/functions/v1/check-expired-licenses',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
    ),
    body := '{"time": "scheduled"}'::jsonb
  ) AS request_id;
  $$
);

-- 1) Libera o disco imediatamente. TRUNCATE descarta o arquivo da tabela sem precisar de VACUUM FULL.
TRUNCATE cron.job_run_details;
DELETE FROM net._http_response WHERE created < now() - interval '1 day';

-- 2) Retenção automática: 7 dias de histórico de cron, 2 dias de respostas HTTP.
-- Remove agendamentos antigos com o mesmo nome (idempotente).
DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-cron-history');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('cleanup-http-responses');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'cleanup-cron-history',
  '30 3 * * *',
  $cron$DELETE FROM cron.job_run_details WHERE end_time < now() - interval '7 days'$cron$
);

SELECT cron.schedule(
  'cleanup-http-responses',
  '45 3 * * *',
  $cron$DELETE FROM net._http_response WHERE created < now() - interval '2 days'$cron$
);

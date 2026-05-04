## Corrigir cron jobs (401 → 200)

Estou em modo plano e preciso da sua aprovação para criar a migração que reagenda os cron jobs (a operação exige permissões de schema `cron`, que só a ferramenta de migração possui).

### O que será feito (uma única migração SQL)

1. `cron.unschedule` dos 5 jobs atuais.
2. `cron.schedule` recriando cada um com o header `x-cron-secret` lido de `vault.decrypted_secrets` (CRON_SECRET).

Jobs e schedules preservados:
- `check-notifications-hourly` — `0 * * * *`
- `send-daily-pending-email-job` — `0 10 * * *`
- `process-recurring-tasks-daily` — `0 3 * * *`
- `expire-trials-daily` — `0 3 * * *`
- `check-expired-licenses-daily` — `0 3 * * *`

### Validação após aplicar
1. Disparar `check-notifications` via curl com `x-cron-secret` → esperar 200.
2. Consultar `net._http_response` na próxima hora cheia → confirmar 200.
3. Após 10:00 UTC do próximo dia, verificar `email_send_log` para novos envios.

### Sem alterações em código
Edge functions, templates e config.toml ficam inalterados.

Aprovar para eu aplicar a migração.
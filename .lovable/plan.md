## Diagnóstico

- `email_send_log` mostra 17 e-mails travados em `pending` desde 26/05 (último `sent` em 22/05).
- Fila `pgmq.q_transactional_emails` tem 17 mensagens não processadas.
- Logs do edge function: cron chama `process-email-queue` a cada 5s e recebe **403** em 100% das chamadas.
- Causa: a correção de segurança recente trocou a validação por claims-JWT por uma comparação direta com `SUPABASE_SERVICE_ROLE_KEY`. O segredo `email_queue_service_role_key` armazenado no Vault (usado pelo cron) é um JWT antigo que não é igual ao service role key atual, então a comparação falha.

## Correção

1. Rodar novamente o setup da infraestrutura de e-mail (`setup_email_infra`). Ele é idempotente e regrava o segredo do Vault com o service role key atual e re-agenda o cron.
2. Aguardar 1–2 ciclos do cron (≈10s) e verificar:
   - Logs do `process-email-queue` retornando 200.
   - `pgmq.q_transactional_emails` esvaziando.
   - Linhas em `email_send_log` mudando de `pending` para `sent`.
3. Se algum e-mail tiver passado do TTL (60 min para transacionais) ele vai para DLQ — nesse caso, reenviar os daily-pending mais recentes manualmente (apenas se o usuário quiser).

Nenhuma alteração de código é necessária; é só restaurar o segredo do Vault via a ferramenta de setup.

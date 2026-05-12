## Sincronizar CRON_SECRET para destravar agendamentos

### Problema
O valor de `CRON_SECRET` no Vault do banco está diferente do valor configurado como secret das Edge Functions. Por isso, todas as execuções automáticas (envio de email diário, notificações, tarefas recorrentes, expiração de trials e licenças) retornam 401.

### Passos
1. Abrir o formulário seguro de atualização do secret `CRON_SECRET` para você colar o valor:
   `4de7f1c7a912c165af86ce0b29751f0d59882ff7cd08b7f52ea2d70eebd0552e`
2. Disparar manualmente `send-daily-pending-email` e `check-notifications` para validar resposta 200.
3. Conferir `email_send_log` para confirmar entrada de `daily-pending-summary`.
4. Verificar a próxima execução agendada do cron para confirmar 200 em produção real.

### Resultado
Após a sincronização, todos os 5 cron jobs voltam a funcionar permanentemente nos seus horários agendados. Não é envio único — é a correção definitiva do agendamento.

Sem alterações de código.

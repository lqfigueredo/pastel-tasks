# Revisão Pré-Lançamento — Integridade de Dados

## Problemas críticos encontrados

### 1. Crons continuam falhando com 401 (causa raiz real)
A migração anterior agendou os jobs com:
```sql
'x-cron-secret', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'CRON_SECRET' LIMIT 1)
```
Mas o `CRON_SECRET` **só existe como secret de Edge Function** — **não está no `vault.secrets`** (lá só tem `email_queue_service_role_key`). Resultado: o subselect retorna NULL, o header vai vazio, e todas as chamadas (`check-notifications` a cada hora, `send-daily-pending-email` 10h UTC, `process-recurring-tasks`, `expire-trials`, `check-expired-licenses` 3h UTC) recebem **401 Unauthorized**. Confirmado nas últimas 6 execuções de `net._http_response`: todas 401.

**Correção:** inserir o `CRON_SECRET` no `vault.secrets` via `vault.create_secret(...)` (uma vez), depois validar com uma execução manual de `check-notifications` e `send-daily-pending-email`.

### 2. Admin órfão sem `admin_settings` e sem `subscription`
Encontrado 1 usuário com role `admin` sem registros associados:
- `user_id: be4e1bbe-83a6-4bb9-be6e-fe798ec423ff`

Isso quebra: limite de assentos, billing, trial. Provavelmente é um admin antigo de teste.

**Correção:** Verificar quem é (consultar email) e ou (a) criar `admin_settings` + `subscription` em estado `inactive`, ou (b) remover a role se for conta de teste. Pedir confirmação antes de remover.

### 3. Outras verificações (todas OK)
- Sem `task_assignees` órfãos
- Sem tasks sem status válido
- Sem profiles órfãos
- Todos auth.users têm profile e role
- Sem meeting_pendencies/tasks órfãs

## Plano de execução

1. **Migração**: inserir `CRON_SECRET` em `vault.secrets` (lendo do secret de edge function que já existe).
2. **Validar crons**: chamar `check-notifications` via `net.http_post` manual com o header correto e confirmar 200; observar próxima execução horária.
3. **Tratar admin órfão**: identificar email do `be4e1bbe...`, perguntar se é teste (deletar) ou produção (criar `admin_settings` default 10 seats + `subscription` em `inactive`).
4. **Re-executar checagens de integridade** após correções.
5. **Rodar linter** completo e revisar warnings restantes (atualmente 60 warnings, todos sobre `SECURITY DEFINER` callable — comportamento esperado das funções `is_*`/`has_role`; não bloqueante).

## Não inclui

- Mudanças em código frontend.
- Mudanças em Edge Functions.
- Refatorações de RLS (todas validadas como corretas).

Após aprovação, aplico a correção do vault e te peço a decisão sobre o admin órfão antes de qualquer DELETE.

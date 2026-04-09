

## E-mail diário de pendências (tarefas e pendências de reunião)

### O que será criado

Uma Edge Function `send-daily-pending-email` que roda diariamente via pg_cron e envia um e-mail consolidado para cada usuário com:
- Tarefas com prazo **hoje** ou **atrasadas** (sem `actual_end_date`)
- Pendências de reunião com prazo **hoje** ou **atrasadas** (não concluídas)

O e-mail inclui links diretos para `/tarefas` (tarefas) e `/atas/{meetingId}` (pendências).

### Implementação

#### 1. Novo template de e-mail — `daily-pending-summary.tsx`

Template React Email em `supabase/functions/_shared/transactional-email-templates/` com:
- Saudação com nome do usuário
- Seção "Tarefas" — lista com título, prazo e link direto para `/tarefas`
- Seção "Pendências de reunião" — lista com descrição, prazo e link direto para `/atas/{meetingId}`
- Badge visual para "Atrasada" vs "Vence hoje"
- Estilo consistente com os templates existentes (branding NEVVOH)

Registrar no `registry.ts`.

#### 2. Nova Edge Function — `send-daily-pending-email/index.ts`

Lógica:
1. Buscar todas as tarefas sem `actual_end_date` com `estimated_delivery_date <= hoje`
2. Buscar todas as `meeting_pendencies` não concluídas com `due_date <= hoje`
3. Agrupar por usuário (via `task_assignees` e `responsible_user_id`)
4. Para cada usuário com itens pendentes, buscar e-mail e nome do perfil
5. Invocar `send-transactional-email` com o template `daily-pending-summary` passando a lista de itens
6. Usar `idempotencyKey` = `daily-pending-{userId}-{today}` para evitar duplicatas

#### 3. Agendar via pg_cron

Criar um cron job para executar diariamente às 7h (horário de Brasília / UTC-3 = 10:00 UTC):
```
0 10 * * *
```
Chamará a Edge Function `send-daily-pending-email`.

#### 4. Configuração no `config.toml`

Adicionar `verify_jwt = false` para a nova função.

### Arquivos modificados/criados
- `supabase/functions/_shared/transactional-email-templates/daily-pending-summary.tsx` (novo)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — registrar template
- `supabase/functions/send-daily-pending-email/index.ts` (novo)
- `supabase/config.toml` — adicionar config da nova função
- **SQL (insert via supabase)** — pg_cron job para execução diária


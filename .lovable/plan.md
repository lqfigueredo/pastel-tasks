

## Remediação de segurança — plano completo

Plano executado em 4 etapas: storage, realtime, edge functions e ajustes frontend. Sem rate-limiting de backend (não é suportado hoje).

---

### Etapa 1 — Storage hardening (Crítico 1 + Médio 3 + Médio 7)

**Migration SQL** com:

- **`idea-attachments`**: DROP da policy aberta `Authenticated can view idea attachments storage`. A policy estrita já existente (path `auth.uid()`) permanece.
- **`knowledge-attachments`**: DROP `Users can view knowledge files` (aberta) e DROP `Auth users can upload knowledge files`. Recriar com path `(storage.foldername(name))[1] = auth.uid()::text` para SELECT/INSERT/UPDATE/DELETE. Acesso de time fica via signed URLs geradas pelo dono.
- **`task-attachments`**: padronizar path `{user_id}/{task_id}/{filename}`. Reescrever policies SELECT/INSERT/UPDATE/DELETE para checar `(storage.foldername(name))[1] = auth.uid()::text` no INSERT e `can_access_task(auth.uid(), ((storage.foldername(name))[2])::uuid)` no SELECT. Frontend já usa `{user_id}/...` no upload, então não há migração de dados pesada — vamos aceitar coexistência via `OR` durante transição.
- **`email-assets`**: DROP `Authenticated users can list email assets`. Bucket continua público para servir por URL direta (uso real em e-mails), mas bloqueia listagem.

### Etapa 2 — Realtime authorization (Crítico 2)

**Migration SQL**:

- Habilitar RLS em `realtime.messages` (se não estiver) e adicionar policy que valide o `topic` do canal:
  - Topics no padrão `user:{uuid}` → exigir `topic = 'user:' || auth.uid()::text`
  - Topics no padrão `team:{uuid}` → exigir `is_team_member(auth.uid(), uuid_part)`
  - Topics no padrão `support:{ticket_id}` → exigir owner OU `solution_admin`
  - Demais topics negados por padrão
- Função helper `public.can_access_realtime_topic(topic text)` `SECURITY DEFINER` para encapsular a lógica.

**Ajustes frontend** para usar nomes de canal escopo-específicos:

- `src/hooks/useTasksRealtime.ts` — canal passa de `tasks-realtime` para `user:{auth.uid()}`. Continuar ouvindo `postgres_changes` em `tasks` e `task_assignees`, mas o gate de autorização passa pelo nome do canal.
- `src/components/NotificationBell.tsx` — canal `notifications-{userId}` → `user:{userId}`.
- `src/components/support/SupportChat.tsx` — canal `support-{ticketId}` → `support:{ticketId}`.

### Etapa 3 — Edge functions

**`supabase/functions/register-financial-user/index.ts`**:

- Substituir `token !== '445'` hardcoded por `Deno.env.get('FINANCIAL_REGISTER_TOKEN')`.
- Logar tentativas (sucesso e falha) com IP/UA em `console.log` estruturado.
- Pedir ao usuário o secret `FINANCIAL_REGISTER_TOKEN` via `add_secret` na execução.

**`supabase/functions/lookup-user-by-email/index.ts`**:

- Após `getClaims`, checar via `supabase.from('user_roles').select().eq('user_id', callerId).in('role', ['admin','solution_admin'])`. Se não tiver role, retornar `403`.
- Padronizar respostas: tanto "encontrado" quanto "não encontrado" retornam `200` com `{found: boolean, user?: {...}}` em vez de `404` (reduz enumeração via status code).

### Etapa 4 — Limpeza do scanner

Marcar como **ignored** com justificativa as policies `service_role ... USING (true)` em: `subscriptions`, `invoices`, `billing_events`, `payment_methods`, `subscription_changes`, `email_send_log`, `notifications`, `email_unsubscribe_tokens`, `suppressed_emails`, `email_send_state`. Motivo: restritas ao role `service_role`, intencional.

Remover policy duplicada `Admin can view own billing profile` (já coberta por `Admin can manage own billing profile`).

---

### Arquivos afetados

**Migrations novas (2)**
- `supabase/migrations/<ts>_storage_hardening.sql` — etapa 1
- `supabase/migrations/<ts>_realtime_authorization.sql` — etapa 2 + função `can_access_realtime_topic` + cleanup do duplicado em billing_profiles

**Edge functions modificadas (2)**
- `supabase/functions/register-financial-user/index.ts`
- `supabase/functions/lookup-user-by-email/index.ts`

**Frontend (3)**
- `src/hooks/useTasksRealtime.ts`
- `src/components/NotificationBell.tsx`
- `src/components/support/SupportChat.tsx`

**Secret a configurar**
- `FINANCIAL_REGISTER_TOKEN` (string longa aleatória)

---

### Itens fora deste plano (consciente)

- **Rate limiting** (Médio 4 e 5): backend não tem primitivo adequado hoje, será endereçado quando houver infra.
- **Validação de leads via trigger**: parte do mesmo escopo de "leads/spam" — adiamos junto com rate-limit para evitar mudança parcial.
- **Captcha (Turnstile)** no `LeadFormDialog`: requer secret externo + UX, fica para fase específica de hardening anti-bot.

### Riscos e mitigação

- **Realtime**: mudar nome de canal faz subscribers antigos pararem de receber até o reload. Risco baixo — o app é interno e os hooks recriam ao montar.
- **Storage**: arquivos legados em `task-attachments` que não seguem `{user_id}/{task_id}/` precisam coexistir. Vamos manter policy permissiva via `OR` para paths antigos por 30 dias e adicionar TODO para limpeza posterior.
- **Edge function `lookup-user-by-email`**: hoje é chamada por fluxos de convite. Restringir a admin/solution_admin precisa ser validado nos call sites (`InviteUserDialog`, fluxos financeiros). Vou auditar antes de aplicar — se algum caller for usuário comum, ajustamos a checagem.




User aprovou: implementar item 1 (convite de equipe por link mágico) agora, e depois seguir com 2-9. Foco no plano do item 1.

Contexto que já sei:
- `admin-create-user/index.ts` cria user com senha, bane, insere `user_approvals.pending`. Esse fluxo permanece para casos onde admin quer criar com senha definida.
- Falta um fluxo de **convite por email** que: gera token, envia email, e quando convidado clica → define senha → entra direto no time, contando seat sem aprovação manual.
- `admin_can_add_user` já valida seats — vou usar nele tanto na criação do convite quanto na aceitação (revalida porque seats podem mudar entre envio e aceite).
- Email transacional: já temos `send-transactional-email` + registry de templates em `_shared/transactional-email-templates/`. Vou adicionar um template novo `team-invite.tsx`.
- Tabela `user_approvals` continua: ao aceitar, inserir como `approved` (não `pending`) com `created_by_admin = inviter_id`.

Decisões já tomadas (sem precisar perguntar):
- Convite expira em 7 dias.
- Email do convidado define a conta. Se já existe conta com esse email → erro "usuário já existe, peça para o admin adicioná-lo direto ao time".
- Convite consome seat só ao aceitar (não na criação) — evita "reservar" seat indefinidamente. Mas valida disponibilidade na criação para feedback imediato.
- Admin pode revogar convite pendente; pode reenviar (gera novo token, invalida o antigo).

---

## Plano — Convite de equipe por link mágico

### 1. Schema novo

Tabela `team_invites`:
- `id uuid pk`
- `token text unique not null` (gerado via `gen_random_uuid()::text` ou similar)
- `email text not null`
- `inviter_id uuid not null` (admin que convidou)
- `team_id uuid` (opcional — convidar para um time específico)
- `display_name text` (opcional, sugestão de nome)
- `expires_at timestamptz not null` (now + 7d)
- `accepted_at timestamptz`
- `accepted_user_id uuid`
- `revoked_at timestamptz`
- `created_at timestamptz default now()`

RLS:
- `inviter_id = auth.uid()` → admin gerencia próprios convites (SELECT, INSERT via edge function, UPDATE para revogar)
- `solution_admin` vê tudo
- Aceitação é via edge function com service role (não precisa policy para anon)

### 2. Edge functions

**`invite-team-member`** (chamada pelo admin autenticado):
1. Valida JWT, garante role `admin`.
2. Recebe `{ email, displayName?, teamId? }`.
3. Valida formato email; verifica se já existe user com esse email em `auth.users` → erro amigável.
4. Verifica se já há convite pendente (não expirado, não aceito, não revogado) para esse email/inviter → erro "convite já enviado, reenvie ou revogue".
5. Chama `admin_can_add_user(inviter_id)` → se false, erro de seats.
6. Gera token (`crypto.randomUUID()`), insere em `team_invites` com `expires_at = now + 7d`.
7. Dispara email transacional `team-invite` com link `https://nevvoh.com/convite/{token}`.
8. Retorna `{ invite_id, expires_at }`.

**`accept-team-invite`** (chamada pública, sem JWT):
1. Recebe `{ token, password, displayName }`.
2. Busca convite por token. Valida: não expirado, não aceito, não revogado.
3. Revalida `admin_can_add_user(inviter_id)` (seats podem ter mudado).
4. Cria user via `auth.admin.createUser` com `email_confirm: true`, sem ban.
5. Insere em `user_approvals` com `status='approved'`, `created_by_admin=inviter_id`, `approved_at=now`.
6. Se `teamId` no convite, insere em `team_members`.
7. Marca `team_invites.accepted_at=now`, `accepted_user_id=newUserId`.
8. Retorna sucesso → frontend redireciona para `/auth` com mensagem "conta criada, faça login".

**`revoke-team-invite`** (admin autenticado):
- Marca `revoked_at=now` se inviter_id == caller. Convite vira inválido.

### 3. Template de email

Criar `supabase/functions/_shared/transactional-email-templates/team-invite.tsx`:
- Saudação personalizada com nome do admin que convidou.
- Botão grande: "Aceitar convite" → `https://nevvoh.com/convite/{token}`.
- Aviso: expira em 7 dias.
- Registrar no `registry.ts`.

### 4. UI nova

**Página pública `/convite/:token`** (`src/pages/AcceptInvite.tsx`):
- Busca convite (via edge function `get-invite-info` ou inline em `accept-team-invite` com modo "preview"). Mostra email, nome do convidador, time.
- Form: nome (pré-preenchido com sugestão), senha, confirmação de senha.
- Submit → chama `accept-team-invite` → toast sucesso → redireciona para `/auth?invited=1`.
- Trata estados: convite inválido, expirado, revogado, já aceito.

**Componente `InviteUserDialog`** (em `src/components/team/`):
- Substitui ou complementa o atual fluxo de criação direta. Form: email, nome opcional, time opcional.
- Botão "Enviar convite" → chama `invite-team-member`.
- Toast: "Convite enviado para {email}".

**Lista de convites pendentes** (em `TeamList.tsx` ou seção dedicada):
- Mostra convites pendentes do admin: email, enviado em, expira em, status.
- Ações: "Reenviar" (gera novo token, invalida antigo, envia email de novo) e "Revogar".

### 5. Roteamento

`App.tsx`: adicionar rota pública `/convite/:token` → `AcceptInvite`.

### 6. Compatibilidade

- `admin-create-user` continua funcionando para casos em que admin prefere definir senha direto.
- `user_approvals` continua o fluxo de aprovação para casos legados/diretos.
- Convidados via link mágico nascem `approved`, sem passar pela tela de aprovação do solution_admin.

### Arquivos afetados

- **Migração**: criar tabela `team_invites` + RLS
- **Novo**: `supabase/functions/invite-team-member/index.ts`
- **Novo**: `supabase/functions/accept-team-invite/index.ts`
- **Novo**: `supabase/functions/revoke-team-invite/index.ts`
- **Novo**: `supabase/functions/_shared/transactional-email-templates/team-invite.tsx`
- **Editado**: `supabase/functions/_shared/transactional-email-templates/registry.ts`
- **Novo**: `src/pages/AcceptInvite.tsx`
- **Novo**: `src/components/team/InviteUserDialog.tsx`
- **Editado**: `src/pages/TeamList.tsx` — botão "Convidar por email" + lista de convites pendentes
- **Editado**: `src/App.tsx` — rota `/convite/:token`


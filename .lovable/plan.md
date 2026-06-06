# Revisão do fluxo de cadastro inicial

## Resumo

O fluxo está funcional. O cadastro público (`/auth`) cria admin com acesso free de 1 ano e dispara onboarding. O cadastro financeiro (`/financeiro/cadastro`) cria `solution_admin`. Convites de equipe (`/convite/:token`) também funcionam.

Encontrei alguns pontos para corrigir antes de testar — alguns silenciosos, outros de segurança. Listo os que recomendo corrigir agora; os demais ficam como observação.

---

## Bugs que recomendo corrigir agora

### 1. `register-user` — falhas silenciosas (CRÍTICO p/ confiabilidade)
**Arquivo:** `supabase/functions/register-user/index.ts:74-76` e `121-122`

Se `roleError` (insert do role `admin`) ou `subError` (insert da subscription) acontecer, o erro é só logado e a função retorna `success: true`. O usuário acha que cadastrou normalmente, mas fica:
- sem role `admin` → onboarding não dispara, não vê telas administrativas
- sem subscription → `admin_settings.max_users` não populado, não consegue convidar ninguém

**Correção:** se qualquer um dos dois falhar, fazer rollback (`auth.admin.deleteUser(userId)`) e retornar erro real ao frontend.

### 2. `register-financial-user` — role `user` duplicado
**Arquivo:** `supabase/functions/register-financial-user/index.ts:73-75`

O trigger `handle_new_user` cria role `user` automaticamente. O `register-user` faz `DELETE` dele antes de inserir `admin`, mas o `register-financial-user` não. Resultado: `solution_admin` fica com `['user','solution_admin']`.

**Correção:** adicionar o mesmo `DELETE` de role `user` antes do INSERT de `solution_admin`, espelhando `register-user`.

### 3. `FinancialRegister.tsx` — token hardcoded no frontend
**Arquivo:** `src/pages/FinancialRegister.tsx:29`

```ts
if (token !== "445") { ... }
```

Qualquer pessoa vendo o JS descobre o token. A validação real está no servidor (env `FINANCIAL_REGISTER_TOKEN`), então a checagem do frontend é dispensável e perigosa.

**Correção:** remover a comparação `=== "445"`; deixar apenas a validação server-side. O frontend só precisa exigir que o campo não esteja vazio.

---

## Bugs/observações que NÃO vou alterar agora (só registro)

- **`accept-team-invite` / `invite-team-member`** usam `listUsers({ perPage: 1000 })` sem paginação real → falha com >1000 usuários cadastrados. Não é problema imediato. *(Sugiro tratar quando a base crescer.)*
- **Step4 do Onboarding** trava se a tabela `task_statuses` estiver vazia. *(Edge case — em produção sempre há status padrão.)*
- **Step1 do Onboarding** chama ViaCEP sem timeout. *(UX raro de falhar.)*
- **Turnstile bypass** quando env vars não setadas (já documentado).

---

## Teste do fluxo de cadastro de nova empresa

Após aplicar as 3 correções acima, vou testar no preview com o browser:

1. **Abrir `/auth`** → preencher nome, e-mail novo (`teste-rebrand+<timestamp>@nevvoh.com`), senha (≥8 chars), resolver Turnstile, submeter.
2. **Verificar** no banco (via `read_query`):
   - `auth.users` tem o registro com `email_confirmed_at` preenchido
   - `profiles` tem `display_name`
   - `user_roles` tem **apenas** `admin` (sem `user`)
   - `subscriptions` tem `status='active'`, `provider='free'`, `current_period_end` ≈ hoje + 365 dias
   - `admin_settings.max_users` populado pelo trigger
3. **Login** com a nova conta → confirmar que **OnboardingWizard** abre.
4. **Cancelar / pular** o wizard (não preciso completar todos os steps — só validar que abre e os campos carregam).
5. **Limpar** o usuário de teste do banco no final.

## Como verifico

- Após cada correção: rebuild automático.
- Teste no preview com `view_preview` + `observe` + `act`.
- Validação dos inserts via `supabase--read_query`.
- Logs das edge functions via `supabase--edge_function_logs` se algo falhar.

## Fora de escopo

- Re-arquitetar a aprovação/ativação de subscriptions pagas.
- Implementar paginação real no `listUsers`.
- Adicionar timeout no ViaCEP.
- Mexer em qualquer coisa que não seja diretamente o fluxo de signup.

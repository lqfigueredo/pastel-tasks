# Remover Cloudflare Turnstile

O Turnstile está bloqueando o cadastro porque o frontend usa a chave de teste do Cloudflare, gerando tokens que não validam contra o secret real. Em vez de configurar oficialmente, vou removê-lo completamente do fluxo.

## Mudanças

### Frontend
1. **`src/pages/Auth.tsx`** — Remover o widget `<Turnstile />`, constantes `TURNSTILE_TEST_KEY`/`SITE_KEY`, estado `token`, ref `turnstileRef`, validação anti-bot, e o parâmetro `turnstileToken` passado ao `signUp`. Botão "Criar conta" volta a depender só do `loading`.
2. **`src/components/landing/LeadFormDialog.tsx`** — Mesma remoção (widget, estado, validação) na chamada ao edge `submit-lead`.
3. **`src/contexts/AuthContext.tsx`** — Remover o parâmetro `turnstileToken` da assinatura de `signUp` e do body enviado ao `register-user`.

### Backend (Edge Functions)
4. **`supabase/functions/register-user/index.ts`** — Remover o bloco que lê `TURNSTILE_SECRET_KEY` e chama `challenges.cloudflare.com/turnstile/v0/siteverify`. Também remover a leitura de `turnstile_token` do body.
5. **`supabase/functions/submit-lead/index.ts`** — Mesma remoção.

### i18n
6. Remover as chaves `validation.turnstileRequired` e `lead.form.turnstileWait` dos JSONs `pt-BR` e `en` se não forem mais referenciadas.

### Não mexer
- Dependência `@marsidev/react-turnstile` no `package.json` — deixar instalada (custo zero, facilita reativar depois).
- Secret `TURNSTILE_SECRET_KEY` no Lovable Cloud — deixar configurada (não atrapalha).

## Risco
Sem Turnstile, os endpoints `register-user` e `submit-lead` ficam expostos a bots. Mitigações já existentes que continuam ativas: validação de senha (≥8 caracteres no signup), confirmação de e-mail desativada mas o `auth.users` ainda detecta duplicatas, e Supabase tem rate limiting básico por IP. Se aparecer abuso, dá pra reativar o Turnstile com chaves oficiais depois.
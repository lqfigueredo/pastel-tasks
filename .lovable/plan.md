## Aceite obrigatório dos Termos no cadastro

### 1. UI — `src/pages/Auth.tsx`
- Adicionar `Checkbox` (shadcn) visível apenas no fluxo de signup, com label "Li e concordo com os Termos de Uso e a Política de Privacidade".
- Links `<Link to="/termos">` e `<Link to="/privacidade">` abrindo em nova aba (`target="_blank"`).
- Estado local `acceptedTerms: boolean`; botão "Criar conta" desabilitado até marcado.
- Validar no submit; mostrar erro `validation.termsRequired` se não marcado.
- Reset do checkbox ao alternar entre login/signup e após signup com sucesso.

### 2. i18n — `src/i18n/locales/{pt-BR,en}/auth.json`
Novas chaves em `signup`:
- `acceptTermsPrefix`, `acceptTermsLink` (Termos de Uso), `acceptTermsAnd`, `acceptPrivacyLink` (Política de Privacidade), `acceptTermsSuffix`
- `validation.termsRequired`

### 3. Tabela `user_legal_acceptances` (migration)
Colunas: `id`, `user_id` (FK auth.users), `doc_type` (terms/privacy), `document_id` (FK legal_documents, nullable), `version`, `locale`, `accepted_at`, `ip_address`, `user_agent`, `created_at`.

GRANTs: `authenticated` (SELECT/INSERT próprios), `service_role` ALL.
RLS:
- usuário lê apenas as próprias linhas
- `solution_admin` lê todas
- INSERT só via `service_role` (edge function)

### 4. Edge function `register-user`
Após criar o usuário e antes de retornar sucesso:
- Receber `locale` no body (default `pt-BR`).
- Buscar última versão publicada de `terms` e `privacy` em `legal_documents` para o locale.
- Inserir 2 linhas em `user_legal_acceptances` com `ip_address` (de `x-forwarded-for`) e `user_agent` do header.
- Falha no registro do aceite não bloqueia signup (apenas loga); aceite ainda é obrigatório no front.

`AuthContext.signUp` passa `locale: i18n.language` no body.

### Fora de escopo
- Re-aceite quando termos forem republicados.
- Alterações em `LeadFormDialog` ou em `AcceptInvite` (pode ser tratado depois se desejado).

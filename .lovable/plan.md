# Plano — Completar tradução PT/EN das páginas públicas

## Diagnóstico

A **Landing page e seus componentes estão 100% traduzidos** (178 chaves PT/EN sincronizadas, sem diferenças). O problema está em **outras páginas públicas** que ainda estão totalmente hardcoded em PT-BR e quebram a experiência quando o visitante seleciona EN no switcher da Landing.

### Páginas afetadas
| Página | Status | Problema |
|---|---|---|
| `Auth.tsx` | ❌ 100% PT hardcoded | Toda a tela de login/cadastro, validações, toasts, link "Voltar", aviso de Termos/Privacidade |
| `AcceptInvite.tsx` | ❌ 100% PT hardcoded | Tela de aceite de convite por email |
| `Unsubscribe.tsx` | ❌ 100% PT hardcoded | 6 estados (loading/valid/already/invalid/success/error) |
| `NotFound.tsx` | ❌ Fixo em EN | "Oops! Page not found" |
| `legal/Privacy.tsx` + `legal/Terms.tsx` | ⚠️ Parcial | `document.title`, fallback markdown e link "Início" em PT |

### Achados menores (não bloqueantes)
- 2 warnings de `forwardRef` no console em `IdeasPreview` e `TaskMarquee` (lazy components recebem ref do `Suspense` — vale anular envolvendo a função em `forwardRef`).
- Conteúdo do markdown de Privacy/Terms vem do banco — só existe versão PT. Para localizar de verdade, seria preciso armazenar versões por idioma na tabela `legal_documents` (decisão de produto, **fora deste escopo**).

---

## Mudanças propostas

### 1. Adicionar chaves ao namespace `auth.json` (PT-BR e EN)
Expandir o atual `auth.json` (hoje quase vazio) com:
- `auth.back`, `auth.loading`, `auth.tagline`
- `auth.login.title`, `auth.login.description`, `auth.login.submit`, `auth.login.toggle`
- `auth.signup.title`, `auth.signup.description`, `auth.signup.submit`, `auth.signup.toggle`, `auth.signup.successTitle`, `auth.signup.successDescription`, `auth.signup.terms` (com `<Trans>` para os links)
- `auth.fields.name/email/password` (label + placeholder)
- `auth.validation.nameRequired/nameTooShort/emailRequired/emailInvalid/passwordRequired/passwordTooShort`
- `auth.errors.signIn` / `auth.errors.signUp` (usados pelos `errorToast`)
- `auth.viewPlans`, `auth.submitting`

### 2. Refatorar `src/pages/Auth.tsx`
- Adicionar `useTranslation('auth')`.
- Substituir todas as strings hardcoded.
- Usar `<Trans i18nKey="signup.terms" components={{ termsLink: <Link…/>, privacyLink: <Link…/> }} />` para preservar os links de Termos/Privacidade.

### 3. Criar/expandir namespace para AcceptInvite
- Adicionar bloco `acceptInvite.*` no `auth.json` (mesmo namespace, para reduzir overhead de carregamento) com:
  - `invalidTitle`, `invitedTitle`, `invitedBy` (com interpolação `{{inviter}}` e `{{team}}`)
  - Labels do formulário, validações, toasts, botão "Ir para o início" / "Criar conta e aceitar convite"
- Refatorar `src/pages/AcceptInvite.tsx` consumindo essas chaves.

### 4. Criar namespace `public.json` (PT-BR e EN) — para páginas públicas leves
Cobre `Unsubscribe`, `NotFound` e títulos legais — namespace pequeno e reutilizável:
- `unsubscribe.states.{loading|valid|already|invalid|success|error}.{title|desc}`
- `unsubscribe.confirmButton`
- `notFound.title`, `notFound.message`, `notFound.back`
- `legal.privacyTitle`, `legal.termsTitle`, `legal.notPublished`, `legal.home`

Registrar `public` no `src/i18n/index.ts` (resources + NAMESPACES).

### 5. Refatorar páginas restantes
- `src/pages/Unsubscribe.tsx`: usar `t('unsubscribe.states.…')` no `messages` map.
- `src/pages/NotFound.tsx`: usar `useTranslation('public')`.
- `src/pages/legal/Privacy.tsx` + `Terms.tsx`: localizar `document.title`, fallback markdown e botão "Início".

### 6. Limpeza dos warnings de `forwardRef` (bonus — opcional)
Envolver `TaskMarquee` e `IdeasPreview` em `forwardRef((props, _ref) => …)` para silenciar os warnings React (vêm de `<Suspense>` passando ref aos children lazy).

---

## Arquivos afetados
- **Editar**: `src/i18n/index.ts`, `src/i18n/locales/pt-BR/auth.json`, `src/i18n/locales/en/auth.json`, `src/pages/Auth.tsx`, `src/pages/AcceptInvite.tsx`, `src/pages/Unsubscribe.tsx`, `src/pages/NotFound.tsx`, `src/pages/legal/Privacy.tsx`, `src/pages/legal/Terms.tsx`.
- **Criar**: `src/i18n/locales/pt-BR/public.json`, `src/i18n/locales/en/public.json`.
- **Opcional**: `src/components/landing/featurePreviews.tsx` e `src/components/landing/TaskMarquee.tsx` (forwardRef).

## Validação
1. `tsc --noEmit` para garantir build limpo.
2. Testar `/auth`, `/aceitar-convite/:token`, `/unsubscribe`, rota inexistente e `/termos`/`/privacidade` em ambos os idiomas via switcher.
3. Confirmar paridade de chaves com `python3` (igual à validação que usei na Landing).

## Fora de escopo
- **Tradução do conteúdo markdown** dos documentos legais (Privacy/Terms armazenados no banco). Isso requer mudança de schema (`locale` em `legal_documents`) e UI no `LegalDocumentsEditor`. Posso propor em plano separado se desejar.

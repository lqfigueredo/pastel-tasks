

## Fase A — Soft launch

Quatro frentes para liberar o produto a clientes beta pagantes com segurança.

---

### 1. Anti-bot na captura de leads (Cloudflare Turnstile)

- Integrar widget **Cloudflare Turnstile** no `LeadFormDialog.tsx` (free, sem custo, sem fricção tipo CAPTCHA visual).
- Adicionar `VITE_TURNSTILE_SITE_KEY` (público, vai no client) e `TURNSTILE_SECRET_KEY` (privado, edge function).
- Nova edge function `submit-lead`:
  - Recebe `{ name, email, turnstile_token }`
  - Valida token na API do Cloudflare
  - Insere em `leads` via service role
  - Retorna sucesso/erro
- Remover policy `Anyone can insert leads` da tabela `leads` (ninguém mais insere direto — só via edge function).
- Manter `LeadFormTrigger` e dialog com a mesma UX, só trocando a chamada Supabase por `supabase.functions.invoke('submit-lead', ...)`.

### 2. Termos de Uso + Política de Privacidade (editáveis no Financeiro)

**Tabela nova `legal_documents`:**
- `id`, `doc_type` ('terms' | 'privacy'), `content` (text/markdown), `version` (int), `published_at`, `updated_by`
- RLS: leitura pública (anon + authenticated), escrita só `solution_admin`
- Seed inicial com versão 1 de cada doc (texto base PT-BR adequado a LGPD; usuário ajusta depois)

**Páginas públicas:**
- `/termos` e `/privacidade` — renderiza markdown da última versão publicada usando `react-markdown` (lib leve, ~30KB).
- Links no footer da `Landing.tsx` e na página de `Auth.tsx` ("Ao se cadastrar você aceita nossos Termos e Política de Privacidade").

**Editor no Financeiro:**
- Nova aba "Documentos Legais" em `Financial.tsx` (visível só para `solution_admin`).
- Componente `LegalDocumentsEditor.tsx`:
  - Tabs: "Termos de Uso" | "Política de Privacidade"
  - `Textarea` grande com markdown
  - Preview ao lado (renderiza markdown em tempo real)
  - Botão "Publicar nova versão" (incrementa `version`, atualiza `published_at`)
  - Lista das versões anteriores (read-only, para histórico)

### 3. Sentry DSN — instrução clara ao usuário

- Já entregue no código. Documentar no chat:
  - Criar projeto em sentry.io → React → copiar DSN
  - Workspace Settings → Build Secrets → adicionar `VITE_SENTRY_DSN`
  - Próximo build em produção ativa o tracking
- Sem mudanças no código nesta fase.

### 4. Checklist de teste end-to-end (entregue como documento)

- Criar `docs/launch-checklist.md` na raiz do projeto, em PT-BR, com passos manuais para validar antes do go-live:
  - **Fluxo 1**: Cadastro → aprovação pelo admin → onboarding → primeira tarefa
  - **Fluxo 2**: Trial → conversão (registrar pagamento manual) → fatura gerada
  - **Fluxo 3**: Esqueci senha → e-mail recebido → reset → login
  - **Fluxo 4**: Convidar usuário até atingir limite de assentos → bloqueio correto
  - **Fluxo 5**: Captura de lead na landing com Turnstile ativo
  - **Fluxo 6**: Acessar `/termos` e `/privacidade` (anon + autenticado)

---

### Arquivos

**Novos:**
- `supabase/functions/submit-lead/index.ts`
- `supabase/functions/submit-lead/deno.json`
- `src/pages/legal/Terms.tsx`
- `src/pages/legal/Privacy.tsx`
- `src/components/financial/LegalDocumentsEditor.tsx`
- `docs/launch-checklist.md`
- Migration: criar `legal_documents` + RLS + seed inicial; remover policy anônima de `leads`

**Modificados:**
- `src/components/landing/LeadFormDialog.tsx` — Turnstile + chamada edge function
- `src/pages/Landing.tsx` — footer com links legais
- `src/pages/Auth.tsx` — disclaimer com links legais
- `src/pages/Financial.tsx` — nova aba "Documentos Legais"
- `src/App.tsx` — rotas `/termos` e `/privacidade`
- `package.json` — `react-markdown`, `@marsidev/react-turnstile`

**Secrets a configurar:**
- `VITE_TURNSTILE_SITE_KEY` (build secret, público)
- `TURNSTILE_SECRET_KEY` (edge function secret)

---

### Ordem

1. Migration `legal_documents` + páginas públicas + editor no Financeiro
2. Edge function `submit-lead` + integração Turnstile no LeadForm
3. Remover policy anônima de `leads` (só depois da edge function estar funcionando)
4. Checklist de testes em markdown

### Riscos

- **Turnstile sem chaves**: o usuário precisa criar conta em Cloudflare (free) e gerar par de chaves. Sem isso, captura de leads para de funcionar — vou pedir as chaves antes de remover a policy anônima.
- **Markdown injection**: `react-markdown` é seguro por padrão (escapa HTML), mas vou desabilitar `rehype-raw` para garantir.
- **LGPD**: o texto inicial dos documentos é genérico — o usuário **deve** revisar com advogado antes do go-live público. Vou deixar disclaimer no topo do editor.


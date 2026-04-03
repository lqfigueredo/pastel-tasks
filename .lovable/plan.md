

# Configurar templates de e-mail de autenticação com a identidade visual do NEVVOH

## Resumo
Criar e personalizar os templates de e-mail de autenticação (confirmação de cadastro, recuperação de senha, magic link, etc.) usando as cores e identidade visual do NEVVOH — paleta Mint & Cream, fonte Inter/DM Sans, logo e textos em PT-BR.

## Alterações

### 1. Scaffolding dos templates
Usar a ferramenta de scaffolding para gerar os 6 templates de autenticação e a edge function `auth-email-hook`.

### 2. Upload do logo para storage
Criar um bucket `email-assets` (público) e fazer upload do `src/assets/logo.png` para uso nos e-mails.

### 3. Aplicar branding em todos os templates
Personalizar os 6 templates (`signup`, `recovery`, `magic-link`, `invite`, `email-change`, `reauthentication`) com:
- **Cores**: Primary mint `hsl(168, 42%, 48%)` nos botões, foreground `hsl(200, 15%, 15%)` nos títulos, muted `hsl(200, 10%, 46%)` nos textos secundários
- **Border-radius**: `0.75rem` nos botões
- **Fonte**: `'Inter', 'DM Sans', Arial, sans-serif`
- **Logo**: Imagem do NEVVOH no topo de cada template
- **Idioma**: Todo o conteúdo em português brasileiro (ex: "Confirmar cadastro", "Redefinir senha", "Bem-vindo ao NEVVOH")
- **Fundo do body**: branco (#ffffff)

### 4. Deploy da edge function
Publicar a `auth-email-hook` para ativar os templates customizados.

## Resultado
Os e-mails de autenticação terão a identidade visual do NEVVOH e serão enviados em PT-BR assim que a verificação DNS do domínio `notify.nevvoh.com` for concluída. O progresso pode ser acompanhado em Cloud → Emails.

## Arquivos criados/modificados
- `supabase/functions/auth-email-hook/index.ts` (novo)
- `supabase/functions/auth-email-hook/deno.json` (novo)
- `supabase/functions/_shared/email-templates/*.tsx` (6 templates)


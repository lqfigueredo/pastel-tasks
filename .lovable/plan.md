## Atualizar logo em todo o sistema

Vou substituir o logo atual (SVG com chevrons em azul/branco) pelo novo PNG enviado (chevrons brancos sobre fundo roxo arredondado) em todos os locais onde aparece.

### Onde o logo é usado hoje

**App (frontend):**
- `src/assets/nevvoh-logo.svg` — importado por `AppSidebar`, `Auth`, `Landing` (header + footer), `Pricing` (header + footer), `Unsubscribe`, `legal/Privacy`, `legal/Terms`
- `public/favicon.svg` — favicon do browser
- `public/manifest.webmanifest` — ícone do PWA
- `index.html` — `<link rel="icon">` e `apple-touch-icon`

**E-mails (Supabase Edge Functions):**
- 6 templates de auth: `signup`, `magic-link`, `recovery`, `invite`, `email-change`, `reauthentication`
- 4 templates transacionais: `daily-pending-summary`, `lead-reply`, `recurring-task-reminder`, `team-invite`
- Todos referenciam `LOGO_URL = https://pzhwmxmlozmwvscndirw.supabase.co/storage/v1/object/public/email-assets/logo.png`

### Passos

1. **Hospedar o novo PNG no CDN da Lovable**
   - Rodar `lovable-assets create` a partir de `/mnt/user-uploads/Logo_em_alta_HD_a_partir_do_original.png` → gerar `src/assets/nevvoh-logo.png.asset.json`

2. **Trocar o import nos 7 arquivos do app**
   - Substituir `import logo from '@/assets/nevvoh-logo.svg'` por `import logoAsset from '@/assets/nevvoh-logo.png.asset.json'` e usar `logoAsset.url` em `src={...}`
   - Remover o `src/assets/nevvoh-logo.svg` antigo

3. **Atualizar favicon e manifest**
   - Copiar o PNG para `public/favicon.png`
   - Em `index.html`: trocar as duas tags para `href="/favicon.png" type="image/png"`
   - Em `manifest.webmanifest`: trocar o ícone para `/favicon.png` (type `image/png`)
   - Remover `public/favicon.svg`

4. **Atualizar logo dos e-mails**
   - Fazer upload do PNG para o bucket `email-assets` como `logo.png` (mesma URL já usada pelos templates — `overwrite: true`)
   - Resultado: os 10 templates passam a exibir o novo logo automaticamente, sem alterar código nem precisar redeploy das functions
   - Observação: clientes de e-mail podem manter o logo antigo em cache por algumas horas

### Fora do escopo
- Mudar a paleta de cores do app (o roxo do novo logo já se aproxima da identidade atual; não vou redesenhar o sistema de cores)
- Trocar a wordmark "Nevvoh" (continua como texto)
- Gerar variações claro/escuro do logo

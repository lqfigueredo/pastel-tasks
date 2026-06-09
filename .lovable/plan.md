## Abrir Termos e Política em modal no signup

### Novo componente `src/components/legal/LegalDocumentDialog.tsx`
- Props: `open`, `onOpenChange`, `docType: 'terms' | 'privacy'`.
- Usa `Dialog` (shadcn) com `max-w-3xl`, `max-h-[80vh]` e `ScrollArea` interna.
- Ao abrir, busca em `legal_documents` a última versão do `doc_type` no locale atual (`i18n.language`), com fallback para `pt-BR` — mesma lógica de `Terms.tsx`/`Privacy.tsx`.
- Renderiza o markdown com `ReactMarkdown` (mesmas classes `prose` já usadas).
- Estado de loading com `Loader2`; mensagem amigável se nenhuma versão publicada.
- Título do modal vem do i18n (`signup.acceptTermsLink` / `signup.acceptPrivacyLink`).
- Botão "Fechar" no rodapé.

### `src/pages/Auth.tsx`
- Trocar os dois `<Link to="/termos" target="_blank">` / `<Link to="/privacidade" target="_blank">` por `<button type="button">` que abrem o modal.
- Estado local: `legalDialog: 'terms' | 'privacy' | null`.
- Manter o checkbox e validação como estão; o clique no link **não** marca o checkbox automaticamente (continua exigindo o aceite explícito).

### Fora de escopo
- Páginas standalone `/termos` e `/privacidade` permanecem (linkadas no rodapé, SEO, acesso direto).
- Lead form, AcceptInvite e demais lugares não são alterados.

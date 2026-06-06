# Corrigir erro de carregamento da Landing

## Causa
Na rebrand anterior (Flowly → Nevvoh), o substituidor de texto atualizou os imports em 7 arquivos para `@/assets/nevvoh-logo.svg`, mas o arquivo no disco continua sendo `src/assets/flowly-logo.svg`. O Vite falha com:

```
Failed to resolve import "@/assets/nevvoh-logo.svg" from "src/pages/Landing.tsx"
```

E isso quebra qualquer rota lazy-loaded que importe o logo (Landing, Auth, Pricing, Privacy, Terms, Unsubscribe, AppSidebar).

## Mudança
- Renomear `src/assets/flowly-logo.svg` → `src/assets/nevvoh-logo.svg` (`mv`).

Nenhum outro arquivo precisa ser alterado — todos os imports já apontam para o novo nome.

## Verificação
- Pré-visualização carrega `/` (Landing) sem o erro de import.
- Sidebar, Auth e demais páginas continuam exibindo o logo.

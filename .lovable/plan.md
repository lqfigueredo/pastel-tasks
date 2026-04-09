

## Corrigir nome "simpletaskbr" para "NEVVOH" nos e-mails

### Problema
O campo `From:` dos e-mails está sendo enviado como `simpletaskbr <noreply@nevvoh.com>` em vez de `NEVVOH <noreply@nevvoh.com>`. Isso ocorre porque a constante `SITE_NAME` nos arquivos de envio ficou com o valor antigo "simpletaskbr".

### Correção

Alterar `SITE_NAME` de `"simpletaskbr"` para `"NEVVOH"` em dois arquivos:

1. **`supabase/functions/send-transactional-email/index.ts`** (linha 8)
   - `const SITE_NAME = "simpletaskbr"` → `const SITE_NAME = "NEVVOH"`

2. **`supabase/functions/auth-email-hook/index.ts`** (linha 39)
   - `const SITE_NAME = "simpletaskbr"` → `const SITE_NAME = "NEVVOH"`

Também atualizar a URL de referência no template de resumo diário:

3. **`supabase/functions/_shared/transactional-email-templates/daily-pending-summary.tsx`** (linha 18)
   - `const SITE_URL = 'https://simpletaskbr.lovable.app'` → `const SITE_URL = 'https://nevvoh.com'`

Após as edições, fazer deploy das duas Edge Functions afetadas.

### Arquivos modificados
- `supabase/functions/send-transactional-email/index.ts`
- `supabase/functions/auth-email-hook/index.ts`
- `supabase/functions/_shared/transactional-email-templates/daily-pending-summary.tsx`


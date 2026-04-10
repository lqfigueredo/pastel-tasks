

## Filtrar emails por escopo e adicionar aba no Financeiro

### O que será feito

1. **Edge Function `get-email-logs`**: Adicionar filtro por escopo do usuário
   - Se o usuário é `solution_admin`: retorna todos os emails (visão global)
   - Se o usuário é `admin`: retorna apenas emails cujos destinatários são usuários criados por ele (consultando `user_approvals.created_by_admin` para obter os `user_id`s, depois `profiles` ou `auth.users` para mapear emails)
   - Receber um parâmetro `scope` opcional (`global` ou `own`) para permitir que solution_admins também vejam apenas seus emails se desejarem

2. **Componente `EmailDashboard`**: Aceitar prop opcional `scope` para passar à Edge Function

3. **Página `Financial.tsx`**: Adicionar aba "Emails" com `<EmailDashboard />` (visão global para solution_admin)

4. **Página `Admin.tsx`**: O `EmailDashboard` já existe, mas passará `scope="own"` para filtrar apenas emails dos usuários relacionados ao admin

### Detalhes técnicos

**Edge Function — lógica de filtragem:**
- Identificar o role do usuário (admin vs solution_admin)
- Se admin (não solution_admin), buscar emails dos usuários vinculados via `user_approvals.created_by_admin = userId`, mapear `user_id` → email via profiles/auth, e filtrar `email_send_log` por `recipient_email IN (...)`
- Se solution_admin, retornar tudo (comportamento atual)

### Arquivos modificados
- `supabase/functions/get-email-logs/index.ts` — adicionar filtragem por escopo
- `src/components/admin/EmailDashboard.tsx` — aceitar prop `scope`
- `src/pages/Financial.tsx` — adicionar aba "Emails" com EmailDashboard
- `src/pages/Admin.tsx` — passar `scope="own"` ao EmailDashboard


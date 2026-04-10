

## Painel de Monitoramento de Emails

### O que será feito

Criar uma seção de monitoramento de emails na página de Administração (`/admin`), acessível apenas para solution admins. O painel mostrará todos os emails enviados pelo sistema com filtros e estatísticas.

### Funcionalidades

1. **Cards de resumo** — Total de emails, enviados, falhos e suprimidos (deduplicados por `message_id`)
2. **Filtro por período** — Últimas 24h, 7 dias, 30 dias, ou período customizado
3. **Filtro por tipo** — Dropdown com os templates disponíveis (ex: lead-reply, recurring-task-reminder)
4. **Filtro por status** — Todos, Enviados, Falhos, Suprimidos (com badges coloridos)
5. **Tabela de logs** — Uma linha por email (deduplicado por `message_id`), com colunas: Template, Destinatário, Status, Data/Hora, Erro (se houver). Paginação de 50 em 50, ordenado por mais recente

### Acesso aos dados

A tabela `email_send_log` só permite leitura via `service_role`. Para que o admin consiga consultar os dados pelo client-side, será criada uma Edge Function `get-email-logs` que faz a consulta deduplicada e retorna os resultados. Somente usuários com role `solution_admin` poderão acessar.

### Implementação

1. **Nova Edge Function `supabase/functions/get-email-logs/index.ts`**
   - Recebe filtros (período, template, status, página) via query params
   - Valida que o usuário autenticado tem role `solution_admin`
   - Consulta `email_send_log` com `DISTINCT ON (message_id)` e aplica filtros
   - Retorna dados paginados + contagens por status

2. **Novo componente `src/components/admin/EmailDashboard.tsx`**
   - Cards de estatísticas no topo
   - Filtros de período, template e status
   - Tabela paginada com badges de status coloridos
   - Busca dados via `supabase.functions.invoke('get-email-logs', ...)`

3. **Atualizar `src/pages/Admin.tsx`**
   - Adicionar aba ou seção "Emails" com o componente EmailDashboard

### Arquivos criados/modificados
- `supabase/functions/get-email-logs/index.ts` (novo)
- `src/components/admin/EmailDashboard.tsx` (novo)
- `src/pages/Admin.tsx` (adicionar seção)


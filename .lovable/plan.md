

# Licença com Validade para Admins Aprovados

## Resumo

Adicionar campo `license_expires_at` na tabela `user_approvals`. Default: 30 dias a partir da aprovação. O financeiro pode editar a data e inativar manualmente. Uma edge function agendada (cron) verifica licenças expiradas e inativa o admin + todos os usuários dos times dele.

## Banco de Dados

### Migration

```sql
-- Adicionar coluna de expiração da licença
ALTER TABLE public.user_approvals 
  ADD COLUMN license_expires_at timestamptz;
```

Sem CHECK constraint (usar validação na aplicação).

## Edge Function: `approve-user` (atualizar)

Ao aprovar, setar `license_expires_at = now() + 30 days` por padrão. Aceitar também parâmetro opcional `licenseDays` para customizar.

Adicionar nova action `deactivate` para inativar manualmente (banir admin + todos membros dos times dele). E action `update-license` para alterar a data de validade.

## Nova Edge Function: `check-expired-licenses`

Executada via cron (diariamente). Busca `user_approvals` onde `status = 'approved'` e `license_expires_at < now()`. Para cada licença expirada:
1. Banir o admin (`ban_duration: '876000h'`)
2. Buscar todos os times criados por esse admin
3. Buscar todos os membros desses times
4. Banir todos os membros
5. Atualizar status para `expired`

## Cron Job

Agendar `check-expired-licenses` para rodar diariamente via `pg_cron` + `pg_net`.

## Front-end: `Financial.tsx`

Na tabela de aprovações, para usuários aprovados:
- Mostrar coluna "Validade da Licença" com a data formatada
- Badge visual: verde se vigente, vermelho se expirada
- Botão para editar a data de validade (input date inline ou popover)
- Botão para inativar a licença manualmente
- Novo status `expired` com badge correspondente

## Arquivos

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `license_expires_at` em `user_approvals` |
| `supabase/functions/approve-user/index.ts` | Setar licença na aprovação, actions `deactivate` e `update-license` |
| `supabase/functions/check-expired-licenses/index.ts` | Nova function para expirar licenças |
| Cron job SQL (insert tool) | Agendar execução diária |
| `src/pages/Financial.tsx` | Coluna validade, edição de data, botão inativar |


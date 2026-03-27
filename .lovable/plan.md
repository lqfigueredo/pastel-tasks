

# Auto-confirmar e-mail no cadastro + botão reenviar confirmação

## Problema
A função `register-user` cria usuários com `email_confirm: false`, causando erro "Email not confirmed" no login — mesmo após aprovação financeira.

## Solução

### 1. Alterar `register-user` edge function
Mudar `email_confirm: false` para `email_confirm: true` na criação do usuário. Como já existe o fluxo de aprovação financeira (ban/unban), a confirmação de e-mail é redundante.

**Arquivo:** `supabase/functions/register-user/index.ts` — linha 39

### 2. Alterar `approve-user` edge function
Na ação `approve`, também confirmar o e-mail do usuário (caso existam usuários antigos com e-mail não confirmado):
```
email_confirm: true
```
no `updateUserById` da aprovação.

### 3. Botão "Reenviar confirmação" na página Financeiro
Adicionar um botão na tabela de aprovações pendentes que chama `approve-user` com uma nova ação `confirm-email`, que faz `updateUserById` com `email_confirm: true` para resolver casos legados.

### Resultado
- Novos cadastros já terão e-mail confirmado automaticamente
- Financeiro pode forçar confirmação de e-mail para usuários existentes


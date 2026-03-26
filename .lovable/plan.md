

# Corrigir fluxo de aprovação para auto-cadastro

## Problema

Quando um usuário se cadastra pela tela Auth (`/auth`), o `signUp` chama diretamente `supabase.auth.signUp()`. Isso cria o usuário normalmente, sem bani-lo e sem inserir um registro em `user_approvals`. Ou seja, o usuário entra no sistema imediatamente, sem passar pela aprovação do financeiro.

O fluxo de aprovação só funciona quando o **admin** cria o usuário via edge function `admin-create-user`, que faz o ban + insere o registro de aprovação pendente.

## Solução

Criar uma nova edge function `register-user` que será chamada no lugar do `supabase.auth.signUp()` na tela Auth. Essa function:

1. Cria o usuário via `auth.admin.createUser` (com `email_confirm: false` para exigir confirmação de e-mail)
2. Bane o usuário até aprovação financeira (`ban_duration: '876000h'`)
3. Insere registro em `user_approvals` com status `pending`
4. Retorna mensagem de sucesso

## Arquivos alterados

| Arquivo | Mudança |
|---|---|
| `supabase/functions/register-user/index.ts` | Nova edge function que cria usuário, bane e insere aprovação pendente |
| `src/contexts/AuthContext.tsx` | Alterar `signUp` para chamar a edge function `register-user` em vez de `supabase.auth.signUp()` |
| `src/pages/Auth.tsx` | Ajustar mensagem pós-cadastro para informar que a conta aguarda aprovação financeira |

## Detalhes técnicos

**Edge function `register-user`:**
- Não requer autenticação (usuário ainda não existe)
- Recebe `email`, `password`, `displayName`
- Usa service role para criar usuário e bani-lo
- Insere em `user_approvals` com status `pending`
- Retorna sucesso com mensagem informativa

**AuthContext `signUp`:**
- Muda de `supabase.auth.signUp()` para `supabase.functions.invoke('register-user', { body: { email, password, displayName } })`
- Retorna erro se a function falhar

**Auth.tsx:**
- Mensagem de sucesso muda de "Verifique seu e-mail" para "Conta criada! Aguarde aprovação do financeiro para acessar o sistema."


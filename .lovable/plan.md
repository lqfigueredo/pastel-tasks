

# Tela de Cadastro de Usuários Financeiros (solution_admin)

## Resumo

Criar uma página dedicada de cadastro para usuários financeiros (`solution_admin`). O formulário pede e-mail, senha e um token fixo (`445`). Ao validar o token, cria o usuário via edge function e atribui o role `solution_admin`.

## Edge Function: `register-financial-user`

Nova edge function que:
1. Recebe `{ email, password, token }`
2. Valida que `token === "445"` — rejeita se inválido
3. Usa `SUPABASE_SERVICE_ROLE_KEY` para criar o usuário com `auth.admin.createUser` (email confirmado)
4. Insere role `solution_admin` na tabela `user_roles`
5. Retorna sucesso ou erro

## Nova Página: `src/pages/FinancialRegister.tsx`

- Rota pública `/financeiro/cadastro` (fora do AppLayout)
- Card com campos: E-mail, Senha, Token de Acesso
- Valida token `445` client-side antes de enviar
- Chama a edge function `register-financial-user`
- Sucesso → toast + redireciona para `/auth`
- Link "Já tem conta? Entrar"

## Rota em `App.tsx`

Adicionar `/financeiro/cadastro` como rota pública (fora do AppLayout, junto com `/landing` e `/auth`).

## Arquivos

| Arquivo | Mudança |
|---|---|
| `supabase/functions/register-financial-user/index.ts` | Nova edge function |
| `src/pages/FinancialRegister.tsx` | Nova página de cadastro |
| `src/App.tsx` | Adicionar rota `/financeiro/cadastro` |


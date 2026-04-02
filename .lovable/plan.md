

# Melhorar tratamento de erros no cadastro de usuários (Admin)

## Problema identificado
Quando a edge function `admin-create-user` retorna um erro HTTP (ex: 400 com "Este email já está cadastrado"), o `supabase.functions.invoke` coloca o erro no objeto `error` mas `data` fica `null`. O código atual tenta ler `data?.error`, que é `null`, e exibe a mensagem genérica "Erro ao cadastrar usuário" — sem mostrar o motivo real.

O usuário Sidnei foi cadastrado com sucesso na primeira tentativa (confirmado nos logs de auth com status 200), mas ao tentar novamente recebeu o erro 422 "already registered" sem uma mensagem clara na tela.

## Solução
Ajustar o tratamento de erros em `Admin.tsx` (handleSubmit) para extrair a mensagem do corpo da resposta HTTP quando `error` é um `FunctionsHttpError`.

## Alterações

### `src/pages/Admin.tsx` — handleSubmit (linhas 124-155)
Quando `error` existe, tentar extrair o JSON do response body:

```typescript
const { data, error } = await supabase.functions.invoke('admin-create-user', {
  body: { ... },
});

if (error) {
  // Tenta extrair mensagem do corpo da resposta
  let msg = 'Erro ao cadastrar usuário';
  try {
    const errBody = await error.context?.json?.();
    if (errBody?.error) msg = errBody.error;
  } catch {
    if (data?.error) msg = data.error;
  }
  toast.error(msg);
  setSubmitting(false);
  return;
}
```

Isso garante que mensagens como "Este email já está cadastrado" ou "Time já atingiu o limite de membros" sejam exibidas corretamente ao administrador.

### Arquivos editados
- `src/pages/Admin.tsx` — apenas o bloco de tratamento de erro no handleSubmit (~5 linhas alteradas)


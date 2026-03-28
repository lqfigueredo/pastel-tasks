

# Persistir preferência de tema (claro/escuro) no banco de dados

## Problema
Atualmente o tema é salvo apenas no `localStorage`, então se o usuário trocar de dispositivo ou limpar o navegador, perde a preferência.

## Solução

### 1. Migration: adicionar coluna `theme` na tabela `profiles`
```sql
ALTER TABLE public.profiles ADD COLUMN theme text NOT NULL DEFAULT 'system';
```

### 2. Alterar `src/hooks/use-theme.tsx`
- Importar `supabase` e `useAuth`
- Ao inicializar, carregar o tema do banco (`profiles.theme`) quando o usuário estiver logado
- Ao alterar o tema (`setTheme`), salvar tanto no `localStorage` quanto no banco (`profiles.theme`)
- Manter `localStorage` como fallback para carregamento rápido (evitar flash)

Fluxo:
1. Inicializa com `localStorage` (instantâneo, sem flash)
2. Em `useEffect`, quando `user` estiver disponível, busca `profiles.theme` do banco
3. Se o valor do banco for diferente do localStorage, atualiza ambos
4. Ao trocar tema, grava no localStorage E faz `update` no banco

### Resultado
- Tema persiste entre dispositivos e sessões
- Carregamento rápido via localStorage (sem flash de tema errado)
- Sincroniza automaticamente com o banco ao fazer login


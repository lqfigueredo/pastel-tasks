

# Filtrar times na página Admin para mostrar apenas os do admin logado

## Problema
Na página Admin, ao cadastrar um novo usuário, o dropdown de "Time" mostra **todos** os times do sistema, incluindo os criados por outros admins. Isso ocorre porque a query de times não tem filtro: `supabase.from('teams').select('id, name')`.

## Solução

### Alterar a query de times em `src/pages/Admin.tsx`
Adicionar filtro `.eq('created_by', user!.id)` na consulta de times para que o admin veja apenas os times que ele criou.

Linha ~90, de:
```typescript
supabase.from('teams').select('id, name'),
```
Para:
```typescript
supabase.from('teams').select('id, name').eq('created_by', user!.id),
```

### Resultado
- Admin só vê seus próprios times no dropdown de cadastro
- Nenhuma alteração em banco de dados necessária (RLS de teams já permite que o criador veja seus times)


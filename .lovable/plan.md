

# Filtrar perfis no AssigneeSelector para mostrar apenas usuários do admin

## Problema
O `AssigneeSelector` (usado ao criar/editar tarefas) busca **todos** os perfis do sistema com `supabase.from('profiles').select(...)` sem filtro. Isso permite que um admin veja e aloque usuários que pertencem a outros admins.

## Solução

### Alterar `src/components/kanban/AssigneeSelector.tsx`
Em vez de buscar todos os perfis, filtrar apenas os usuários vinculados ao admin logado usando a tabela `user_approvals`:

1. Importar `useAuth` do contexto de autenticação
2. Buscar os `user_id`s da tabela `user_approvals` onde `created_by_admin = user.id`
3. Incluir o próprio admin na lista
4. Filtrar os perfis usando `.in('user_id', visibleUserIds)`

```typescript
// De:
supabase.from('profiles').select('user_id, display_name, avatar_url')

// Para:
// 1. Buscar user_ids vinculados ao admin
const { data: approvals } = await supabase
  .from('user_approvals')
  .select('user_id')
  .eq('created_by_admin', user.id);

const visibleIds = [...new Set([user.id, ...(approvals?.map(a => a.user_id) || [])])];

// 2. Buscar perfis filtrados
const { data } = await supabase
  .from('profiles')
  .select('user_id, display_name, avatar_url')
  .in('user_id', visibleIds);
```

### Resultado
- Admin só vê e aloca seus próprios usuários nas tarefas
- Nenhuma alteração em banco de dados necessária


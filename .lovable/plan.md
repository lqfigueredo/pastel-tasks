

## Permitir usuários comuns verem e atribuírem colegas de equipe

### Problema
O `AssigneeSelector` só mostra perfis de usuários criados pelo usuário logado (via `user_approvals.created_by_admin`). Um usuário comum criado por um admin não criou ninguém, então vê apenas a si mesmo na lista de responsáveis.

### Solução

**Arquivo: `src/components/kanban/AssigneeSelector.tsx`**

Alterar a lógica de `fetchProfiles` para também buscar membros das equipes do usuário logado:

1. Buscar `user_approvals` onde `created_by_admin = user.id` (mantém comportamento atual para admins)
2. Buscar `team_members` das equipes do usuário logado para obter os IDs dos colegas de equipe
3. Unir todos os IDs (próprio + criados + colegas de equipe) e buscar perfis

```typescript
// Além dos approvals existentes, buscar colegas de equipe:
const { data: myTeams } = await supabase
  .from('team_members')
  .select('team_id')
  .eq('user_id', user.id);

const teamIds = myTeams?.map(t => t.team_id) || [];

let teammateIds: string[] = [];
if (teamIds.length > 0) {
  const { data: teammates } = await supabase
    .from('team_members')
    .select('user_id')
    .in('team_id', teamIds);
  teammateIds = teammates?.map(t => t.user_id) || [];
}

const visibleIds = [...new Set([
  user.id,
  ...(approvals?.map(a => a.user_id) || []),
  ...teammateIds
])];
```

Isso permite que qualquer membro de equipe veja e atribua tarefas a outros membros da mesma equipe, sem alterar banco de dados ou RLS.


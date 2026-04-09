

## Limitar filtro de responsáveis ao usuário e membros da equipe

### Problema
O dropdown de filtro por responsável na tela de tarefas mostra **todos** os perfis do sistema. Deveria mostrar apenas o próprio usuário e colegas de equipe, seguindo a mesma lógica do `AssigneeSelector`.

### Solução
Não alterar o `useProfilesQuery` (usado em outros locais que precisam de todos os perfis). Em vez disso, filtrar a lista de perfis em `Index.tsx` usando os IDs visíveis — mesma lógica do `AssigneeSelector`:
1. Buscar `team_members` das equipes do usuário
2. Buscar `user_approvals` criadas pelo admin do usuário
3. Montar conjunto de IDs visíveis (próprio + colegas + criados pelo admin)
4. Filtrar os perfis do `useProfilesQuery` por esses IDs

### Implementação

**`src/pages/Index.tsx`**:
- Adicionar um `useEffect` (ou `useQuery`) que busca os IDs de `team_members` e `user_approvals` para o usuário logado (mesma lógica que já existe no `AssigneeSelector`)
- Filtrar `profiles` pelo conjunto de IDs visíveis antes de renderizar no `Select`
- Manter `useProfilesQuery` inalterado para não quebrar `TimeReport` e `TaskTimer`

### Arquivos modificados
- `src/pages/Index.tsx` — filtrar perfis visíveis no dropdown


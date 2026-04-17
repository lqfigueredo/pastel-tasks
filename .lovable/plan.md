

## Bug: Dropdown de equipes em "Nova Ideia" mostra times de outros admins

### Causa raiz
A policy RLS `"Admins can view all teams"` em `teams` libera SELECT para qualquer usuário com role `admin`. Como o `CreateIdeaDialog` faz `supabase.from('teams').select('id, name')` sem filtro, retorna todos os times do banco — incluindo "TESTE", criado por outro admin.

Esse mesmo problema existe no `EditIdeaDialog.tsx` (idêntico) e no `WorkInstructions.tsx` (lista todos os times sem filtro).

### Por que a policy existe assim
Provavelmente herança histórica do Admin panel global. Mas hoje o app é multi-tenant por `created_by_admin`/`team_id` (vide memory de admin-isolation), então essa policy quebra o isolamento.

### Correção (escopo mínimo, seguro)
Filtrar os componentes para mostrar **apenas times dos quais o usuário é membro** — usando `team_members` como fonte de verdade, exatamente como `TeamList.tsx` já faz.

**Arquivos a alterar:**
1. `src/components/ideas/CreateIdeaDialog.tsx` — buscar `team_members` do user → `teams.in('id', teamIds)`.
2. `src/components/ideas/EditIdeaDialog.tsx` — mesma mudança.
3. `src/pages/WorkInstructions.tsx` — filtrar `teams` pelos IDs em que o user é membro (não quebra render porque já mapeia via `teamMap`).

### Padrão a aplicar (consistente com `TeamList`)
```ts
const { data: memberships } = await supabase
  .from('team_members').select('team_id').eq('user_id', user.id);
const teamIds = (memberships ?? []).map(m => m.team_id);
const { data } = teamIds.length
  ? await supabase.from('teams').select('id, name').in('id', teamIds).order('name')
  : { data: [] };
setTeams(data ?? []);
```

### O que NÃO vou mexer agora
- A policy `"Admins can view all teams"` — pode ser intencional para o painel `Admin.tsx`. Removê-la sem análise pode quebrar outras telas. Trato como item separado se você quiser endurecer depois.
- `Admin.tsx` já filtra por `eq('created_by', user.id)` — está OK.
- `CreateTaskDialog.tsx` já filtra por membership — OK.

### Recomendação adicional (opcional, pós-fix)
Auditar se a policy de admin global ainda faz sentido. Pelo padrão multi-tenant atual, o correto seria: admins veem times que **eles criaram** ou dos quais são membros — não todos do sistema. Posso preparar uma migration separada se aprovar.


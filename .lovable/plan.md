

# Filtrar participantes de ata de reunião por admin

## Problema
No `CreateMeetingDialog`, a lista de participantes busca **todos** os perfis do sistema (linha 44: `supabase.from('profiles').select('user_id, display_name')`), mostrando usuários de outros admins.

O mesmo problema existe no `AddPendencyDialog`, que recebe a lista de participantes do `MeetingMinuteDetail` — mas ali os participantes já são os da reunião específica, então o problema principal está na criação.

## Solução

### Alterar `src/components/meetings/CreateMeetingDialog.tsx`
Aplicar o mesmo padrão usado no `AssigneeSelector`: buscar `user_id`s da tabela `user_approvals` onde `created_by_admin = user.id`, e filtrar os perfis por esses IDs.

De:
```typescript
supabase.from('profiles').select('user_id, display_name').then(({ data }) => {
  setProfiles((data || []).filter((p) => p.user_id !== user?.id));
});
```

Para:
```typescript
// 1. Buscar user_ids vinculados ao admin
const { data: approvals } = await supabase
  .from('user_approvals')
  .select('user_id')
  .eq('created_by_admin', user.id);

const visibleIds = (approvals || []).map(a => a.user_id).filter(id => id !== user.id);

// 2. Buscar perfis filtrados
if (visibleIds.length > 0) {
  const { data } = await supabase
    .from('profiles')
    .select('user_id, display_name')
    .in('user_id', visibleIds);
  setProfiles(data || []);
} else {
  setProfiles([]);
}
```

### Resultado
- Admin só vê seus próprios usuários cadastrados na lista de participantes ao criar uma ata
- Nenhuma alteração em banco de dados necessária


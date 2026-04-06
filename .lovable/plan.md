
## Corrigir campos de reunião no modal de Nova Tarefa

### Problema
Quando o toggle "Reunião" é ativado, os campos de seleção de ata e pendência não aparecem. O código possui os estados (`meetings`, `selectedMeetingId`, `pendencies`, `selectedPendencyId`) e a lógica de fetch, mas o bloco de JSX que renderiza esses campos foi perdido durante a refatoração dos toggles compactos.

### Solução

**Arquivo: `src/components/kanban/CreateTaskDialog.tsx`**

Adicionar um bloco condicional `{fromMeeting && (...)}` logo após o grid dos toggles (linha 238), antes do bloco `{isRecurring ? ... : ...}` (linha 240). O bloco deve conter:

1. **Select de Ata de Reunião** — dropdown com as atas carregadas, mostrando descrição e data
2. **Select de Pendência** — dropdown com as pendências da ata selecionada (carregadas via fetch ao selecionar a ata)
3. Estilizado como card com borda e fundo sutil (`rounded-lg border border-border/50 bg-muted/20 p-3`), consistente com o bloco de recorrência

A lógica de fetch de pendências ao selecionar uma ata será adicionada no `onValueChange` do select de ata:
```typescript
onValueChange={(meetingId) => {
  setSelectedMeetingId(meetingId);
  supabase.from('meeting_pendencies')
    .select('id, description')
    .eq('meeting_id', meetingId)
    .eq('is_completed', false)
    .then(({ data }) => setPendencies(data || []));
}}
```

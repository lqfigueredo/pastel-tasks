## Corrigir erro de UUID vazio ao criar tarefa sem status

### Problema
Ao submeter o formulário de nova tarefa sem um status selecionado, o app envia `status_id: ""` para o Postgres, gerando o erro `invalid input syntax for type uuid: ""`.

### Alterações em `src/components/kanban/CreateTaskDialog.tsx`

1. **Validação no `handleSubmit`**: bloquear submissão e exibir toast caso `statusId` esteja vazio (antes do `setSaving(true)`).
   ```ts
   if (!statusId) {
     toast({ title: 'Selecione um status', description: 'Escolha um status para a tarefa antes de salvar.', variant: 'destructive' });
     return;
   }
   ```

2. **Reset do status no `resetForm`**: adicionar `setStatusId('')` para evitar estado obsoleto entre aberturas do diálogo (mantendo o auto-seleção do primeiro status no `useEffect` quando o diálogo abre novamente).

3. **UX no `<Select>` de Status**:
   - Adicionar `placeholder="Selecione um status"` no `<SelectValue />`.
   - Desabilitar o `SelectTrigger` quando `statuses.length === 0`.

4. **Cobertura para tarefa recorrente**: a mesma validação atende ao fluxo `isRecurring`, pois `status_id` é compartilhado.

### Resultado
- Nenhum erro 400 do banco quando o usuário esquecer de selecionar status.
- Mensagem clara em PT-BR orientando o usuário.
- Estado de status limpo entre criações.

Posso aplicar?
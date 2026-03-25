

# Soft Delete para Status do Kanban

Adicionar coluna `deleted_at` na tabela `task_statuses` para permitir exclusão lógica (soft delete) dos status, mantendo o histórico e permitindo restauração futura.

## Mudanças

### 1. Migration — Coluna `deleted_at` em `task_statuses`

```sql
ALTER TABLE public.task_statuses ADD COLUMN deleted_at timestamptz DEFAULT NULL;
```

### 2. Ajustar queries para filtrar status ativos

| Arquivo | Alteração |
|---|---|
| `src/pages/Settings.tsx` | Ao buscar statuses, filtrar `.is('deleted_at', null)`. Na exclusão, fazer `update({ deleted_at: new Date().toISOString() })` ao invés de `delete()`. Adicionar seção colapsável "Status arquivados" com opção de restaurar (setar `deleted_at = null`). |
| `src/components/kanban/KanbanBoard.tsx` | Filtrar statuses com `.is('deleted_at', null)` na query de `task_statuses`. |
| `src/components/kanban/CreateTaskDialog.tsx` | Verificar se já filtra statuses — garantir que use apenas ativos. |
| `src/components/kanban/TaskDetailDialog.tsx` | Idem — garantir que dropdown de status mostre apenas ativos. |

### 3. Lógica de exclusão no Settings

Ao "excluir" um status:
- Setar `deleted_at = now()` no status
- Mover tarefas associadas para o status padrão (mesma lógica atual)
- Status arquivado aparece em seção separada com botão "Restaurar"

### 4. Restauração

Na seção "Status arquivados" do Settings:
- Listar status com `deleted_at IS NOT NULL`
- Botão para restaurar: `update({ deleted_at: null })`
- Status restaurado volta à última posição


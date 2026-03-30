

# Ordem personalizada das colunas do Kanban por usuário

## Problema
A tabela `task_statuses` tem um campo `position` global. Se um usuário reordenar, afeta todos. Queremos que cada usuário tenha sua própria ordem.

## Solução

### Banco de Dados — Nova tabela `user_column_order`
```sql
CREATE TABLE public.user_column_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status_ids_order uuid[] NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
```
- `status_ids_order`: array ordenado de IDs dos status, representando a ordem preferida do usuário
- RLS: cada usuário lê/escreve apenas seu próprio registro

### Frontend

#### `KanbanBoard.tsx`
- Após carregar `statuses`, buscar `user_column_order` do usuário
- Se existir, reordenar `statuses` conforme o array `status_ids_order`
- Se não existir, usar a ordem padrão (`position`)
- Expor funções `onColumnReorder(fromIdx, toIdx)` que salvam a nova ordem no banco (upsert)

#### `KanbanColumn.tsx`
- Adicionar ícone `GripVertical` no header como handle de arraste
- Header com `draggable` no handle
- Distinguir drag de coluna vs drag de card via `dataTransfer`
- Feedback visual na coluna durante drag-over

### Fluxo
1. Usuário arrasta o header de uma coluna para reposicionar
2. Nova ordem é salva em `user_column_order` (upsert)
3. Outros usuários não são afetados — cada um mantém sua ordem
4. Status novos (que não estão no array) aparecem no final

### Arquivos editados
- Nova migration (tabela + RLS)
- `src/components/kanban/KanbanBoard.tsx` — buscar/salvar ordem personalizada
- `src/components/kanban/KanbanColumn.tsx` — drag handle no header da coluna


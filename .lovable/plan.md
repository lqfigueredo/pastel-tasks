

# Log de Alterações nas Tarefas

## Resumo

Criar uma tabela de auditoria que registre automaticamente cada alteração feita em uma tarefa, incluindo campo alterado, valor anterior, valor novo, usuário e data.

## Banco de Dados

### Tabela `task_change_logs`

```sql
CREATE TABLE public.task_change_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL,
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.task_change_logs ENABLE ROW LEVEL SECURITY;
```

RLS: criador da tarefa pode visualizar; usuário autenticado pode inserir (com `user_id = auth.uid()`).

## Lógica de registro (front-end)

### `TaskDetailDialog.tsx`

No `handleSave`, antes do update, comparar cada campo com o valor original da `task` e inserir um registro para cada campo alterado:

| Campo | `field_name` |
|---|---|
| Título | `title` |
| Descrição | `description` |
| Status | `status` (salvar nome do status) |
| Data início | `start_date` |
| Data fim real | `actual_end_date` |
| Previsão entrega | `estimated_delivery_date` |

Também registrar mudanças de responsáveis (adições/remoções).

### Drag-and-drop (status change)

No `KanbanBoard.tsx` / `KanbanColumn.tsx`, ao mover card entre colunas, inserir log de mudança de status.

## UI — Seção "Histórico" no `TaskDetailDialog`

- Nova seção abaixo dos comentários com ícone `History`
- Lista cronológica mostrando: campo, valor anterior → novo, usuário e data
- Expandível/colapsável para não poluir a tela

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar `task_change_logs` + RLS |
| `TaskDetailDialog.tsx` | Lógica de diff + inserção de logs + seção "Histórico" |
| `KanbanBoard.tsx` ou `KanbanColumn.tsx` | Log ao mudar status via drag |


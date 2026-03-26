

# Vincular Task a Pendência de Ata de Reunião

## Resumo

Adicionar campo opcional nas tarefas para vincular a uma pendência de ata de reunião. O usuário pode escolher a ata (apenas as que criou) e depois selecionar a pendência específica. No card e no detalhe da tarefa, exibir apenas o texto da pendência vinculada.

## Banco de Dados

### Migration

```sql
ALTER TABLE public.tasks
  ADD COLUMN meeting_pendency_id uuid REFERENCES public.meeting_pendencies(id) ON DELETE SET NULL;
```

Sem RLS adicional — a coluna é apenas um campo na tabela `tasks` que já tem RLS.

## Front-end

### `CreateTaskDialog.tsx`

- Adicionar toggle/checkbox "Originada de reunião"
- Quando ativo, carregar atas do usuário (`meeting_minutes` where `created_by = user.id`)
- Select de ata (exibir data + descrição resumida)
- Ao selecionar ata, carregar pendências (`meeting_pendencies` where `meeting_id = ata selecionada`)
- Select de pendência (exibir texto da descrição)
- Salvar `meeting_pendency_id` no insert da task

### `TaskDetailDialog.tsx`

- Carregar dados da pendência vinculada (se `meeting_pendency_id` existir)
- Exibir seção "Origem: Reunião" com apenas o texto da pendência
- Permitir editar/remover o vínculo

### `KanbanCard.tsx`

- Se task tem `meeting_pendency_id`, exibir ícone `FileText` indicando origem de reunião

### `KanbanBoard.tsx` (interface `Task`)

- Adicionar `meeting_pendency_id: string | null` à interface

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `meeting_pendency_id` em `tasks` |
| `KanbanBoard.tsx` | Atualizar interface `Task` |
| `CreateTaskDialog.tsx` | Selects de ata e pendência |
| `TaskDetailDialog.tsx` | Exibir/editar vínculo com pendência |
| `KanbanCard.tsx` | Ícone indicador de origem |


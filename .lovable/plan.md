

# Tarefas Recorrentes com Cron Automático

## Resumo

Adicionar suporte a tarefas recorrentes (semanal, mensal, anual) usando uma edge function que roda via `pg_cron` diariamente, criando automaticamente as próximas ocorrências.

## Mudanças no Banco de Dados

### 1. Nova tabela `recurring_tasks`

Armazena o template da recorrência:

```sql
CREATE TABLE public.recurring_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status_id uuid NOT NULL,
  created_by uuid NOT NULL,
  team_id uuid,
  assignee_ids uuid[] DEFAULT '{}',
  recurrence_type text NOT NULL CHECK (recurrence_type IN ('weekly', 'monthly', 'yearly')),
  recurrence_day integer, -- dia da semana (0-6) ou dia do mês (1-31) ou dia do ano (1-365)
  next_run_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS: criador pode CRUD, mesma lógica das tasks.

### 2. Coluna opcional em `tasks`

Adicionar `recurring_task_id uuid` na tabela `tasks` para rastrear qual recorrência gerou a tarefa.

## Edge Function: `process-recurring-tasks`

- Busca `recurring_tasks` onde `next_run_date <= today` e `is_active = true`
- Para cada registro, cria uma task com os dados do template + assignees
- Calcula e atualiza `next_run_date` baseado no `recurrence_type`
- Usa service role key para bypass de RLS

## Cron Job (pg_cron)

Agenda execução diária à meia-noite via `cron.schedule`.

## UI: CreateTaskDialog

Adicionar toggle "Tarefa recorrente" no `CreateTaskDialog` com:
- Select de frequência: Semanal / Mensal / Anual
- Campo de dia (ex: "Toda segunda", "Dia 15", "15 de março")
- Quando ativado, ao submeter, insere em `recurring_tasks` em vez de (ou além de) `tasks`

## UI: Gerenciamento

Adicionar seção em Configurações ou no Kanban para listar/editar/desativar recorrências ativas.

## Arquivos Modificados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Criar tabela `recurring_tasks`, adicionar coluna `recurring_task_id` em `tasks` |
| `supabase/functions/process-recurring-tasks/index.ts` | Nova edge function |
| `src/components/kanban/CreateTaskDialog.tsx` | Adicionar campos de recorrência |
| `src/pages/Settings.tsx` | Seção para gerenciar recorrências |




## Adicionar recorrência diária + e-mail de notificação

### O que muda

1. **Novo tipo de recorrência "daily"** em todo o fluxo (UI, banco, Edge Function)
2. **E-mail de notificação** enviado aos responsáveis quando uma tarefa recorrente é criada automaticamente

### Implementação

#### 1. Migration — permitir `daily` no validator
- Atualizar a função `validate_recurrence_type()` para aceitar `'daily'` além de `weekly`, `monthly`, `yearly`

#### 2. CreateTaskDialog.tsx — opção "Diária" no select
- Adicionar `<SelectItem value="daily">Diária</SelectItem>` no select de frequência
- Tratar `daily` no cálculo de `nextRun`: próximo dia = amanhã
- Quando `recurrenceType === 'daily'`, não exibir seletor de dia (não é necessário)

#### 3. RecurringTasksSettings.tsx — exibir label "Diária"
- Atualizar `describeRecurrence` para retornar `'Diária'` quando `type === 'daily'`

#### 4. process-recurring-tasks/index.ts — suporte a daily + envio de e-mail
- Adicionar `case "daily"` no `calcNextDate`: incrementar 1 dia
- Após criar a tarefa e os assignees, buscar o e-mail dos responsáveis via `profiles` → `auth.users` (usando service role) e invocar `send-transactional-email` com template `recurring-task-reminder` para cada responsável

#### 5. Novo template de e-mail — recurring-task-reminder.tsx
- Template React Email com branding NEVVOH (mesmo estilo do lead-reply)
- Props: `taskTitle`, `userName`, `dueDate`
- Subject: "Tarefa recorrente: {taskTitle}"
- Registrar no `registry.ts`

#### 6. Deploy
- Deploy das Edge Functions `process-recurring-tasks` e `send-transactional-email`

### Arquivos modificados
- **Migration SQL** — alterar `validate_recurrence_type` para incluir `'daily'`
- `src/components/kanban/CreateTaskDialog.tsx` — opção diária + cálculo nextRun
- `src/components/settings/RecurringTasksSettings.tsx` — label "Diária"
- `supabase/functions/process-recurring-tasks/index.ts` — case daily + envio e-mail
- `supabase/functions/_shared/transactional-email-templates/recurring-task-reminder.tsx` (novo)
- `supabase/functions/_shared/transactional-email-templates/registry.ts` — registrar template




# Sistema de Notificações — Alertas de Prazos

## Visão geral
Criar um sistema de notificações internas com ícone de sino no header, mostrando alertas automáticos para:
- Tarefas com prazo de entrega (`estimated_delivery_date`) vencendo em 1 dia ou já vencidas
- Pendências de reunião (`meeting_pendencies.due_date`) vencendo em 1 dia ou já vencidas

## Arquitetura

```text
┌─────────────────────────┐
│  Edge Function (cron)   │  ← roda a cada hora via pg_cron
│  check-notifications    │
│  - busca tarefas/pend.  │
│  - insere notifications │
└──────────┬──────────────┘
           │
    ┌──────▼──────┐
    │ notifications│  ← nova tabela
    │   (Supabase) │
    └──────┬──────┘
           │ realtime
    ┌──────▼──────────────┐
    │  NotificationBell   │  ← componente no header
    │  (badge + popover)  │
    └─────────────────────┘
```

## Plano de implementação

### 1. Nova tabela `notifications`
- `id`, `user_id`, `type` (task_deadline / pendency_deadline), `title`, `message`, `reference_id` (uuid da tarefa ou pendência), `is_read` (default false), `created_at`
- RLS: usuário vê/atualiza apenas as próprias notificações
- Habilitar realtime para atualização instantânea

### 2. Edge Function `check-notifications`
- Busca tarefas com `estimated_delivery_date` = hoje ou amanhã, que não estejam finalizadas (`actual_end_date IS NULL`), e para cada assignee cria uma notificação (se não existir duplicata no mesmo dia)
- Busca `meeting_pendencies` com `due_date` = hoje ou amanhã e `is_completed = false`, cria notificação para o `responsible_user_id`
- Usa chave de idempotência (tipo + reference_id + data) para evitar duplicatas

### 3. Cron job via pg_cron
- Agenda a edge function para rodar a cada hora

### 4. Componente `NotificationBell`
- Ícone de sino no header do `AppLayout`
- Badge vermelho com contagem de não lidas
- Popover com lista de notificações
- Clique em notificação marca como lida e navega para a tarefa/ata
- Botão "Marcar todas como lidas"
- Subscription realtime para atualização sem refresh

### Arquivos editados
- Nova migration SQL (tabela `notifications` + realtime)
- `supabase/functions/check-notifications/index.ts` (nova edge function)
- `src/components/NotificationBell.tsx` (novo componente)
- `src/components/AppLayout.tsx` (adicionar sino no header)


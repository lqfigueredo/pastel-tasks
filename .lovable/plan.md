

# Sistema de Chamados de Suporte (Chat Admin ↔ Financeiro)

## Visão Geral
Criar um sistema de chamados estilo chat onde administradores abrem tickets de suporte e o perfil financeiro (solution_admin) responde. Ambos podem encerrar o chamado. Histórico completo fica registrado.

## Mudanças no Banco de Dados

### Nova tabela `support_tickets`
```sql
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',  -- open, closed
  created_by uuid NOT NULL,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Nova tabela `support_messages`
```sql
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS
- **support_tickets**: Admins veem/criam seus próprios tickets; solution_admins veem todos os tickets
- **support_messages**: Quem tem acesso ao ticket pode ler/inserir mensagens
- Realtime habilitado em `support_messages` para chat em tempo real

## Mudanças no Frontend

### 1. Novo componente `src/components/support/SupportTicketList.tsx`
- Lista de chamados com status (Aberto/Fechado), assunto, data
- Botão "Novo Chamado" (apenas para admins)
- Filtro por status
- Clique abre o chat do chamado

### 2. Novo componente `src/components/support/SupportChat.tsx`
- Interface de chat com mensagens do admin e do financeiro
- Campo de input para nova mensagem
- Botão "Encerrar Chamado" (visível para ambos os perfis)
- Mensagens em tempo real via Supabase Realtime
- Exibe nome do remetente e horário

### 3. Integrar na página Admin (`src/pages/Admin.tsx`)
- Adicionar aba/seção "Suporte" na tela de administração
- Admin vê apenas seus chamados

### 4. Integrar na página Financial (`src/pages/Financial.tsx`)
- Adicionar aba "Chamados" na tela financeira
- Solution_admin vê todos os chamados e pode responder

## Fluxo
1. Admin abre chamado com assunto e primeira mensagem
2. Solution_admin vê o chamado na tela financeira e responde
3. Conversa acontece em tempo real estilo chat
4. Qualquer um dos dois pode encerrar o chamado
5. Chamados encerrados ficam no histórico com todas as mensagens

## Detalhes Técnicos
- RLS usa `has_role` para verificar perfis
- Realtime em `support_messages` para atualização instantânea
- Trigger `update_updated_at_column` em `support_tickets`
- Mensagens renderizadas com markdown via `react-markdown` (se necessário)


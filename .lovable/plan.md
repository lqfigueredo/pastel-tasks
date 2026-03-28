

# Agenda Pessoal com Calendário e Integração com Atas de Reunião

## Visão Geral
Criar um novo módulo "Agenda" onde o usuário pode registrar compromissos e reuniões pessoais em um calendário visual, com hora, local e participantes. A agenda se integra com o módulo de Atas de Reunião, permitindo criar uma ata diretamente a partir de um evento.

## Mudanças no Banco de Dados

### Nova tabela `calendar_events`
```sql
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  created_by uuid NOT NULL,
  meeting_id uuid,          -- link opcional com meeting_minutes
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
```

### Nova tabela `calendar_event_participants`
```sql
CREATE TABLE public.calendar_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL,
  user_id uuid,
  external_name text,       -- para participantes externos
  added_at timestamptz NOT NULL DEFAULT now()
);
```

### RLS
- SELECT/INSERT/UPDATE/DELETE: `created_by = auth.uid()` (dono do evento)
- SELECT para participantes: via subquery em `calendar_event_participants`
- Participantes: INSERT/DELETE pelo criador do evento; SELECT por quem é participante

## Mudanças no Frontend

### 1. Nova página `src/pages/PersonalCalendar.tsx`
- Calendário mensal visual (reutilizando o padrão do Dashboard)
- Eventos exibidos como barras/chips nos dias correspondentes
- Clique no dia abre lista de eventos do dia
- Botão "Novo Evento" abre dialog de criação
- Filtros por período e busca por texto

### 2. Novo componente `src/components/calendar/CreateEventDialog.tsx`
- Campos: título, data, hora início/fim, local, descrição
- Seletor de participantes (filtrado pelo admin, mesmo padrão do AssigneeSelector)
- Participantes externos (mesmo padrão do CreateMeetingDialog)
- Toggle "Criar ata de reunião" — se ativado, ao salvar cria também um registro em `meeting_minutes` e vincula via `meeting_id`

### 3. Novo componente `src/components/calendar/EventDetailDialog.tsx`
- Visualização/edição do evento
- Se tem `meeting_id`, exibe link para a ata de reunião
- Botão "Criar Ata" se ainda não tem ata vinculada (cria em `meeting_minutes` e vincula)

### 4. Sidebar e rotas
- Adicionar item "Agenda" no `AppSidebar.tsx` com ícone `CalendarDays` (ou `Calendar`)
- Nova rota `/agenda` no `App.tsx`

### 5. Integração com Atas de Reunião
- No `MeetingMinuteDetail.tsx`, exibir link para o evento da agenda se existir vínculo
- No `CreateMeetingDialog.tsx`, opção de vincular a um evento existente da agenda

## Fluxo do Usuário
1. Acessa "Agenda" no menu lateral
2. Vê calendário mensal com seus eventos
3. Clica em "Novo Evento" → preenche dados (hora, local, participantes)
4. Opcionalmente marca "Criar ata de reunião" → sistema cria evento + ata vinculada
5. Ao abrir um evento existente, pode criar ata depois via botão "Criar Ata"

## Detalhes Técnicos
- Tabelas com RLS baseada em `created_by` e participação
- Filtro de participantes usando `user_approvals.created_by_admin` (mesmo padrão existente)
- `meeting_id` na tabela `calendar_events` faz o link bidirecional com `meeting_minutes`
- Trigger `update_updated_at_column` aplicado em `calendar_events`


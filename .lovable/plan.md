

# Ata de Reunião — Novo Módulo

## Resumo

Criar um módulo de Atas de Reunião acessível a todos os usuários autenticados, com visibilidade restrita: cada usuário vê apenas atas que criou ou nas quais é participante. Cada ata possui pendências com controle de conclusão.

## Banco de Dados

### Tabela `meeting_minutes`

```sql
CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;
```

RLS: SELECT/INSERT/UPDATE/DELETE — usuário é `created_by` **ou** é participante (via `meeting_participants`).

### Tabela `meeting_participants`

```sql
CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);

ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;
```

RLS: mesma lógica — criador da ata ou participante pode ver/gerenciar.

### Tabela `meeting_pendencies`

```sql
CREATE TABLE public.meeting_pendencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsible_user_id uuid NOT NULL,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_pendencies ENABLE ROW LEVEL SECURITY;
```

RLS: criador da ata ou participante pode CRUD; responsável pode marcar como concluída.

### Função auxiliar

```sql
CREATE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM meeting_participants WHERE user_id = _user_id AND meeting_id = _meeting_id
  ) OR EXISTS (
    SELECT 1 FROM meeting_minutes WHERE id = _meeting_id AND created_by = _user_id
  )
$$;
```

## UI

### Nova página `src/pages/MeetingMinutes.tsx`

- Lista de atas com data, descrição resumida e número de pendências
- Botão "Nova Ata" abre dialog de criação
- Clique na ata abre detalhe

### Nova página `src/pages/MeetingMinuteDetail.tsx`

- Cabeçalho: data da reunião, descrição, participantes (avatares)
- Seção de pendências em tabela:
  - Descrição | Responsável | Data conclusão | Status
  - Botão para marcar como encerrada → texto fica `line-through text-muted-foreground`
  - Botão "Adicionar pendência"
- Edição inline de campos

### Dialog de criação `src/components/meetings/CreateMeetingDialog.tsx`

- Campos: Data (datepicker), Participantes (multi-select de profiles), Descrição (textarea)
- Ao salvar, insere em `meeting_minutes` + `meeting_participants`

### Dialog de pendência `src/components/meetings/AddPendencyDialog.tsx`

- Campos: Descrição, Responsável (select de participantes), Data de conclusão (datepicker)

## Navegação

### `src/components/AppSidebar.tsx`

- Adicionar item "Atas de Reunião" com ícone `FileText` visível para todos (fora do bloco `isAdmin`)

### `src/App.tsx`

- Adicionar rotas `/atas` e `/atas/:meetingId`

## Arquivos

| Arquivo | Ação |
|---|---|
| Migration SQL | 3 tabelas + função + RLS |
| `src/pages/MeetingMinutes.tsx` | Nova — listagem |
| `src/pages/MeetingMinuteDetail.tsx` | Nova — detalhe |
| `src/components/meetings/CreateMeetingDialog.tsx` | Nova |
| `src/components/meetings/AddPendencyDialog.tsx` | Nova |
| `src/components/AppSidebar.tsx` | Novo item de menu |
| `src/App.tsx` | Novas rotas |


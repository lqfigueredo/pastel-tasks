

# Participantes Externos nas Atas de Reunião

## Resumo

Adicionar campo de participantes externos (nomes em texto livre) nas atas de reunião. Serão armazenados como array de texto na tabela `meeting_minutes`.

## Banco de Dados

### Migration: adicionar coluna em `meeting_minutes`

```sql
ALTER TABLE public.meeting_minutes
  ADD COLUMN external_participants text[] NOT NULL DEFAULT '{}';
```

Sem necessidade de novas tabelas ou RLS — a coluna segue as políticas já existentes da tabela.

## UI

### `CreateMeetingDialog.tsx`

- Novo campo "Participantes Externos" abaixo da lista de participantes internos
- Input de texto + botão "Adicionar" para inserir nomes um a um
- Cada nome aparece como badge removível (X para excluir)
- Salvar o array na coluna `external_participants`

### `MeetingMinuteDetail.tsx`

- Na seção "Participantes", exibir os externos após os internos
- Usar avatar com ícone diferente (ex: `UserRound`) e badge "Externo" para distinguir

### `AddPendencyDialog.tsx`

- No select de responsável, incluir os nomes externos como opções
- Quando o responsável é externo, salvar o nome no campo `responsible_user_id`? Não — melhor adicionar coluna `responsible_external_name` na tabela `meeting_pendencies`

### Migration adicional: `meeting_pendencies`

```sql
ALTER TABLE public.meeting_pendencies
  ADD COLUMN responsible_external_name text;
ALTER TABLE public.meeting_pendencies
  ALTER COLUMN responsible_user_id DROP NOT NULL;
```

Permite que uma pendência tenha **ou** `responsible_user_id` **ou** `responsible_external_name`.

## Arquivos modificados

| Arquivo | Mudança |
|---|---|
| Migration SQL | Adicionar `external_participants` em `meeting_minutes`, `responsible_external_name` em `meeting_pendencies` |
| `CreateMeetingDialog.tsx` | Campo de input para nomes externos com badges |
| `MeetingMinuteDetail.tsx` | Exibir participantes externos na seção de participantes |
| `AddPendencyDialog.tsx` | Incluir externos no select de responsável |



# Anexos nas Atas de Reunião

## Visão Geral
Adicionar suporte a upload e visualização de anexos nas atas de reunião, tanto na criação quanto na tela de detalhes. Seguir o mesmo padrão já usado em `TeamAttachments` e `TaskAttachments`.

## Banco de Dados

### Storage bucket `meeting-attachments`
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-attachments', 'meeting-attachments', false);
```
RLS no `storage.objects` para que participantes e criador possam fazer upload/download, e criador possa deletar.

### Nova tabela `meeting_attachments`
```sql
CREATE TABLE public.meeting_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```
- RLS: participantes/criador podem ver e inserir; criador e quem fez upload podem deletar

## Frontend

### 1. Novo componente `src/components/meetings/MeetingAttachments.tsx`
- Baseado no padrão de `TeamAttachments`
- Recebe `meetingId` e `canUpload` (boolean)
- Lista anexos, permite upload e download
- Criador ou quem fez upload pode excluir

### 2. Integrar na criação (`CreateMeetingDialog.tsx`)
- Após criar a ata com sucesso, permitir upload dos arquivos selecionados
- Adicionar campo de seleção de arquivos no formulário

### 3. Integrar na visualização (`MeetingMinuteDetail.tsx`)
- Adicionar um novo Card "Anexos" abaixo das pendências
- Renderizar `<MeetingAttachments meetingId={meetingId} canUpload={isCreatorOrParticipant} />`

## Arquivos editados
- Nova migration (tabela + bucket + RLS)
- `src/components/meetings/MeetingAttachments.tsx` (novo)
- `src/components/meetings/CreateMeetingDialog.tsx` (campo de anexos)
- `src/pages/MeetingMinuteDetail.tsx` (seção de anexos)

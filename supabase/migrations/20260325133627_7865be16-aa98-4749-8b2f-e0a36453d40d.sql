
-- Descrição do time
ALTER TABLE public.teams ADD COLUMN description text;

-- Tabela de anexos do time
CREATE TABLE public.team_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.team_attachments ENABLE ROW LEVEL SECURITY;

-- Membros do time podem ver anexos
CREATE POLICY "Team members can view attachments" ON public.team_attachments
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Membros podem adicionar anexos
CREATE POLICY "Team members can add attachments" ON public.team_attachments
  FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Criador do time ou quem fez upload pode deletar
CREATE POLICY "Uploader can delete attachments" ON public.team_attachments
  FOR DELETE TO authenticated
  USING (uploaded_by = auth.uid());

-- Bucket de storage
INSERT INTO storage.buckets (id, name, public) VALUES ('team-attachments', 'team-attachments', false);

CREATE POLICY "Team members can upload team attachments" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'team-attachments');

CREATE POLICY "Team members can view team attachments" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'team-attachments');

CREATE POLICY "Uploader can delete team attachments" ON storage.objects
  FOR DELETE TO authenticated USING (bucket_id = 'team-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

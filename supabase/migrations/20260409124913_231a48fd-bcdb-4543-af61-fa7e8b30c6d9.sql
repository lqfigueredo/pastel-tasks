CREATE TABLE public.knowledge_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  reference_url text,
  file_path text,
  file_name text,
  scope text NOT NULL DEFAULT 'individual',
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sources"
ON public.knowledge_sources FOR SELECT TO authenticated
USING (created_by = auth.uid() OR (scope = 'team' AND team_id IS NOT NULL AND is_team_member(auth.uid(), team_id)));

CREATE POLICY "Users can create sources"
ON public.knowledge_sources FOR INSERT TO authenticated
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update own sources"
ON public.knowledge_sources FOR UPDATE TO authenticated
USING (created_by = auth.uid());

CREATE POLICY "Users can delete own sources"
ON public.knowledge_sources FOR DELETE TO authenticated
USING (created_by = auth.uid());

CREATE TRIGGER update_knowledge_sources_updated_at
BEFORE UPDATE ON public.knowledge_sources
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public) VALUES ('knowledge-attachments', 'knowledge-attachments', false);

CREATE POLICY "Auth users can upload knowledge files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'knowledge-attachments');

CREATE POLICY "Users can view knowledge files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'knowledge-attachments');

CREATE POLICY "Uploader can delete knowledge files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'knowledge-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);
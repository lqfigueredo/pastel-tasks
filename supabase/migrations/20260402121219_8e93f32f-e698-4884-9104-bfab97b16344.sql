
-- Ideas table
CREATE TABLE public.ideas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_implemented boolean NOT NULL DEFAULT false,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ideas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own ideas" ON public.ideas
  FOR ALL TO authenticated
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Authenticated can view all ideas" ON public.ideas
  FOR SELECT TO authenticated
  USING (true);

CREATE TRIGGER update_ideas_updated_at
  BEFORE UPDATE ON public.ideas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Idea attachments table
CREATE TABLE public.idea_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id uuid NOT NULL REFERENCES public.ideas(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.idea_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view idea attachments" ON public.idea_attachments
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Uploader can manage own attachments" ON public.idea_attachments
  FOR ALL TO authenticated
  USING (uploaded_by = auth.uid())
  WITH CHECK (uploaded_by = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('idea-attachments', 'idea-attachments', false);

CREATE POLICY "Authenticated can upload idea attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'idea-attachments');

CREATE POLICY "Authenticated can view idea attachments storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'idea-attachments');

CREATE POLICY "Uploader can delete idea attachments storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'idea-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

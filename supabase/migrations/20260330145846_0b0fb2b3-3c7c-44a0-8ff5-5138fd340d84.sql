
-- Create meeting_attachments table
CREATE TABLE public.meeting_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.meeting_attachments ENABLE ROW LEVEL SECURITY;

-- Participants/creator can view
CREATE POLICY "Participant or creator can view attachments"
  ON public.meeting_attachments FOR SELECT
  TO authenticated
  USING (is_meeting_participant(auth.uid(), meeting_id));

-- Participants/creator can insert
CREATE POLICY "Participant or creator can insert attachments"
  ON public.meeting_attachments FOR INSERT
  TO authenticated
  WITH CHECK (uploaded_by = auth.uid() AND is_meeting_participant(auth.uid(), meeting_id));

-- Uploader or meeting creator can delete
CREATE POLICY "Uploader or creator can delete attachments"
  ON public.meeting_attachments FOR DELETE
  TO authenticated
  USING (
    uploaded_by = auth.uid() OR
    EXISTS (SELECT 1 FROM meeting_minutes WHERE id = meeting_attachments.meeting_id AND created_by = auth.uid())
  );

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-attachments', 'meeting-attachments', false);

-- Storage RLS: participants can upload
CREATE POLICY "Meeting participants can upload"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'meeting-attachments');

-- Storage RLS: participants can read
CREATE POLICY "Meeting participants can read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'meeting-attachments');

-- Storage RLS: owner can delete
CREATE POLICY "File owner can delete meeting attachments"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'meeting-attachments' AND (storage.foldername(name))[1] = auth.uid()::text);

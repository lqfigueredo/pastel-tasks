-- 1. Allow solution_admins to read email_send_log directly (PII access for support/audit)
CREATE POLICY "Solution admins can read email send log"
ON public.email_send_log
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));

-- 2. Add UPDATE policy on team-attachments storage bucket (consistent with INSERT/SELECT/DELETE)
CREATE POLICY "Team members can update team attachments"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'team-attachments'
  AND public.is_team_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
)
WITH CHECK (
  bucket_id = 'team-attachments'
  AND public.is_team_member(auth.uid(), ((storage.foldername(name))[1])::uuid)
);
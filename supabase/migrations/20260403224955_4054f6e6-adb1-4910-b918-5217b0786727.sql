
-- =====================================================
-- FIX 1: task-attachments - remove broad INSERT policy
-- =====================================================
DROP POLICY IF EXISTS "Authenticated users can upload attachments" ON storage.objects;

-- =====================================================
-- FIX 2: team-attachments - scope INSERT to team members
-- Path format: {user_id}/{team_id}/{uuid}.ext
-- =====================================================
DROP POLICY IF EXISTS "Team members can upload team attachments" ON storage.objects;

CREATE POLICY "Team members can upload team attachments"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'team-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND is_team_member(auth.uid(), (storage.foldername(name))[2]::uuid)
);

-- =====================================================
-- FIX 3: meeting-attachments - scope INSERT to participants
-- Path format: {user_id}/{meeting_id}/{uuid}.ext
-- =====================================================
DROP POLICY IF EXISTS "Meeting participants can upload" ON storage.objects;

CREATE POLICY "Meeting participants can upload"
ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'meeting-attachments'
  AND auth.uid()::text = (storage.foldername(name))[1]
  AND is_meeting_participant(auth.uid(), (storage.foldername(name))[2]::uuid)
);

-- =====================================================
-- FIX 4: Functions with mutable search_path
-- =====================================================
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

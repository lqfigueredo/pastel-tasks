
-- =====================================================
-- ETAPA 1 — STORAGE HARDENING
-- =====================================================

-- ----- idea-attachments -----
-- Remove the broad SELECT policy that exposed all files to any authenticated user
DROP POLICY IF EXISTS "Authenticated can view idea attachments storage" ON storage.objects;

-- Ensure strict per-owner policies exist (idempotent recreations)
DROP POLICY IF EXISTS "Idea owner can read attachments" ON storage.objects;
CREATE POLICY "Idea owner can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'idea-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Idea owner can upload attachments" ON storage.objects;
CREATE POLICY "Idea owner can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'idea-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Idea owner can delete attachments" ON storage.objects;
CREATE POLICY "Idea owner can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'idea-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ----- knowledge-attachments -----
-- Remove broad policies (anyone authenticated could read/write)
DROP POLICY IF EXISTS "Users can view knowledge files" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload knowledge files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own knowledge files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update own knowledge files" ON storage.objects;

-- Strict per-owner policies (path = {user_id}/{file})
CREATE POLICY "Knowledge owner can read files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'knowledge-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Knowledge owner can upload files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'knowledge-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Knowledge owner can update files"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'knowledge-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Knowledge owner can delete files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'knowledge-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ----- task-attachments -----
-- Frontend uploads with path = {task_id}/{filename}
-- Old policies referenced ((storage.foldername(name))[1])::uuid which only worked partially.
-- Replace with consistent rules using can_access_task on the first segment.
DROP POLICY IF EXISTS "Task members can read attachments" ON storage.objects;
DROP POLICY IF EXISTS "Task members can upload attachments" ON storage.objects;
DROP POLICY IF EXISTS "Task members can delete attachments" ON storage.objects;
DROP POLICY IF EXISTS "Task members can update attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can read task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can insert task attachments" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can delete task attachments" ON storage.objects;

CREATE POLICY "Task members can read attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Task members can upload attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'task-attachments'
  AND public.can_access_task(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "Task members can delete attachments"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'task-attachments'
  AND public.can_access_task(auth.uid(), ((storage.foldername(name))[1])::uuid)
);

-- ----- email-assets -----
-- Public bucket — keep public read via direct URL but block listing
DROP POLICY IF EXISTS "Authenticated users can list email assets" ON storage.objects;

-- =====================================================
-- ETAPA 2 — REALTIME AUTHORIZATION
-- =====================================================

-- Helper: validates whether the current user is allowed to subscribe to a realtime topic.
CREATE OR REPLACE FUNCTION public.can_access_realtime_topic(_topic text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  prefix text;
  rest text;
  uid uuid := auth.uid();
  parsed_uuid uuid;
BEGIN
  IF uid IS NULL OR _topic IS NULL THEN
    RETURN false;
  END IF;

  -- Allow Supabase system topics
  IF _topic LIKE 'realtime:%' OR _topic = 'phoenix' THEN
    RETURN true;
  END IF;

  prefix := split_part(_topic, ':', 1);
  rest   := substring(_topic from position(':' in _topic) + 1);

  IF position(':' in _topic) = 0 THEN
    RETURN false;
  END IF;

  IF prefix = 'user' THEN
    BEGIN
      parsed_uuid := rest::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN parsed_uuid = uid;
  ELSIF prefix = 'team' THEN
    BEGIN
      parsed_uuid := rest::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.is_team_member(uid, parsed_uuid);
  ELSIF prefix = 'support' THEN
    BEGIN
      parsed_uuid := rest::uuid;
    EXCEPTION WHEN others THEN
      RETURN false;
    END;
    RETURN public.has_role(uid, 'solution_admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.support_tickets WHERE id = parsed_uuid AND created_by = uid);
  END IF;

  RETURN false;
END;
$$;

-- Enable RLS on realtime.messages and add scoped policy
ALTER TABLE IF EXISTS realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can subscribe to scoped topics" ON realtime.messages;
CREATE POLICY "Authenticated can subscribe to scoped topics"
ON realtime.messages FOR SELECT TO authenticated
USING (public.can_access_realtime_topic(topic));

DROP POLICY IF EXISTS "Authenticated can broadcast to scoped topics" ON realtime.messages;
CREATE POLICY "Authenticated can broadcast to scoped topics"
ON realtime.messages FOR INSERT TO authenticated
WITH CHECK (public.can_access_realtime_topic(topic));

-- =====================================================
-- ETAPA 4 — LIMPEZA
-- =====================================================
DROP POLICY IF EXISTS "Admin can view own billing profile" ON public.billing_profiles;

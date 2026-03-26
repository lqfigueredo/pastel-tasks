
ALTER TABLE public.meeting_minutes
  ADD COLUMN external_participants text[] NOT NULL DEFAULT '{}';

ALTER TABLE public.meeting_pendencies
  ADD COLUMN responsible_external_name text;

ALTER TABLE public.meeting_pendencies
  ALTER COLUMN responsible_user_id DROP NOT NULL;

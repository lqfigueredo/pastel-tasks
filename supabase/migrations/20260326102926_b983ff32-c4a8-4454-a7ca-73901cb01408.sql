
-- Tables first
CREATE TABLE public.meeting_minutes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_date date NOT NULL,
  description text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_minutes ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meeting_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(meeting_id, user_id)
);
ALTER TABLE public.meeting_participants ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.meeting_pendencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES public.meeting_minutes(id) ON DELETE CASCADE,
  description text NOT NULL,
  responsible_user_id uuid NOT NULL,
  due_date date,
  is_completed boolean NOT NULL DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.meeting_pendencies ENABLE ROW LEVEL SECURITY;

-- Helper function (tables exist now)
CREATE OR REPLACE FUNCTION public.is_meeting_participant(_user_id uuid, _meeting_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM meeting_participants WHERE user_id = _user_id AND meeting_id = _meeting_id
  ) OR EXISTS (
    SELECT 1 FROM meeting_minutes WHERE id = _meeting_id AND created_by = _user_id
  )
$$;

-- RLS for meeting_minutes
CREATE POLICY "Creator or participant can select meetings"
  ON public.meeting_minutes FOR SELECT TO authenticated
  USING (created_by = auth.uid() OR public.is_meeting_participant(auth.uid(), id));

CREATE POLICY "Authenticated can create meetings"
  ON public.meeting_minutes FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());

CREATE POLICY "Creator can update meetings"
  ON public.meeting_minutes FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Creator can delete meetings"
  ON public.meeting_minutes FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS for meeting_participants
CREATE POLICY "Participant or creator can view participants"
  ON public.meeting_participants FOR SELECT TO authenticated
  USING (public.is_meeting_participant(auth.uid(), meeting_id));

CREATE POLICY "Creator can manage participants"
  ON public.meeting_participants FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM meeting_minutes WHERE id = meeting_id AND created_by = auth.uid()));

CREATE POLICY "Creator can delete participants"
  ON public.meeting_participants FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM meeting_minutes WHERE id = meeting_id AND created_by = auth.uid()));

-- RLS for meeting_pendencies
CREATE POLICY "Participant or creator can view pendencies"
  ON public.meeting_pendencies FOR SELECT TO authenticated
  USING (public.is_meeting_participant(auth.uid(), meeting_id));

CREATE POLICY "Participant or creator can insert pendencies"
  ON public.meeting_pendencies FOR INSERT TO authenticated
  WITH CHECK (public.is_meeting_participant(auth.uid(), meeting_id));

CREATE POLICY "Participant or creator can update pendencies"
  ON public.meeting_pendencies FOR UPDATE TO authenticated
  USING (public.is_meeting_participant(auth.uid(), meeting_id));

CREATE POLICY "Creator can delete pendencies"
  ON public.meeting_pendencies FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM meeting_minutes WHERE id = meeting_id AND created_by = auth.uid()));


-- Drop problematic policies
DROP POLICY IF EXISTS "Participants can view events" ON public.calendar_events;
DROP POLICY IF EXISTS "Event owner can manage participants" ON public.calendar_event_participants;
DROP POLICY IF EXISTS "Participants can view own participation" ON public.calendar_event_participants;

-- Create security definer function to check event ownership
CREATE OR REPLACE FUNCTION public.is_calendar_event_owner(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_events
    WHERE id = _event_id AND created_by = _user_id
  )
$$;

-- Create security definer function to check event participation
CREATE OR REPLACE FUNCTION public.is_calendar_event_participant(_event_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.calendar_event_participants
    WHERE event_id = _event_id AND user_id = _user_id
  )
$$;

-- Recreate policies using security definer functions
CREATE POLICY "Participants can view events" ON public.calendar_events
FOR SELECT TO authenticated
USING (is_calendar_event_participant(id, auth.uid()));

CREATE POLICY "Event owner can manage participants" ON public.calendar_event_participants
FOR ALL TO authenticated
USING (is_calendar_event_owner(event_id, auth.uid()))
WITH CHECK (is_calendar_event_owner(event_id, auth.uid()));

CREATE POLICY "Participants can view own participation" ON public.calendar_event_participants
FOR SELECT TO authenticated
USING (user_id = auth.uid());

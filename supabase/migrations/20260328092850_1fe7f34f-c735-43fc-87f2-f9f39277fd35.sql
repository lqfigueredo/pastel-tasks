
-- Create calendar_events table
CREATE TABLE public.calendar_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  event_date date NOT NULL,
  start_time time,
  end_time time,
  location text,
  created_by uuid NOT NULL,
  meeting_id uuid REFERENCES public.meeting_minutes(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create calendar_event_participants table
CREATE TABLE public.calendar_event_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.calendar_events(id) ON DELETE CASCADE,
  user_id uuid,
  external_name text,
  added_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calendar_event_participants ENABLE ROW LEVEL SECURITY;

-- RLS for calendar_events
CREATE POLICY "Owner can manage events" ON public.calendar_events
FOR ALL TO authenticated
USING (created_by = auth.uid())
WITH CHECK (created_by = auth.uid());

CREATE POLICY "Participants can view events" ON public.calendar_events
FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.calendar_event_participants
  WHERE event_id = calendar_events.id AND user_id = auth.uid()
));

-- RLS for calendar_event_participants
CREATE POLICY "Event owner can manage participants" ON public.calendar_event_participants
FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.calendar_events
  WHERE id = calendar_event_participants.event_id AND created_by = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.calendar_events
  WHERE id = calendar_event_participants.event_id AND created_by = auth.uid()
));

CREATE POLICY "Participants can view own participation" ON public.calendar_event_participants
FOR SELECT TO authenticated
USING (user_id = auth.uid());

-- Trigger for updated_at
CREATE TRIGGER update_calendar_events_updated_at
  BEFORE UPDATE ON public.calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

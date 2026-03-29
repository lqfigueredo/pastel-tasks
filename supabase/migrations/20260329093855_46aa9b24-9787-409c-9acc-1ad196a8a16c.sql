
-- Create support_tickets table
CREATE TABLE public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  created_by uuid NOT NULL,
  closed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create support_messages table
CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger for updated_at on support_tickets
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS for support_tickets
CREATE POLICY "Admins can create own tickets"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can view own tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (created_by = auth.uid() AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Solution admins can view all tickets"
  ON public.support_tickets FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

CREATE POLICY "Ticket owner can update own tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

CREATE POLICY "Solution admins can update all tickets"
  ON public.support_tickets FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

-- RLS for support_messages
CREATE POLICY "Users can insert messages on accessible tickets"
  ON public.support_messages FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND created_by = auth.uid())
      OR public.has_role(auth.uid(), 'solution_admin')
    )
  );

CREATE POLICY "Users can view messages on accessible tickets"
  ON public.support_messages FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND created_by = auth.uid())
    OR public.has_role(auth.uid(), 'solution_admin')
  );

-- Enable realtime for support_messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;

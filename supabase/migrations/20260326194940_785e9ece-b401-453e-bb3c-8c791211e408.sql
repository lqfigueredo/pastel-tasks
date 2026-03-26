CREATE TABLE public.user_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  requested_at timestamptz NOT NULL DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid
);

ALTER TABLE public.user_approvals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solution admins can view approvals"
  ON public.user_approvals FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

CREATE POLICY "Solution admins can update approvals"
  ON public.user_approvals FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'));

CREATE POLICY "Admins can insert approvals"
  ON public.user_approvals FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can insert approvals"
  ON public.user_approvals FOR INSERT TO service_role
  WITH CHECK (true);
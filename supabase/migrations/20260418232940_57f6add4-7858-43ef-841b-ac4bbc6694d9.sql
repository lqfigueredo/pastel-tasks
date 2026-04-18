
CREATE TABLE public.team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token text UNIQUE NOT NULL,
  email text NOT NULL,
  inviter_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  display_name text,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  accepted_user_id uuid,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_team_invites_token ON public.team_invites(token);
CREATE INDEX idx_team_invites_inviter ON public.team_invites(inviter_id);
CREATE INDEX idx_team_invites_email ON public.team_invites(lower(email));

ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviter can view own invites"
ON public.team_invites FOR SELECT
TO authenticated
USING (inviter_id = auth.uid());

CREATE POLICY "Inviter can revoke own invites"
ON public.team_invites FOR UPDATE
TO authenticated
USING (inviter_id = auth.uid())
WITH CHECK (inviter_id = auth.uid());

CREATE POLICY "Solution admins manage all invites"
ON public.team_invites FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "Service role full access invites"
ON public.team_invites FOR ALL
TO service_role
USING (true)
WITH CHECK (true);


CREATE TABLE public.user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('terms','privacy')),
  document_id uuid REFERENCES public.legal_documents(id) ON DELETE SET NULL,
  version integer,
  locale text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_user_legal_acceptances_user ON public.user_legal_acceptances(user_id);

GRANT SELECT, INSERT ON public.user_legal_acceptances TO authenticated;
GRANT ALL ON public.user_legal_acceptances TO service_role;

ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users read own acceptances"
ON public.user_legal_acceptances
FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'solution_admin'::app_role));

CREATE POLICY "users insert own acceptances"
ON public.user_legal_acceptances
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

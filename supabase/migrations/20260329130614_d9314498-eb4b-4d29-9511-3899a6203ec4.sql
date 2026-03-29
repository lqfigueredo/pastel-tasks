
CREATE TABLE public.help_texts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  page_key text NOT NULL UNIQUE,
  title text NOT NULL,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

ALTER TABLE public.help_texts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read help_texts" ON public.help_texts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Solution admins can manage help_texts" ON public.help_texts
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'solution_admin'));

CREATE TRIGGER update_help_texts_updated_at
  BEFORE UPDATE ON public.help_texts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

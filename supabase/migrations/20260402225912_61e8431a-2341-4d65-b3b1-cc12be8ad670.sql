CREATE TABLE public.admin_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_user_id uuid NOT NULL UNIQUE,
  max_users integer NOT NULL DEFAULT 10,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Solution admins can manage admin_settings"
  ON public.admin_settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'solution_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'solution_admin'));

CREATE POLICY "Admin can view own settings"
  ON public.admin_settings FOR SELECT TO authenticated
  USING (admin_user_id = auth.uid());

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
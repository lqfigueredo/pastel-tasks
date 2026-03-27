
-- Create work_instructions table
CREATE TABLE public.work_instructions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  current_file_path text NOT NULL,
  current_file_name text NOT NULL,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create work_instruction_versions table
CREATE TABLE public.work_instruction_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id uuid NOT NULL REFERENCES public.work_instructions(id) ON DELETE CASCADE,
  version_number integer NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  change_reason text NOT NULL,
  changed_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Create work_instruction_logs table
CREATE TABLE public.work_instruction_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instruction_id uuid NOT NULL REFERENCES public.work_instructions(id) ON DELETE CASCADE,
  action text NOT NULL,
  details text,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Apply updated_at trigger
CREATE TRIGGER update_work_instructions_updated_at
  BEFORE UPDATE ON public.work_instructions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.work_instructions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_instruction_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_instruction_logs ENABLE ROW LEVEL SECURITY;

-- RLS for work_instructions
CREATE POLICY "Team members can view instructions" ON public.work_instructions
  FOR SELECT TO authenticated
  USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can create instructions" ON public.work_instructions
  FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid() AND is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can update instructions" ON public.work_instructions
  FOR UPDATE TO authenticated
  USING (is_team_member(auth.uid(), team_id));

CREATE POLICY "Team members can delete instructions" ON public.work_instructions
  FOR DELETE TO authenticated
  USING (is_team_member(auth.uid(), team_id));

-- RLS for work_instruction_versions
CREATE POLICY "Team members can view versions" ON public.work_instruction_versions
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.work_instructions wi
    WHERE wi.id = instruction_id AND is_team_member(auth.uid(), wi.team_id)
  ));

CREATE POLICY "Team members can insert versions" ON public.work_instruction_versions
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.work_instructions wi
    WHERE wi.id = instruction_id AND is_team_member(auth.uid(), wi.team_id)
  ));

CREATE POLICY "Team members can delete versions" ON public.work_instruction_versions
  FOR DELETE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.work_instructions wi
    WHERE wi.id = instruction_id AND is_team_member(auth.uid(), wi.team_id)
  ));

-- RLS for work_instruction_logs
CREATE POLICY "Team members can view logs" ON public.work_instruction_logs
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.work_instructions wi
    WHERE wi.id = instruction_id AND is_team_member(auth.uid(), wi.team_id)
  ));

CREATE POLICY "Authenticated can insert logs" ON public.work_instruction_logs
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('work-instructions', 'work-instructions', false);

-- Storage RLS policies
CREATE POLICY "Team members can read work instruction files" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'work-instructions');

CREATE POLICY "Authenticated can upload work instruction files" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'work-instructions');

CREATE POLICY "Authenticated can delete work instruction files" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'work-instructions');

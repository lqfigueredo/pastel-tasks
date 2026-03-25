
-- ===========================================
-- SimpleTask Manager — Full Schema
-- ===========================================

-- 1. App role enum
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- 3. User roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- 4. Teams
CREATE TABLE public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  max_members INT NOT NULL DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Team RLS: members can see their teams
CREATE POLICY "Members can view team" ON public.teams FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members WHERE team_id = id AND user_id = auth.uid()));
CREATE POLICY "Users can create teams" ON public.teams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view team_members" ON public.team_members FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.team_members tm WHERE tm.team_id = team_members.team_id AND tm.user_id = auth.uid()));
CREATE POLICY "Team creators can manage members" ON public.team_members FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.teams WHERE id = team_members.team_id AND created_by = auth.uid()));

-- 5. Task Statuses (customizable)
CREATE TABLE public.task_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#94A3B8',
  position INT NOT NULL DEFAULT 0,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_statuses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view statuses" ON public.task_statuses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert statuses" ON public.task_statuses FOR INSERT TO authenticated WITH CHECK (true);

-- Insert default statuses
INSERT INTO public.task_statuses (name, color, position, is_default) VALUES
  ('Backlog', '#94A3B8', 0, true),
  ('Em Desenvolvimento', '#60A5FA', 1, true),
  ('Concluída', '#4ADE80', 2, true);

-- 6. Tasks
CREATE TABLE public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status_id UUID NOT NULL REFERENCES public.task_statuses(id),
  start_date DATE,
  end_date DATE,
  estimated_delivery_date DATE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tasks" ON public.tasks FOR SELECT TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Users can create tasks" ON public.tasks FOR INSERT TO authenticated
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "Users can update own tasks" ON public.tasks FOR UPDATE TO authenticated
  USING (created_by = auth.uid());
CREATE POLICY "Users can delete own tasks" ON public.tasks FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- 7. Task Assignees (multiple)
CREATE TABLE public.task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);

ALTER TABLE public.task_assignees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task owner can manage assignees" ON public.task_assignees FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_assignees.task_id AND created_by = auth.uid()));
CREATE POLICY "Assignees can view" ON public.task_assignees FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 8. Task Comments
CREATE TABLE public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id),
  content TEXT NOT NULL,
  comment_type TEXT NOT NULL DEFAULT 'normal' CHECK (comment_type IN ('normal', 'justification')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task participants can view comments" ON public.task_comments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_comments.task_id AND created_by = auth.uid()));
CREATE POLICY "Authenticated can add comments" ON public.task_comments FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 9. Delivery Date Logs
CREATE TABLE public.delivery_date_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  old_date DATE,
  new_date DATE,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.delivery_date_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task owner can view logs" ON public.delivery_date_logs FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = delivery_date_logs.task_id AND created_by = auth.uid()));
CREATE POLICY "Authenticated can insert logs" ON public.delivery_date_logs FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = changed_by);

-- 10. Task Attachments
CREATE TABLE public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_type TEXT NOT NULL,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Task owner can manage attachments" ON public.task_attachments FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tasks WHERE id = task_attachments.task_id AND created_by = auth.uid()));

-- 11. Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('task-attachments', 'task-attachments', false);

CREATE POLICY "Users can upload attachments" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "Users can view own attachments" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'task-attachments' AND auth.uid()::text = (storage.foldername(name))[1]);

-- 12. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''));
  
  -- Assign default 'user' role
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

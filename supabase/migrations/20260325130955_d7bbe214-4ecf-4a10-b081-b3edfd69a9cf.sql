
-- Create a security definer function to check team membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_team_member(_user_id uuid, _team_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.team_members
    WHERE user_id = _user_id AND team_id = _team_id
  )
$$;

-- Create a function to get user's team IDs
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id
$$;

-- Drop problematic policies on teams
DROP POLICY IF EXISTS "Members can view team" ON public.teams;

-- Recreate using the security definer function
CREATE POLICY "Members can view team" ON public.teams
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Drop problematic policies on team_members
DROP POLICY IF EXISTS "Members can view team_members" ON public.team_members;
DROP POLICY IF EXISTS "Team creators can manage members" ON public.team_members;

-- Recreate team_members SELECT policy without self-reference
CREATE POLICY "Members can view team_members" ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Recreate team creators manage policy without referencing teams table via RLS
CREATE POLICY "Team creators can manage members" ON public.team_members
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.teams t
      WHERE t.id = team_members.team_id AND t.created_by = auth.uid()
    )
  );

-- Fix tasks policy that references team_members
DROP POLICY IF EXISTS "Team members can view team tasks" ON public.tasks;
CREATE POLICY "Team members can view team tasks" ON public.tasks
  FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

-- Fix task_assignees if it references team_members indirectly via tasks
-- (these are fine as they reference tasks, not team_members directly)

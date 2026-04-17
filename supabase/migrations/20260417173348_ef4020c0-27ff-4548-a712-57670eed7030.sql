
-- 1. task_statuses: remover policy global insegura
DROP POLICY IF EXISTS "All users can view global statuses" ON public.task_statuses;

-- A policy "Users can view own or default statuses" já existe e cobre o caso correto:
-- (created_by = auth.uid()) OR (team_id IS NOT NULL AND is_team_member) OR (is_default = true)

-- Adicionar acesso de solution_admin para visualizar todos os status
CREATE POLICY "Solution admins can view all statuses"
ON public.task_statuses
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));

-- 2. teams: remover policy que dava acesso global a todos os admins
DROP POLICY IF EXISTS "Admins can view all teams" ON public.teams;

-- Adicionar acesso global apenas para solution_admin
CREATE POLICY "Solution admins can view all teams"
ON public.teams
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));

-- 3. profiles: restringir SELECT a self + colegas de time + solution_admin
-- Função SECURITY DEFINER para evitar recursão
CREATE OR REPLACE FUNCTION public.can_view_profile(_viewer_id uuid, _target_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    _viewer_id = _target_id
    OR has_role(_viewer_id, 'solution_admin'::app_role)
    OR EXISTS (
      SELECT 1
      FROM public.team_members tm1
      JOIN public.team_members tm2 ON tm1.team_id = tm2.team_id
      WHERE tm1.user_id = _viewer_id AND tm2.user_id = _target_id
    )
    OR EXISTS (
      -- Permite visualizar perfis de pessoas que criaram tarefas em times do viewer
      -- ou que estão atribuídas a tarefas que o viewer pode acessar
      SELECT 1 FROM public.tasks t
      WHERE t.created_by = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
    OR EXISTS (
      SELECT 1 FROM public.task_assignees ta
      JOIN public.tasks t ON t.id = ta.task_id
      WHERE ta.user_id = _target_id
        AND (t.created_by = _viewer_id
             OR is_task_assignee(t.id, _viewer_id)
             OR (t.team_id IS NOT NULL AND is_team_member(_viewer_id, t.team_id)))
    )
$$;

DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

CREATE POLICY "Users can view related profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(auth.uid(), user_id));

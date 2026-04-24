CREATE OR REPLACE FUNCTION public.get_visible_user_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT _user_id
  UNION
  SELECT user_id FROM public.user_approvals WHERE created_by_admin = _user_id
  UNION
  SELECT tm2.user_id
  FROM public.team_members tm1
  JOIN public.team_members tm2 ON tm2.team_id = tm1.team_id
  WHERE tm1.user_id = _user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_visible_user_ids(uuid) TO authenticated;
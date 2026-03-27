
-- 1. Add created_by column
ALTER TABLE public.task_statuses ADD COLUMN created_by uuid;

-- 2. Assign existing statuses to correct admins
UPDATE public.task_statuses SET created_by = 'f1c5f326-3229-4470-ada5-2a29f0282b70' 
WHERE id IN ('74431d84-4592-4f4a-9bc4-f2e4632f313b', '7d705bbd-b15f-4a12-a8f5-49d287cab243', 'ad7243eb-1903-4928-8fc2-ab54ae8937e9');

UPDATE public.task_statuses SET created_by = 'dbeaf7f0-4a95-4e0e-a6fd-c3d7fb555068'
WHERE id = '96f46454-e425-4fe5-978b-f1ab6cc73d4f';

-- 3. Update SELECT RLS policy
DROP POLICY IF EXISTS "Anyone authenticated can view statuses" ON public.task_statuses;
CREATE POLICY "Users can view own or default statuses" ON public.task_statuses
FOR SELECT TO authenticated
USING (
  (created_by = auth.uid())
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  OR (is_default = true)
);

-- 4. Update INSERT policy
DROP POLICY IF EXISTS "Team members can insert statuses" ON public.task_statuses;
CREATE POLICY "Users can insert statuses" ON public.task_statuses
FOR INSERT TO authenticated
WITH CHECK (
  (created_by = auth.uid()) AND (
    (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
    OR (team_id IS NULL AND has_role(auth.uid(), 'admin'::app_role))
  )
);

-- 5. Update UPDATE policy
DROP POLICY IF EXISTS "Team members can update statuses" ON public.task_statuses;
CREATE POLICY "Users can update own statuses" ON public.task_statuses
FOR UPDATE TO authenticated
USING (
  (created_by = auth.uid())
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
)
WITH CHECK (
  (created_by = auth.uid())
  OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
);

-- 6. Update DELETE policy
DROP POLICY IF EXISTS "Team members can delete statuses" ON public.task_statuses;
CREATE POLICY "Users can delete own statuses" ON public.task_statuses
FOR DELETE TO authenticated
USING (
  (is_default = false) AND (
    (created_by = auth.uid())
    OR (team_id IS NOT NULL AND is_team_member(auth.uid(), team_id))
  )
);

-- Saneamento: colunas órfãs (team_id NULL e não-default) recebem o time do criador
-- quando o criador pertence a exatamente UM time.
WITH single_team_members AS (
  SELECT user_id, (array_agg(team_id))[1] AS team_id
  FROM public.team_members
  GROUP BY user_id
  HAVING COUNT(*) = 1
)
UPDATE public.task_statuses ts
SET team_id = stm.team_id
FROM single_team_members stm
WHERE ts.created_by = stm.user_id
  AND ts.team_id IS NULL
  AND ts.is_default = false
  AND ts.deleted_at IS NULL;
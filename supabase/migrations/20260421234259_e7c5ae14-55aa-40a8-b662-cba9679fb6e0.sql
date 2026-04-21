-- 1) Add token_hash column for hashed lookups
ALTER TABLE public.team_invites
  ADD COLUMN IF NOT EXISTS token_hash text;

-- 2) Backfill: hash any existing plaintext tokens so live invites keep working
UPDATE public.team_invites
SET token_hash = encode(digest(token, 'sha256'), 'hex')
WHERE token_hash IS NULL AND token IS NOT NULL;

-- 3) Invalidate any stragglers without a hash (paranoid safety)
UPDATE public.team_invites
SET revoked_at = COALESCE(revoked_at, now())
WHERE token_hash IS NULL AND accepted_at IS NULL;

-- 4) Enforce hash presence + uniqueness, drop plaintext token column
ALTER TABLE public.team_invites
  ALTER COLUMN token_hash SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS team_invites_token_hash_key
  ON public.team_invites (token_hash);

ALTER TABLE public.team_invites
  DROP COLUMN IF EXISTS token;

-- 5) Tighten RLS — explicitly scope SELECT to the inviter only and exclude any
--    legacy permissive policies. (Existing policies already restrict to inviter,
--    but we re-create them defensively without the token column reference.)
DROP POLICY IF EXISTS "Inviter can view own invites" ON public.team_invites;
CREATE POLICY "Inviter can view own invites"
ON public.team_invites
FOR SELECT
TO authenticated
USING (inviter_id = auth.uid());

-- Solution admins keep full visibility for support
DROP POLICY IF EXISTS "Solution admins can view all invites" ON public.team_invites;
CREATE POLICY "Solution admins can view all invites"
ON public.team_invites
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role));
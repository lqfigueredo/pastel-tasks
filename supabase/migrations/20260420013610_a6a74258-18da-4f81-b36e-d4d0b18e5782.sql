ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS onboarding_completed_at timestamptz NULL;

-- Backfill existing profiles so they don't see the wizard
UPDATE public.profiles SET onboarding_completed_at = created_at WHERE onboarding_completed_at IS NULL;
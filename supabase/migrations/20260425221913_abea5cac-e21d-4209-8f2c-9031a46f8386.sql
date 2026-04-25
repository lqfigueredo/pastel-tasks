ALTER TABLE public.profiles
ADD COLUMN locale text NOT NULL DEFAULT 'pt-BR'
CHECK (locale IN ('pt-BR', 'en'));
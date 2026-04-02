
ALTER TABLE public.ideas ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

CREATE INDEX idx_ideas_team_id ON public.ideas(team_id);

CREATE TABLE public.kanban_saved_filters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.kanban_saved_filters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own saved filters"
ON public.kanban_saved_filters
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own saved filters"
ON public.kanban_saved_filters
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own saved filters"
ON public.kanban_saved_filters
FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can delete own saved filters"
ON public.kanban_saved_filters
FOR DELETE
TO authenticated
USING (user_id = auth.uid());

CREATE TRIGGER update_kanban_saved_filters_updated_at
BEFORE UPDATE ON public.kanban_saved_filters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_kanban_saved_filters_user_id ON public.kanban_saved_filters(user_id);
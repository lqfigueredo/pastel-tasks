-- Enable full row replication for realtime
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.task_assignees REPLICA IDENTITY FULL;

-- Add tables to realtime publication (idempotent guard)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.task_assignees;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
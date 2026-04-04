ALTER TABLE public.leads
ADD COLUMN replied_at timestamp with time zone DEFAULT NULL,
ADD COLUMN reply_message text DEFAULT NULL;

CREATE POLICY "Solution admins can update leads"
ON public.leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'solution_admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'solution_admin'::app_role));

-- Remove a policy anônima — agora só a edge function submit-lead (service role) insere leads
DROP POLICY IF EXISTS "Anyone can insert leads" ON public.leads;
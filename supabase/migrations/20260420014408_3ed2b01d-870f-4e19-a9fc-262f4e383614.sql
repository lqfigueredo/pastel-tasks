-- Permite que visitantes não autenticados vejam planos ativos (para a página pública de preços)
CREATE POLICY "Anonymous can view active plans"
ON public.plans
FOR SELECT
TO anon
USING (is_active = true);
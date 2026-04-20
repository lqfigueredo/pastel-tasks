-- M5: Restringir listagem do bucket email-assets
-- Bucket continua público (URLs /object/public/... funcionam sem RLS).
-- Removemos a policy SELECT anônima para evitar enumeração via API list.
-- Apenas usuários autenticados podem listar arquivos via SDK.

DROP POLICY IF EXISTS "Email assets are publicly accessible" ON storage.objects;

CREATE POLICY "Authenticated users can list email assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'email-assets');
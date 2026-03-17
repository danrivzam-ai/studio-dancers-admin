-- =============================================
-- Verificar y corregir políticas del bucket 'avatars'
-- El portal Mi Studio usa anon (sin Supabase Auth),
-- necesitamos que anon pueda subir/actualizar fotos.
-- =============================================

-- 1. Ver políticas actuales del bucket avatars
SELECT
  policyname,
  cmd,
  roles,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (qual LIKE '%avatars%' OR with_check LIKE '%avatars%')
ORDER BY policyname;

-- 2. Recrear políticas para garantizar acceso anon
-- (Si ya existen con nombre diferente, esto las agrega sin conflicto)

-- Lectura pública (cualquiera puede ver avatares)
DROP POLICY IF EXISTS "avatars_public_read"   ON storage.objects;
DROP POLICY IF EXISTS "avatars_upload"         ON storage.objects;
DROP POLICY IF EXISTS "avatars_update"         ON storage.objects;
DROP POLICY IF EXISTS "Allow public read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow anon upload avatars" ON storage.objects;

CREATE POLICY "avatars_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

CREATE POLICY "avatars_anon_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'avatars');

CREATE POLICY "avatars_anon_update" ON storage.objects
  FOR UPDATE USING (bucket_id = 'avatars')
  WITH CHECK (bucket_id = 'avatars');

-- 3. Confirmar resultado
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
  AND (qual LIKE '%avatars%' OR with_check LIKE '%avatars%')
ORDER BY policyname;

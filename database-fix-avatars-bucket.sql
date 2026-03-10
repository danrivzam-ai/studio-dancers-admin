-- =============================================
-- Studio Dancers — Fix: Crear bucket 'avatars'
-- El portal Mi Studio permite subir foto de perfil,
-- pero el bucket nunca fue creado. Ejecutar en Supabase SQL Editor.
-- =============================================

-- 1. Crear bucket público 'avatars'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  2097152,  -- 2 MB máximo
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 2097152,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

-- 2. Políticas de storage para 'avatars'
DO $$
BEGIN
  -- Lectura pública (cualquiera puede ver avatares)
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'avatars_public_read' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "avatars_public_read" ON storage.objects
        FOR SELECT USING (bucket_id = 'avatars')
    $policy$;
  END IF;

  -- Upload: cualquier usuario autenticado o anónimo puede subir su avatar
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'avatars_upload' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "avatars_upload" ON storage.objects
        FOR INSERT WITH CHECK (bucket_id = 'avatars')
    $policy$;
  END IF;

  -- Update (upsert): permite reemplazar foto existente
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'avatars_update' AND tablename = 'objects'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "avatars_update" ON storage.objects
        FOR UPDATE USING (bucket_id = 'avatars')
    $policy$;
  END IF;
END $$;

-- 3. Verificación
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'avatars';

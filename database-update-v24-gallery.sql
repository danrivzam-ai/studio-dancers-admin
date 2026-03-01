-- ═══════════════════════════════════════════════════════════
-- Migración v24: Galería de fotos del estudio
-- Ejecutar en Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- 1. Tabla de fotos
CREATE TABLE IF NOT EXISTS gallery_photos (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  storage_path TEXT NOT NULL,
  caption      TEXT,
  display_order INTEGER DEFAULT 0,
  active       BOOLEAN DEFAULT true,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Índice para ordenamiento rápido
CREATE INDEX IF NOT EXISTS idx_gallery_order
  ON gallery_photos(display_order ASC, created_at DESC)
  WHERE active = true;

-- 3. RLS
ALTER TABLE gallery_photos ENABLE ROW LEVEL SECURITY;

-- Lectura pública (portal landing puede leer sin autenticar)
DROP POLICY IF EXISTS "gallery_public_read" ON gallery_photos;
CREATE POLICY "gallery_public_read"
  ON gallery_photos FOR SELECT
  USING (active = true);

-- Escritura solo para usuarios autenticados (admin)
DROP POLICY IF EXISTS "gallery_auth_write" ON gallery_photos;
CREATE POLICY "gallery_auth_write"
  ON gallery_photos FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- ═══════════════════════════════════════════════════════════
-- INSTRUCCIONES MANUALES (Supabase Dashboard):
--
-- 1. Ir a Storage → New bucket
--    Name: gallery
--    Public: ✅ (marcar como público)
--
-- 2. En el bucket "gallery", agregar políticas:
--    - SELECT: bucket_id = 'gallery'  → allow all (público)
--    - INSERT: auth.role() = 'authenticated'
--    - DELETE: auth.role() = 'authenticated'
-- ═══════════════════════════════════════════════════════════

-- ============================================
-- v28: Rol Contadora + Panel Contabilidad
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- 1. Actualizar constraint de roles para incluir 'contador'
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS valid_role;
ALTER TABLE user_roles ADD CONSTRAINT valid_role
  CHECK (role IN ('admin', 'receptionist', 'viewer', 'supervisor', 'contador'));

-- 2. Columna legal_name en school_settings (si no existe)
ALTER TABLE school_settings ADD COLUMN IF NOT EXISTS legal_name TEXT;

-- 3. Actualizar datos de la empresa
-- Descomenta y ajusta según corresponda:
-- UPDATE school_settings SET
--   legal_name = 'ADLAB STUDIO S.A.S.',
--   ruc = '0993406931001'
-- WHERE id = (SELECT id FROM school_settings LIMIT 1);

-- 4. Cómo agregar la cuenta de la contadora:
--    Primero la persona debe crear su cuenta en el portal (o tú le creas una)
--    Luego ejecuta este INSERT para asignarle el rol contador:
--
-- INSERT INTO user_roles (email, role, display_name)
-- VALUES ('contadora@ejemplo.com', 'contador', 'Contadora')
-- ON CONFLICT (email) DO UPDATE SET role = 'contador', display_name = 'Contadora';

-- 5. Verificar roles actuales
SELECT email, role, display_name, created_at FROM user_roles ORDER BY created_at;

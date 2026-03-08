-- ============================================================
-- v25 — Email de instructoras + segmento MailerLite para instructoras
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar campo email a la tabla instructors (idempotente)
ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Índice para búsqueda rápida por email (opcional pero útil)
CREATE INDEX IF NOT EXISTS idx_instructors_email
  ON instructors (email)
  WHERE email IS NOT NULL;

-- 2. Agregar columna mailerlite_instructors_group_id en school_settings
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS mailerlite_instructors_group_id TEXT DEFAULT '';

-- Verificar resultados
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('instructors', 'school_settings')
  AND column_name IN ('email', 'mailerlite_instructors_group_id')
ORDER BY table_name, column_name;

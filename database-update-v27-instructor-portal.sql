-- ============================================================
-- v27 — Portal de instructoras: must_change_password
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- Agregar columna must_change_password a instructors (idempotente)
ALTER TABLE instructors
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT true;

-- Las instructoras ya existentes sin contraseña temporal no necesitan cambio obligatorio.
-- Si quieres que todas las actuales también cambien al ingresar, deja DEFAULT true.
-- Si quieres que solo las nuevas lo hagan, ejecuta esto (opcional):
-- UPDATE instructors SET must_change_password = false WHERE must_change_password = true;

-- Verificar resultado
SELECT id, name, email, active, must_change_password
FROM instructors
ORDER BY name;

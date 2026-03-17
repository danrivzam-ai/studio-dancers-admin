-- ═══════════════════════════════════════════════════════════════
-- Demo Instructora — Studio Dancers
-- Ejecutar en: Supabase → SQL Editor
--
-- Credenciales de acceso a la PWA de Instructoras:
--   Cédula   : 0000000001
--   Contraseña: demo2026
--
-- Cursos asignados: todos los cursos de niñas y Dance Camp.
-- La contraseña se almacena en texto plano; la app la convierte
-- a bcrypt automáticamente en el primer inicio de sesión.
-- ═══════════════════════════════════════════════════════════════

-- ── 1. Crear la instructora demo ──────────────────────────────
INSERT INTO instructors (
  id,
  name,
  cedula,
  password,
  active,
  must_change_password,
  failed_attempts,
  locked_until
)
VALUES (
  'a0000000-0000-0000-0000-000000000001',   -- UUID fijo para poder referenciar
  'Demo Instructora',
  '0000000001',
  'demo2026',                               -- texto plano → se hashea a bcrypt en primer login
  true,
  false,                                    -- false = entra directo sin cambiar contraseña
  0,
  null
)
ON CONFLICT (cedula) DO UPDATE
  SET name                 = EXCLUDED.name,
      password             = EXCLUDED.password,
      active               = EXCLUDED.active,
      must_change_password = EXCLUDED.must_change_password,
      failed_attempts      = 0,
      locked_until         = null;


-- ── 2. Asignar cursos de niñas y Dance Camp ───────────────────
-- (course_id = id del array ALL_COURSES en courses.js)

INSERT INTO instructor_courses (instructor_id, course_id)
VALUES
  ('a0000000-0000-0000-0000-000000000001', 'program-1771900890659'),  -- Sábados - Baby Ballet
  ('a0000000-0000-0000-0000-000000000001', 'sabados-avanzado'),        -- Sábados Intensivos - Dance Crew
  ('a0000000-0000-0000-0000-000000000001', 'camp-baby'),              -- Dance Camp - Baby Ballet
  ('a0000000-0000-0000-0000-000000000001', 'camp-kids'),              -- Dance Camp - Grupo KIDS
  ('a0000000-0000-0000-0000-000000000001', 'camp-teens')              -- Dance Camp - Grupo TEENS
ON CONFLICT DO NOTHING;


-- ── Verificación (opcional) ────────────────────────────────────
-- SELECT i.name, i.cedula, i.active, array_agg(ic.course_id) AS cursos
-- FROM instructors i
-- LEFT JOIN instructor_courses ic ON ic.instructor_id = i.id
-- WHERE i.cedula = '0000000001'
-- GROUP BY i.id, i.name, i.cedula, i.active;


-- ═══════════════════════════════════════════════════════════════
-- Para ELIMINAR la demo (limpieza):
--
-- DELETE FROM instructor_courses
--   WHERE instructor_id = 'a0000000-0000-0000-0000-000000000001';
-- DELETE FROM instructors
--   WHERE id = 'a0000000-0000-0000-0000-000000000001';
-- ═══════════════════════════════════════════════════════════════

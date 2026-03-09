-- ============================================================
-- v29 — Horario personalizado por instructora
-- ============================================================
-- Permite registrar bloques de clase individuales por instructora:
-- día de la semana, hora inicio/fin, nombre del grupo y curso.
--
-- Soluciona el problema: una instructora asignada a un curso con
-- 3 días de clase veía los 3 días aunque solo imparte 1 o 2.
-- Con esta tabla, el admin registra exactamente qué días y horas
-- da clase cada instructora, y el portal lo muestra personalizado.
-- ============================================================

CREATE TABLE IF NOT EXISTS instructor_schedule (
  id            UUID     PRIMARY KEY DEFAULT gen_random_uuid(),
  instructor_id UUID     NOT NULL REFERENCES instructors(id) ON DELETE CASCADE,
  course_id     TEXT,                          -- ID o código del curso (opcional)
  day_of_week   SMALLINT NOT NULL              -- 1=Lunes … 7=Domingo
                CHECK (day_of_week BETWEEN 1 AND 7),
  time_start    TIME     NOT NULL,             -- ej: '16:00'
  time_end      TIME     NOT NULL,             -- ej: '17:30'
  group_name    TEXT     NOT NULL DEFAULT '',  -- ej: 'Dance Kids', 'Teens', 'Ballet'
  notes         TEXT,                          -- notas opcionales visibles en el portal
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para cargar el horario de una instructora rápidamente
CREATE INDEX IF NOT EXISTS idx_instructor_schedule_lookup
  ON instructor_schedule (instructor_id, day_of_week, time_start);

-- RLS: solo usuarios autenticados (admin/receptionist)
ALTER TABLE instructor_schedule ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'instructor_schedule'
      AND policyname = 'instructor_schedule_admin_all'
  ) THEN
    CREATE POLICY "instructor_schedule_admin_all"
      ON instructor_schedule FOR ALL TO authenticated
      USING (true) WITH CHECK (true);
  END IF;
END $$;

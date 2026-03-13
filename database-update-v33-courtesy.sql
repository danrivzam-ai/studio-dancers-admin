-- ============================================================
-- v33: Campos de cortesía en students
-- Permite registrar alumnos como cortesía (influencers, VIPs, invitados)
-- que acceden al portal sin generar registros financieros.
-- ============================================================

-- 1. Bandera de cortesía
ALTER TABLE students ADD COLUMN IF NOT EXISTS is_courtesy BOOLEAN DEFAULT false;

-- 2. Categoría de cortesía
DO $$ BEGIN
  ALTER TABLE students ADD COLUMN courtesy_category TEXT;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE students ADD CONSTRAINT chk_courtesy_category
    CHECK (courtesy_category IN ('influencer', 'vip', 'invitado'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Fecha de fin de acceso (NULL = indefinido)
ALTER TABLE students ADD COLUMN IF NOT EXISTS courtesy_end_date DATE;

-- 4. Índice para filtrar cortesías rápidamente
CREATE INDEX IF NOT EXISTS idx_students_courtesy ON students(is_courtesy) WHERE is_courtesy = true;

-- ============================================================================
-- Migración v37 — Ciclo escolar opcional en cursos
-- ============================================================================
-- Permite definir un curso con fecha de inicio y fin del ciclo escolar.
-- Cuando hoy > ciclo_fin, el sistema deja de pedir cobros automáticos
-- (la alumna no aparece en mora; aparece como "Ciclo finalizado").
--
-- Caso de uso: Programa Formativo de marzo a enero. Se cobran las cuotas
-- mensuales rolling, pero cuando llega febrero ya no se espera más cobro.
--
-- IDEMPOTENTE: usa IF NOT EXISTS.
-- ============================================================================

DO $$
BEGIN
  -- ciclo_inicio
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='courses' AND column_name='ciclo_inicio'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN ciclo_inicio DATE NULL;
    COMMENT ON COLUMN public.courses.ciclo_inicio IS
      'Fecha de inicio del ciclo escolar. NULL = sin ciclo definido (curso open-ended).';
  END IF;

  -- ciclo_fin
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='courses' AND column_name='ciclo_fin'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN ciclo_fin DATE NULL;
    COMMENT ON COLUMN public.courses.ciclo_fin IS
      'Fecha de fin del ciclo escolar. NULL = sin ciclo definido. Si hoy > ciclo_fin, los alumnos no aparecen en mora.';
  END IF;
END$$;

-- Verificación
DO $$
DECLARE
  v_cols INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cols
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='courses'
    AND column_name IN ('ciclo_inicio', 'ciclo_fin');

  IF v_cols = 2 THEN
    RAISE NOTICE 'Migración v37 OK — ciclo_inicio + ciclo_fin agregados';
  ELSE
    RAISE EXCEPTION 'Migración v37 INCOMPLETA — solo % de 2 columnas existen', v_cols;
  END IF;
END$$;

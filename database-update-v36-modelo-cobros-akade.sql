-- ============================================================================
-- Migración v36 — Modelo de cobros Akadé portado a Studio Dancers
-- ============================================================================
-- Agrega soporte para "mes rolling" (vence X tiempo desde el pago) y
-- vigencias múltiples (semanal/quincenal/mensual/trimestral/semestral/anual).
--
-- Hoy SDA soporta solo: mes-día-fijo, paquete, programa.
-- Después de esta migración: + mes rolling + vigencia variable.
--
-- Es IDEMPOTENTE (usa IF NOT EXISTS) — segura de correr múltiples veces.
-- No toca datos existentes, solo agrega columnas con DEFAULT seguro.
-- ============================================================================

-- 1. Campos nuevos en courses
DO $$
BEGIN
  -- renovacion_rolling
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='courses' AND column_name='renovacion_rolling'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN renovacion_rolling BOOLEAN NOT NULL DEFAULT false;
    COMMENT ON COLUMN public.courses.renovacion_rolling IS
      'true = vence X tiempo desde el pago (rolling, ej: alumno entra 15jun, próximo cobro 15jul). false = día fijo del mes (escuela tradicional, todos cobran el día 5).';
  END IF;

  -- vigencia_meses
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='courses' AND column_name='vigencia_meses'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN vigencia_meses INTEGER NOT NULL DEFAULT 1;
    COMMENT ON COLUMN public.courses.vigencia_meses IS
      'Cuántos meses cubre cada pago. 1=mensual (default), 3=trimestral, 6=semestral, 12=anual.';
  END IF;

  -- vigencia_dias (opcional, sobrescribe vigencia_meses)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='courses' AND column_name='vigencia_dias'
  ) THEN
    ALTER TABLE public.courses
      ADD COLUMN vigencia_dias INTEGER NULL;
    COMMENT ON COLUMN public.courses.vigencia_dias IS
      'Si está seteado, sobrescribe vigencia_meses con duración en días. 1=diario, 7=semanal, 15=quincenal. NULL = usar vigencia_meses.';
  END IF;
END$$;

-- 2. Verificación post-migración — debe imprimir los 3 campos nuevos
DO $$
DECLARE
  v_cols_added INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_cols_added
  FROM information_schema.columns
  WHERE table_schema='public'
    AND table_name='courses'
    AND column_name IN ('renovacion_rolling', 'vigencia_meses', 'vigencia_dias');

  IF v_cols_added = 3 THEN
    RAISE NOTICE 'Migración v36 OK — 3 columnas agregadas a public.courses';
  ELSE
    RAISE EXCEPTION 'Migración v36 INCOMPLETA — solo % de 3 columnas existen', v_cols_added;
  END IF;
END$$;

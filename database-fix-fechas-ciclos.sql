-- ============================================================
-- FIX: Normalizar fechas de ciclos cerrados
-- Antes de este fix, closeCiclo() guardaba la fecha en
-- fecha_fin_estimada. El portal de instructoras solo lee fecha_fin.
-- Este script copia fecha_fin_estimada → fecha_fin donde fecha_fin
-- es NULL en ciclos ya cerrados.
-- EJECUTAR UNA SOLA VEZ: Supabase → SQL Editor → Run
-- ============================================================

-- Paso 1: copiar fecha_fin_estimada → fecha_fin en ciclos cerrados
UPDATE cycles
SET    fecha_fin = fecha_fin_estimada
WHERE  estado         = 'cerrado'
  AND  fecha_fin      IS NULL
  AND  fecha_fin_estimada IS NOT NULL;

-- ============================================================
-- FIX 2: Cerrar ciclos duplicados (ambos "activo" mismo curso)
-- Si un curso tiene Ciclo 1 y Ciclo 2 ambos activos,
-- cierra todos excepto el de mayor numero_ciclo.
-- ============================================================

WITH duplicados AS (
  SELECT
    id,
    course_id,
    numero_ciclo,
    ROW_NUMBER() OVER (PARTITION BY course_id ORDER BY numero_ciclo DESC) AS rn
  FROM cycles
  WHERE estado = 'activo'
)
UPDATE cycles
SET   estado    = 'cerrado',
      fecha_fin = CURRENT_DATE
WHERE id IN (
  SELECT id FROM duplicados WHERE rn > 1
);

-- ============================================================
-- Verificación final
-- ============================================================
SELECT
  course_id,
  numero_ciclo,
  estado,
  fecha_inicio,
  fecha_fin,
  total_clases,
  LEFT(objetivo_ciclo, 40) AS objetivo
FROM cycles
ORDER BY course_id, numero_ciclo;

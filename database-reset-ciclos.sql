-- ============================================================
-- RESET COMPLETO DE CICLOS
-- Elimina todos los ciclos y sus datos dependientes.
-- Usar para empezar de cero con la asignación de ciclos.
-- EJECUTAR EN SUPABASE → SQL Editor → Run
-- ============================================================

-- Elimina en orden correcto (dependientes primero)
DELETE FROM cycle_evaluations;
DELETE FROM cycle_progression;
DELETE FROM reportes_ciclo;
DELETE FROM class_plans;
DELETE FROM cycles;

-- Verificación: deben quedar 0 registros en todas
SELECT 'cycles'            AS tabla, COUNT(*) AS registros FROM cycles
UNION ALL
SELECT 'cycle_evaluations',          COUNT(*) FROM cycle_evaluations
UNION ALL
SELECT 'cycle_progression',          COUNT(*) FROM cycle_progression
UNION ALL
SELECT 'reportes_ciclo',             COUNT(*) FROM reportes_ciclo
UNION ALL
SELECT 'class_plans',                COUNT(*) FROM class_plans;

-- ============================================================================
-- OPS — Mover a Alejandra Gómez Salazar al curso "Baby Ballet - Ciclo Formativo"
-- ============================================================================
-- Contexto: el pago de junio ya estaba registrado contra el curso "Baby Ballet"
-- genérico (sin ciclo). Ahora existe la versión con ciclo escolar 15/06 → 13/01,
-- entonces la trasladamos sin perder pago/fechas/tarifa.
--
-- Cambio: SOLO course_id. Mantiene next_payment_date (2026-07-08),
-- last_payment_date (2026-06-08), monthly_fee ($45), payment_status ('paid').
-- Reversible si hace falta: restaurar a 'course-1780849142206'.
-- ============================================================================

UPDATE public.students
SET course_id = 'course-1781059246228'
WHERE id = 'bef7446f-7d92-438b-9d6f-cc27fedcf142'
  AND course_id = 'course-1780849142206';  -- guarda: solo si está en el curso esperado

-- Verificación
SELECT id, name, course_id, next_payment_date, monthly_fee, payment_status
FROM public.students
WHERE id = 'bef7446f-7d92-438b-9d6f-cc27fedcf142';

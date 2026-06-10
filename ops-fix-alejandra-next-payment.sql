-- ============================================================================
-- OPS — Corregir next_payment_date de Alejandra Gómez Salazar
-- ============================================================================
-- Contexto: pagó el 8/06/2026 pero el ciclo escolar de su curso
-- (Baby Ballet - Ciclo Formativo) arranca el 15/06/2026. El sistema
-- guardó next_payment_date = 8/07 (1 mes desde pago), pero debería ser
-- 15/07 (1 mes desde el inicio del ciclo).
--
-- La lógica de registerPayment ya se corrigió (clamp al ciclo escolar).
-- Este UPDATE arregla el registro existente.
-- ============================================================================

UPDATE public.students
SET next_payment_date = '2026-07-15'
WHERE id = 'bef7446f-7d92-438b-9d6f-cc27fedcf142'
  AND next_payment_date = '2026-07-08'  -- guarda contra reaplicación
  AND course_id = 'course-1781059246228';

-- Verificación
SELECT id, name, course_id, next_payment_date, last_payment_date, monthly_fee
FROM public.students
WHERE id = 'bef7446f-7d92-438b-9d6f-cc27fedcf142';

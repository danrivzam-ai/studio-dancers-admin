-- =============================================
-- Studio Dancers - Fix: Limpiar alumnos con pagos anulados
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Paso 1: Ver estado actual de todos los alumnos
SELECT
  s.name,
  s.course_id,
  s.last_payment_date,
  s.next_payment_date,
  s.payment_status,
  (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id AND (p.voided = false OR p.voided IS NULL)) as valid_payments,
  (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id AND p.voided = true) as voided_payments
FROM students s
WHERE s.active = true
ORDER BY s.name;

-- Paso 2: Limpiar alumnos que tienen TODOS sus pagos anulados (0 pagos válidos)
-- Estos deben volver a estado "sin cobro"
UPDATE students
SET
  last_payment_date = NULL,
  next_payment_date = NULL,
  payment_status = 'pending',
  amount_paid = 0,
  balance = 0
WHERE active = true
  AND id IN (
    SELECT s.id
    FROM students s
    WHERE s.active = true
      AND s.last_payment_date IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM payments p
        WHERE p.student_id = s.id
          AND (p.voided = false OR p.voided IS NULL)
      )
  );

-- Paso 3: Verificar resultado
SELECT
  s.name,
  s.course_id,
  s.last_payment_date,
  s.next_payment_date,
  s.payment_status
FROM students s
WHERE s.active = true
ORDER BY s.name;

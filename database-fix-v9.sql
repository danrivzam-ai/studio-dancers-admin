-- =============================================
-- Studio Dancers - Fix v9: Corregir ciclos y saldos
-- Ejecutar en Supabase SQL Editor
-- =============================================

-- Paso 1: Ver estado actual de todos los alumnos con sus pagos
SELECT
  s.name,
  s.course_id,
  s.last_payment_date,
  s.next_payment_date,
  s.payment_status,
  s.amount_paid,
  s.balance,
  s.monthly_fee,
  (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id AND (p.voided = false OR p.voided IS NULL)) as valid_payments,
  (SELECT COUNT(*) FROM payments p WHERE p.student_id = s.id AND p.voided = true) as voided_payments,
  (SELECT SUM(p.amount) FROM payments p WHERE p.student_id = s.id AND (p.voided = false OR p.voided IS NULL)) as total_paid
FROM students s
WHERE s.active = true
ORDER BY s.name;

-- Paso 2: Limpiar alumnos con TODOS sus pagos anulados (sin pagos validos)
UPDATE students
SET
  last_payment_date = NULL,
  next_payment_date = NULL,
  payment_status = 'pending',
  amount_paid = 0,
  balance = 0,
  classes_used = 0
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

-- Paso 3: Ver pagos recientes de cada alumno para verificar ciclos
SELECT
  s.name,
  p.payment_date,
  p.amount,
  p.payment_type,
  p.voided,
  p.receipt_number
FROM students s
JOIN payments p ON p.student_id = s.id
WHERE s.active = true
ORDER BY s.name, p.payment_date DESC;

-- NOTA: Despues de ejecutar este SQL, usa el boton de Recalcular (icono de flechas circulares)
-- en la aplicacion para que recalcule las fechas de todos los alumnos.
-- Si algun alumno tiene un abono parcial (como Kiki con $20 de $40),
-- debes anular ese pago y volverlo a registrar con la nueva logica de abonos.

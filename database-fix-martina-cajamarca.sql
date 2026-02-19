-- Corrección: Martina Cajamarca - pago de $14 erróneo por bug de descuento
-- El curso costaba $99, se aplicó descuento a $85, pero el sistema calculó
-- un saldo pendiente de $14 usando el precio original. Se generó un recibo
-- de $14 que no debía existir.
--
-- Este script:
-- 1. Elimina el pago de $14 (soft delete con deleted_at)
-- 2. Ajusta el estudiante: balance=0, payment_status='paid', total_program_price=85

-- Paso 1: Verificar datos actuales (ejecutar primero para confirmar)
SELECT s.id, s.name, s.amount_paid, s.balance, s.payment_status, s.total_program_price, s.course_id
FROM students s
WHERE LOWER(s.name) LIKE '%martina%cajamarca%';

-- Paso 2: Ver sus pagos
SELECT p.id, p.amount, p.payment_date, p.receipt_number, p.payment_type,
       p.discount_original_price, p.discount_amount, p.notes
FROM payments p
JOIN students s ON p.student_id = s.id
WHERE LOWER(s.name) LIKE '%martina%cajamarca%'
ORDER BY p.payment_date DESC, p.created_at DESC;

-- Paso 3: Anular el pago de $14 (soft delete)
-- IMPORTANTE: Revisar los resultados del Paso 2 y confirmar que el pago de $14 existe
-- Si el pago tiene voided column, usar voided=true; si no, usar deleted_at
UPDATE payments
SET voided = true,
    voided_at = NOW(),
    voided_reason = 'Pago erróneo por bug de descuento - el sistema calculó saldo de $14 contra precio original $99 en vez del descontado $85'
WHERE student_id = (SELECT id FROM students WHERE LOWER(name) LIKE '%martina%cajamarca%' LIMIT 1)
  AND amount = 14
  AND voided IS NOT TRUE;

-- Paso 4: Corregir datos del estudiante
UPDATE students
SET balance = 0,
    payment_status = 'paid',
    amount_paid = 0,
    total_program_price = 85
WHERE LOWER(name) LIKE '%martina%cajamarca%';

-- Paso 5: Verificar corrección
SELECT s.name, s.amount_paid, s.balance, s.payment_status, s.total_program_price
FROM students s
WHERE LOWER(s.name) LIKE '%martina%cajamarca%';

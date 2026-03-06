-- ============================================
-- FIX: Corregir cierre de caja del 21/02/2026
-- El pago de $30 del 22/02 era realmente del 21/02
-- ============================================

-- 1. Ver el estado actual de la caja del 21/02
SELECT id, register_date, opening_amount, closing_amount, expected_amount, difference, status
FROM cash_registers
WHERE register_date = '2026-02-21';

-- 2. Ver el pago de $30 del 22/02 (para identificar cuál mover)
SELECT id, student_id, amount, payment_date, payment_method, created_at
FROM payments
WHERE payment_date = '2026-02-22';

-- ============================================
-- EJECUTAR SOLO DESPUÉS DE VERIFICAR ARRIBA:
-- ============================================

-- 3. Mover el pago de $30 al 21/02 (cambiar el ID si es necesario)
-- DESCOMENTAR y ajustar el ID del pago correcto:
-- UPDATE payments SET payment_date = '2026-02-21' WHERE id = 'PEGAR_ID_AQUI' AND amount = 30;

-- 4. Actualizar cierre de la caja del 21/02
-- Si la caja del 21 tenía apertura X y cerró con Y,
-- ahora los ingresos del 21 suben en $30, así que:
-- closing_amount sigue siendo $175 (el efectivo real no cambió)
-- Pero expected_amount sube en $30 y difference baja en $30
-- Solo ejecutar si necesitas corregir los totales guardados:
-- UPDATE cash_registers
-- SET total_income = total_income + 30,
--     expected_amount = expected_amount + 30,
--     difference = closing_amount - (expected_amount + 30)
-- WHERE register_date = '2026-02-21';

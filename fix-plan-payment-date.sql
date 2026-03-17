-- Corregir fecha de abono registrado en UTC en lugar de hora Ecuador
-- El abono de $60 del 12/mar se pudo haber grabado como 13/mar por zona horaria UTC

-- Primero verificar:
SELECT id, plan_id, amount, payment_date, created_at
FROM sale_plan_payments
ORDER BY created_at DESC
LIMIT 5;

-- Si el payment_date dice '2026-03-13' pero el created_at muestra que fue el 12:
-- UPDATE sale_plan_payments
-- SET payment_date = '2026-03-12'
-- WHERE payment_date = '2026-03-13'
--   AND created_at >= '2026-03-12T00:00:00Z'
--   AND created_at < '2026-03-13T06:00:00Z';  -- antes de 1am Ecuador = 6am UTC

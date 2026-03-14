-- ============================================================
-- database-update-v33-integrity-constraints.sql
-- Constraints de integridad en la base de datos.
-- Previene datos inválidos a nivel BD (montos negativos,
-- métodos de pago inválidos, registros huérfanos, etc.)
-- Ejecutar en Supabase SQL Editor.
-- ============================================================

-- ── 1. PAGOS (payments) ─────────────────────────────────────

-- Monto siempre positivo
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_amount_positive,
  ADD CONSTRAINT payments_amount_positive
    CHECK (amount > 0);

-- Método de pago válido (español)
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_payment_method_valid,
  ADD CONSTRAINT payments_payment_method_valid
    CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta'));

-- payment_date no puede ser fecha futura (más de 1 día adelante, tolerancia UTC)
ALTER TABLE payments
  DROP CONSTRAINT IF EXISTS payments_date_not_future,
  ADD CONSTRAINT payments_date_not_future
    CHECK (payment_date <= CURRENT_DATE + INTERVAL '1 day');

-- ── 2. PAGOS RÁPIDOS (quick_payments) ───────────────────────

ALTER TABLE quick_payments
  DROP CONSTRAINT IF EXISTS quick_payments_amount_positive,
  ADD CONSTRAINT quick_payments_amount_positive
    CHECK (amount > 0);

ALTER TABLE quick_payments
  DROP CONSTRAINT IF EXISTS quick_payments_payment_method_valid,
  ADD CONSTRAINT quick_payments_payment_method_valid
    CHECK (payment_method IN ('Efectivo', 'Transferencia', 'Tarjeta'));

ALTER TABLE quick_payments
  DROP CONSTRAINT IF EXISTS quick_payments_date_not_future,
  ADD CONSTRAINT quick_payments_date_not_future
    CHECK (payment_date <= CURRENT_DATE + INTERVAL '1 day');

-- ── 3. VENTAS (sales) ────────────────────────────────────────

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_total_non_negative,
  ADD CONSTRAINT sales_total_non_negative
    CHECK (total >= 0);

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_payment_method_valid,
  ADD CONSTRAINT sales_payment_method_valid
    CHECK (payment_method IN ('cash', 'transfer', 'card'));

ALTER TABLE sales
  DROP CONSTRAINT IF EXISTS sales_date_not_future,
  ADD CONSTRAINT sales_date_not_future
    CHECK (sale_date <= CURRENT_DATE + INTERVAL '1 day');

-- ── 4. GASTOS (expenses) ─────────────────────────────────────

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_amount_positive,
  ADD CONSTRAINT expenses_amount_positive
    CHECK (amount > 0);

ALTER TABLE expenses
  DROP CONSTRAINT IF EXISTS expenses_payment_method_valid,
  ADD CONSTRAINT expenses_payment_method_valid
    CHECK (payment_method IN ('cash', 'transfer', 'card', 'Efectivo', 'Transferencia', 'Tarjeta'));

-- ── 5. PAGOS DE PLANES (sale_plan_payments) ──────────────────

ALTER TABLE sale_plan_payments
  DROP CONSTRAINT IF EXISTS sale_plan_payments_amount_positive,
  ADD CONSTRAINT sale_plan_payments_amount_positive
    CHECK (amount > 0);

-- ── 6. CAJA (cash_registers) ─────────────────────────────────

-- Monto de apertura no negativo
ALTER TABLE cash_registers
  DROP CONSTRAINT IF EXISTS cash_registers_opening_non_negative,
  ADD CONSTRAINT cash_registers_opening_non_negative
    CHECK (opening_amount >= 0);

-- Monto de cierre no negativo (cuando existe)
ALTER TABLE cash_registers
  DROP CONSTRAINT IF EXISTS cash_registers_closing_non_negative,
  ADD CONSTRAINT cash_registers_closing_non_negative
    CHECK (closing_amount IS NULL OR closing_amount >= 0);

-- Estado válido
ALTER TABLE cash_registers
  DROP CONSTRAINT IF EXISTS cash_registers_status_valid,
  ADD CONSTRAINT cash_registers_status_valid
    CHECK (status IN ('open', 'closed'));

-- ── 7. MOVIMIENTOS DE CAJA (cash_movements) ──────────────────

ALTER TABLE cash_movements
  DROP CONSTRAINT IF EXISTS cash_movements_amount_positive,
  ADD CONSTRAINT cash_movements_amount_positive
    CHECK (amount > 0);

ALTER TABLE cash_movements
  DROP CONSTRAINT IF EXISTS cash_movements_type_valid,
  ADD CONSTRAINT cash_movements_type_valid
    CHECK (type IN ('deposit', 'withdrawal', 'owner_loan', 'owner_reimbursement'));

-- ── 8. ALUMNAS (students) ────────────────────────────────────

-- Cuota mensual no negativa
-- NOTA: el estado de pago (active/mora/grace/etc.) es calculado en el frontend
-- a partir de next_payment_date, no hay columna 'status' en students.
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS students_monthly_fee_non_negative,
  ADD CONSTRAINT students_monthly_fee_non_negative
    CHECK (monthly_fee IS NULL OR monthly_fee >= 0);

-- ── 9. CIERRE MENSUAL (monthly_closes) ───────────────────────

-- Montos no negativos
ALTER TABLE monthly_closes
  DROP CONSTRAINT IF EXISTS monthly_closes_totals_non_negative,
  ADD CONSTRAINT monthly_closes_totals_non_negative
    CHECK (
      total_ingresos >= 0 AND
      total_egresos  >= 0 AND
      ingresos_alumnos >= 0 AND
      ingresos_rapidos >= 0 AND
      ingresos_ventas  >= 0 AND
      ingresos_planes  >= 0
    );

-- Alumnas no negativas
ALTER TABLE monthly_closes
  DROP CONSTRAINT IF EXISTS monthly_closes_alumnas_non_negative,
  ADD CONSTRAINT monthly_closes_alumnas_non_negative
    CHECK (
      alumnas_activas   >= 0 AND
      alumnas_mora      >= 0 AND
      alumnas_inactivas >= 0
    );

-- ── 10. CONFIGURACIÓN (school_settings) ──────────────────────

-- Días de configuración positivos
ALTER TABLE school_settings
  DROP CONSTRAINT IF EXISTS school_settings_days_positive,
  ADD CONSTRAINT school_settings_days_positive
    CHECK (
      (grace_days       IS NULL OR grace_days       > 0) AND
      (mora_days        IS NULL OR mora_days        > 0) AND
      (auto_inactive_days IS NULL OR auto_inactive_days > 0)
    );

-- mora_days debe ser mayor que grace_days (evita configuración absurda)
ALTER TABLE school_settings
  DROP CONSTRAINT IF EXISTS school_settings_mora_gt_grace,
  ADD CONSTRAINT school_settings_mora_gt_grace
    CHECK (
      grace_days IS NULL OR mora_days IS NULL OR
      mora_days > grace_days
    );

-- auto_inactive_days debe ser mayor que mora_days
ALTER TABLE school_settings
  DROP CONSTRAINT IF EXISTS school_settings_inactive_gt_mora,
  ADD CONSTRAINT school_settings_inactive_gt_mora
    CHECK (
      mora_days IS NULL OR auto_inactive_days IS NULL OR
      auto_inactive_days > mora_days
    );

-- ── 11. VERIFICACIÓN ─────────────────────────────────────────
-- Listar todos los constraints de integridad agregados:
SELECT
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  cc.check_clause
FROM information_schema.table_constraints tc
LEFT JOIN information_schema.check_constraints cc
  ON tc.constraint_name = cc.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'CHECK'
  AND tc.table_name IN (
    'payments', 'quick_payments', 'sales', 'expenses',
    'sale_plan_payments', 'cash_registers', 'cash_movements',
    'students', 'monthly_closes', 'school_settings'
  )
ORDER BY tc.table_name, tc.constraint_name;

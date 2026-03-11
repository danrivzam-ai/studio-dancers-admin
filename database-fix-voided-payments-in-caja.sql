-- ============================================================
-- FIX: Pagos anulados excluidos del cuadre de caja
-- Fecha: 2026-03-10
-- Problema: La vista daily_cash_summary incluía pagos con
--           voided = true en los totales de ingresos.
-- Solución: Agregar AND voided = false a las 4 subconsultas
--           que suman payments y quick_payments.
-- ============================================================

CREATE OR REPLACE VIEW daily_cash_summary AS
SELECT
    cr.id AS cash_register_id,
    cr.register_date,
    cr.shift,
    cr.status,
    cr.opening_amount,
    cr.opened_at,
    cr.closed_at,

    -- Ingresos desde pagos de alumnos (excluye anulados)
    COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.payment_date = cr.register_date
        AND p.voided = false
    ), 0) AS student_payments_total,

    -- Ingresos desde pagos rápidos (excluye anulados)
    COALESCE((
        SELECT SUM(qp.amount)
        FROM quick_payments qp
        WHERE qp.payment_date = cr.register_date
        AND qp.voided = false
    ), 0) AS quick_payments_total,

    -- Ingresos desde ventas
    COALESCE((
        SELECT SUM(s.total)
        FROM sales s
        WHERE s.sale_date = cr.register_date
    ), 0) AS sales_total,

    -- Total egresos
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.cash_register_id = cr.id
        AND e.deleted_at IS NULL
        AND e.voided = false
    ), 0) AS expenses_total,

    -- Egresos en efectivo
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.cash_register_id = cr.id
        AND e.deleted_at IS NULL
        AND e.voided = false
        AND e.payment_method = 'cash'
    ), 0) AS expenses_cash_total,

    -- Depósitos bancarios
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type = 'deposit'
    ), 0) AS deposits_total,

    -- Retiros / préstamos
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type IN ('withdrawal', 'owner_loan')
    ), 0) AS cash_in_total,

    -- Reembolsos al dueño
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type = 'owner_reimbursement'
    ), 0) AS cash_out_total,

    -- Ingresos en efectivo (excluye anulados de payments y quick_payments)
    COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.payment_date = cr.register_date
        AND p.voided = false
        AND p.payment_method = 'Efectivo'
    ), 0) + COALESCE((
        SELECT SUM(qp.amount)
        FROM quick_payments qp
        WHERE qp.payment_date = cr.register_date
        AND qp.voided = false
        AND qp.payment_method = 'Efectivo'
    ), 0) + COALESCE((
        SELECT SUM(s.total)
        FROM sales s
        WHERE s.sale_date = cr.register_date
        AND s.payment_method = 'cash'
    ), 0) AS income_cash_total

FROM cash_registers cr
ORDER BY cr.register_date DESC, cr.shift;

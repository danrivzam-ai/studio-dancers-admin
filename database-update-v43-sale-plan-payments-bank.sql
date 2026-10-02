-- ── v43: banco y comprobante en abonos de planes ─────────────────────────────
-- El formulario de abonos ahora usa el mismo selector de forma de pago que el
-- resto de cobros (Efectivo / Transferencia con banco y comprobante / Tarjeta).
-- payments, quick_payments y sales ya tenían estas columnas.
-- Solo agrega columnas opcionales: no modifica datos existentes. Idempotente.

ALTER TABLE public.sale_plan_payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE public.sale_plan_payments ADD COLUMN IF NOT EXISTS transfer_receipt TEXT;

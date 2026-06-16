-- ============================================================================
-- OPS — Limpiar nota errónea en pago Valentina López (N° 99624)
-- ============================================================================
-- Aclaración del dueño: el cobro real fue $40 (el descuento de $5 sí se
-- aplicó al banco). El bug era SOLO visual: el comprobante mostraba mal
-- el total pagado. NO hay que devolver nada a la cliente.
--
-- La nota que se agregó en ops-fix-valentina-payment.sql era incorrecta
-- (asumía que el banco recibió $45). Se limpia.
-- ============================================================================

UPDATE public.payments
SET notes = NULL
WHERE id = '3a773b8d-9a58-490b-bd12-1b813790aec4'
  AND notes LIKE '%[Ajuste 2026-06-09]%';

-- Verificación: el pago queda limpio, con amount=$40 + descuento de $5 sobre $45
SELECT receipt_number, amount,
       discount_original_price, discount_amount,
       (discount_original_price - discount_amount) AS check_consistency,
       notes
FROM public.payments
WHERE id = '3a773b8d-9a58-490b-bd12-1b813790aec4';

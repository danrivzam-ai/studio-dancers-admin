-- ============================================================================
-- OPS — Corregir pago de Valentina López (N° 99624)
-- ============================================================================
-- Contexto: el modal de pago tenía un bug que permitió grabar amount=$45
-- junto con discount_amount=$5 (inconsistente: la matemática $45 - $5 = $40
-- no se aplicó al monto cobrado). El banco recibió $45 reales pero la
-- intención original era cobrar $40 con descuento de $5.
--
-- Decisión del dueño: ajustar amount a $40 (lo que correspondía cobrar)
-- y dejar nota visible para devolver $5 al cliente.
--
-- IDEMPOTENTE: el UPDATE tiene guardas para no aplicarse 2 veces.
-- ============================================================================

UPDATE public.payments
SET
  amount = 40.00,
  notes = COALESCE(notes || E'\n', '') ||
    '[Ajuste 2026-06-09] Cobro real $45 por bug del modal de descuento. ' ||
    'Pendiente devolver $5 a la cliente. Banco recibió $45 reales.'
WHERE id = '3a773b8d-9a58-490b-bd12-1b813790aec4'
  AND amount = 45.00                         -- guarda contra reaplicación
  AND discount_amount = 5.00;                -- doble verificación de la inconsistencia

-- Verificación
SELECT id, receipt_number, amount,
       discount_original_price, discount_amount,
       (discount_original_price - discount_amount) AS deberia_ser,
       notes
FROM public.payments
WHERE id = '3a773b8d-9a58-490b-bd12-1b813790aec4';

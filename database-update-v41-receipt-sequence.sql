-- ── v41: numeración única de comprobantes (pagos de alumnas + pagos rápidos) ──
--
-- Problema: el número se calculaba en el navegador como "máximo de payments + 1".
--   - Los pagos rápidos (quick_payments) no entraban en el máximo, así que el
--     siguiente pago de alumna repetía su número (11 números duplicados a oct-2026).
--   - Dos personas cobrando a la vez obtenían el mismo número.
--   - Si la consulta fallaba se usaba Date.now() % 100000 (de ahí la serie 996xx).
--
-- Solución: una secuencia de Postgres compartida por ambas tablas. nextval() es
-- atómico, así que dos cobros simultáneos nunca reciben el mismo número.
-- La serie continúa desde el número más alto existente (sin reiniciar).
--
-- Idempotente: se puede volver a ejecutar sin efectos (setval nunca retrocede).

CREATE SEQUENCE IF NOT EXISTS public.receipt_number_seq;

DO $$
DECLARE
  max_existing bigint;
  current_seq  bigint;
BEGIN
  SELECT COALESCE(MAX(n), 0) INTO max_existing FROM (
    SELECT NULLIF(regexp_replace(receipt_number, '\D', '', 'g'), '')::bigint AS n FROM public.payments
    UNION ALL
    SELECT NULLIF(regexp_replace(receipt_number, '\D', '', 'g'), '')::bigint FROM public.quick_payments
  ) x;

  SELECT CASE WHEN is_called THEN last_value ELSE last_value - 1 END
    INTO current_seq FROM public.receipt_number_seq;

  -- Próximo nextval() = GREATEST(máximo existente, valor actual) + 1
  PERFORM setval('public.receipt_number_seq', GREATEST(max_existing, current_seq, 1), true);
END $$;

-- Solo personal con rol en user_roles puede pedir números.
-- Si encuentra en las tablas un número >= al que entregó la secuencia (p. ej. un
-- cobro hecho con la versión anterior de la app, o un insert manual), adelanta la
-- secuencia por encima de ese máximo. El advisory lock evita que dos llamadas
-- simultáneas se pisen al reajustarla.
CREATE OR REPLACE FUNCTION public.next_receipt_number()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v   bigint;
  mx  bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para generar comprobantes' USING ERRCODE = '42501';
  END IF;

  v := nextval('public.receipt_number_seq');

  SELECT COALESCE(MAX(n), 0) INTO mx FROM (
    SELECT NULLIF(regexp_replace(receipt_number, '\D', '', 'g'), '')::bigint AS n FROM public.payments
    UNION ALL
    SELECT NULLIF(regexp_replace(receipt_number, '\D', '', 'g'), '')::bigint FROM public.quick_payments
  ) x;

  IF mx >= v THEN
    PERFORM pg_advisory_xact_lock(hashtext('public.receipt_number_seq'));
    PERFORM setval('public.receipt_number_seq',
                   GREATEST(mx, (SELECT last_value FROM public.receipt_number_seq)), true);
    v := nextval('public.receipt_number_seq');
  END IF;

  RETURN v::text;
END;
$$;

REVOKE ALL ON FUNCTION public.next_receipt_number() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_receipt_number() TO authenticated;
REVOKE ALL ON SEQUENCE public.receipt_number_seq FROM PUBLIC, anon, authenticated;

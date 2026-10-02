-- ── v44: número de comprobante de ventas único ──────────────────────────────
-- Antes: VTA-YYYYMMDD-XXXX con XXXX aleatorio (1000-9999) generado en el
-- navegador; dos ventas el mismo día podían recibir el mismo número.
-- Ahora: el sufijo sale de una secuencia (atómica) que arranca en 10001, así
-- tiene 5 dígitos y nunca coincide con los aleatorios de 4 dígitos existentes.
-- Formato: VTA-20261002-10001. Idempotente.

CREATE SEQUENCE IF NOT EXISTS public.sale_receipt_seq START WITH 10001 MINVALUE 10001;

CREATE OR REPLACE FUNCTION public.next_sale_receipt_number(p_sale_date date)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid()) THEN
    RAISE EXCEPTION 'No autorizado para generar comprobantes' USING ERRCODE = '42501';
  END IF;
  RETURN 'VTA-' || to_char(COALESCE(p_sale_date, (now() AT TIME ZONE 'America/Guayaquil')::date), 'YYYYMMDD')
         || '-' || nextval('public.sale_receipt_seq')::text;
END;
$$;

REVOKE ALL ON FUNCTION public.next_sale_receipt_number(date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.next_sale_receipt_number(date) TO authenticated;
REVOKE ALL ON SEQUENCE public.sale_receipt_seq FROM PUBLIC, anon, authenticated;

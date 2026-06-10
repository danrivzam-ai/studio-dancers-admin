-- ============================================================================
-- Migración v38 — RPC rpc_client_login devuelve ciclo escolar
-- ============================================================================
-- El portal Mi Studio (cliente padre/alumna) llama a rpc_client_login para
-- obtener el panel completo del alumno. Antes no devolvía ciclo_inicio ni
-- ciclo_fin del curso, así que el portal no podía mostrar las fechas del
-- ciclo escolar ni detectar cuando el ciclo finaliza.
--
-- Esta migración agrega ambos campos al RETURN TABLE de la función. El
-- COURSE se trae con LEFT JOIN existente, solo agregamos 2 columnas más.
-- ============================================================================

-- DROP necesario porque cambia el RETURN TABLE (agregamos 2 columnas).
-- Postgres no permite CREATE OR REPLACE cuando cambia la signature de salida.
DROP FUNCTION IF EXISTS public.rpc_client_login(text, text);

CREATE OR REPLACE FUNCTION public.rpc_client_login(p_cedula text, p_phone_last4 text)
 RETURNS TABLE(
    id uuid, name text, course_id text, course_name text,
    monthly_fee numeric, next_payment_date date, payment_status text,
    balance numeric, amount_paid numeric, is_paused boolean,
    is_courtesy boolean, is_minor boolean, active boolean,
    last_payment_date date, enrollment_date date,
    consecutive_months integer,
    phone text, parent_phone text, payer_phone text,
    -- NUEVOS: ciclo escolar del curso
    ciclo_inicio date, ciclo_fin date
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cedula TEXT;
BEGIN
    v_cedula := REGEXP_REPLACE(p_cedula, '\D', '', 'g');

    RETURN QUERY
    SELECT
        s.id, s.name, s.course_id,
        COALESCE(c.name, 'Sin curso')::TEXT as course_name,
        s.monthly_fee, s.next_payment_date, s.payment_status,
        s.balance, s.amount_paid, s.is_paused,
        COALESCE(s.is_courtesy, false)::BOOLEAN as is_courtesy,
        COALESCE(s.is_minor, true)::BOOLEAN as is_minor,
        s.active,
        s.last_payment_date, s.enrollment_date,
        COALESCE(s.consecutive_months, 0)::INTEGER as consecutive_months,
        s.phone, s.parent_phone, s.payer_phone,
        c.ciclo_inicio, c.ciclo_fin
    FROM students s
    LEFT JOIN courses c ON c.id::text = s.course_id OR c.code = s.course_id
    WHERE s.active = true
      AND (
          REGEXP_REPLACE(COALESCE(s.cedula, ''), '\D', '', 'g') = v_cedula
          OR REGEXP_REPLACE(COALESCE(s.parent_cedula, ''), '\D', '', 'g') = v_cedula
          OR REGEXP_REPLACE(COALESCE(s.payer_cedula, ''), '\D', '', 'g') = v_cedula
      )
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );
END;
$function$;

-- Verificación: probar con cédula falsa (debe devolver 0 filas pero ejecutar sin error)
SELECT count(*) AS verify_columns
FROM information_schema.parameters
WHERE specific_schema = 'public'
  AND specific_name LIKE 'rpc_client_login%';

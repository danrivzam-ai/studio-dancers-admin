-- ── v50: el portal recibe el ciclo real de cada alumna (v48) ──────────────────
--
-- Problema: v48 agregó a `students` cycle_classes, frozen_classes,
-- next_course_id y next_monthly_fee, pero rpc_client_login no los devuelve.
-- El portal calcula el ciclo con el estándar del curso: una alumna que congeló
-- una clase o pagó meses adelantados ve "Lista para renovar" antes de tiempo.
--
-- Solución: rpc_client_login devuelve además
--   cycle_classes, frozen_classes, next_course_id, next_course_name, next_monthly_fee
-- (al final del RETURN TABLE). Cambia la firma de salida → DROP + CREATE.
-- Se conservan SECURITY DEFINER, el límite de intentos (v46) y la validación
-- con _portal_student_ids (v46). Una fila por inscripción (v49), como antes.
--
-- Dependencias revisadas: rpc_client_device_register (v47) llama a
-- rpc_client_login dentro de PL/pgSQL (no depende de la firma de salida);
-- la Edge Function upload-avatar la llama por RPC y solo usa `id`.
--
-- Idempotente y en una sola transacción (la función nunca queda ausente).

BEGIN;

DROP FUNCTION IF EXISTS public.rpc_client_login(text, text);

CREATE FUNCTION public.rpc_client_login(p_cedula text, p_phone_last4 text)
 RETURNS TABLE(
    id uuid, name text, course_id text, course_name text,
    monthly_fee numeric, next_payment_date date, payment_status text,
    balance numeric, amount_paid numeric, is_paused boolean,
    is_courtesy boolean, is_minor boolean, active boolean,
    last_payment_date date, enrollment_date date,
    consecutive_months integer,
    phone text, parent_phone text, payer_phone text,
    ciclo_inicio date, ciclo_fin date,
    -- v50: ciclo real de la alumna y cambio de curso programado (v48)
    cycle_classes integer, frozen_classes integer,
    next_course_id text, next_course_name text, next_monthly_fee numeric
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
    v_cedula TEXT;
    v_fails  INTEGER;
BEGIN
    v_cedula := REGEXP_REPLACE(COALESCE(p_cedula, ''), '\D', '', 'g');

    IF length(v_cedula) < 6 OR COALESCE(p_phone_last4, '') !~ '^\d{4}$' THEN
        RETURN;
    END IF;

    SELECT count(*) INTO v_fails
    FROM login_attempts la
    WHERE la.cedula = v_cedula
      AND la.success = false
      AND la.attempted_at > NOW() - INTERVAL '10 minutes';

    IF v_fails >= 5 THEN
        RAISE EXCEPTION 'Demasiados intentos. Espera 10 minutos e inténtalo de nuevo.'
          USING ERRCODE = 'P0001', HINT = 'rate_limited';
    END IF;

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
        c.ciclo_inicio, c.ciclo_fin,
        s.cycle_classes::INTEGER,
        COALESCE(s.frozen_classes, 0)::INTEGER,
        s.next_course_id::TEXT,
        nc.name::TEXT as next_course_name,
        s.next_monthly_fee::NUMERIC
    FROM students s
    LEFT JOIN courses c  ON c.id::text = s.course_id OR c.code = s.course_id
    LEFT JOIN courses nc ON s.next_course_id IS NOT NULL
                        AND (nc.id::text = s.next_course_id OR nc.code = s.next_course_id)
    WHERE s.id IN (SELECT public._portal_student_ids(p_cedula, p_phone_last4));

    IF NOT FOUND THEN
        INSERT INTO login_attempts (cedula, success) VALUES (v_cedula, false);
    END IF;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.rpc_client_login(text, text) TO anon, authenticated, service_role;

COMMIT;

-- Verificación: debe listar las 5 columnas nuevas y security_definer = true
SELECT p.prosecdef AS security_definer,
       array_to_string(p.proargnames[3:], ', ') AS columnas_salida
FROM pg_proc p
WHERE p.pronamespace = 'public'::regnamespace AND p.proname = 'rpc_client_login';

-- ── v46: seguridad del portal de alumnas (Mi Studio) ──────────────────────────
--
-- Problemas:
--   1. rpc_client_login no limita intentos. Con una cédula conocida, los 4
--      dígitos del teléfono se adivinan en ≤ 10.000 intentos y la RPC devuelve
--      nombre, teléfonos y saldos de la alumna.
--   2. Desde v38c/v42, `reportes_ciclo` y `cycle_evaluations` solo se leen con
--      rol de personal: la pestaña "Reportes" del portal (anon) quedó vacía.
--
-- Solución:
--   1. rpc_client_login registra los fallos en `login_attempts` (v35) y bloquea
--      10 minutos tras 5 fallos por cédula. Misma firma y mismo RETURN TABLE
--      que v38, así que el portal no cambia su llamada.
--   2. Nuevas RPC SECURITY DEFINER que validan cédula + teléfono y devuelven solo
--      los reportes aprobados / evaluaciones de las alumnas de esa familia:
--        rpc_client_reportes(p_cedula, p_phone_last4)
--        rpc_client_cycle_evaluations(p_cedula, p_phone_last4, p_cycle_id, p_student_id)
--
-- Idempotente: se puede ejecutar varias veces.

-- ── Helper interno: ids de alumnas activas que coinciden con cédula + teléfono ─
CREATE OR REPLACE FUNCTION public._portal_student_ids(p_cedula text, p_phone_last4 text)
RETURNS SETOF uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.id
  FROM students s
  WHERE s.active = true
    AND p_phone_last4 ~ '^\d{4}$'
    AND length(REGEXP_REPLACE(COALESCE(p_cedula, ''), '\D', '', 'g')) >= 6
    AND (
      REGEXP_REPLACE(COALESCE(s.cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.parent_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
      OR REGEXP_REPLACE(COALESCE(s.payer_cedula, ''), '\D', '', 'g') = REGEXP_REPLACE(p_cedula, '\D', '', 'g')
    )
    AND (
      RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
    )
$$;

REVOKE ALL ON FUNCTION public._portal_student_ids(text, text) FROM PUBLIC, anon, authenticated;

-- ── 1. rpc_client_login con límite de intentos ────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_client_login(p_cedula text, p_phone_last4 text)
 RETURNS TABLE(
    id uuid, name text, course_id text, course_name text,
    monthly_fee numeric, next_payment_date date, payment_status text,
    balance numeric, amount_paid numeric, is_paused boolean,
    is_courtesy boolean, is_minor boolean, active boolean,
    last_payment_date date, enrollment_date date,
    consecutive_months integer,
    phone text, parent_phone text, payer_phone text,
    ciclo_inicio date, ciclo_fin date
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
        c.ciclo_inicio, c.ciclo_fin
    FROM students s
    LEFT JOIN courses c ON c.id::text = s.course_id OR c.code = s.course_id
    WHERE s.id IN (SELECT public._portal_student_ids(p_cedula, p_phone_last4));

    IF NOT FOUND THEN
        INSERT INTO login_attempts (cedula, success) VALUES (v_cedula, false);
    END IF;
END;
$function$;

-- ── 2. Reportes del ciclo para el portal ──────────────────────────────────────
CREATE OR REPLACE FUNCTION public.rpc_client_reportes(p_cedula text, p_phone_last4 text)
RETURNS SETOF public.reportes_ciclo
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT r.*
  FROM reportes_ciclo r
  WHERE r.estado = 'aprobado'
    AND r.student_id::text IN (SELECT id::text FROM public._portal_student_ids(p_cedula, p_phone_last4) AS id)
  ORDER BY r.numero_ciclo DESC
$$;

-- cycle_id / student_id se comparan como texto para no depender del tipo de columna.
CREATE OR REPLACE FUNCTION public.rpc_client_cycle_evaluations(
  p_cedula text, p_phone_last4 text, p_cycle_id text, p_student_id text
)
RETURNS TABLE(competency text, estado text, observacion text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.competency::text, e.estado::text, e.observacion::text
  FROM cycle_evaluations e
  WHERE e.cycle_id::text = p_cycle_id
    AND e.student_id::text = p_student_id
    AND p_student_id IN (SELECT id::text FROM public._portal_student_ids(p_cedula, p_phone_last4) AS id)
    -- Solo evaluaciones de reportes ya aprobados
    AND EXISTS (
      SELECT 1 FROM reportes_ciclo r
      WHERE r.cycle_id::text = p_cycle_id AND r.student_id::text = p_student_id AND r.estado = 'aprobado'
    )
$$;

GRANT EXECUTE ON FUNCTION public.rpc_client_reportes(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_client_cycle_evaluations(text, text, text, text) TO anon, authenticated;

-- Verificación
SELECT proname, prosecdef AS security_definer
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
  AND proname IN ('rpc_client_login', 'rpc_client_reportes', 'rpc_client_cycle_evaluations', '_portal_student_ids');

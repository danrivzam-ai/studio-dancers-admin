-- ============================================================
-- v23 — Fix rpc_client_login: normalize cedula comparison,
--        add is_courtesy + is_minor to response
-- ============================================================
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION rpc_client_login(p_cedula TEXT, p_phone_last4 TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    course_id TEXT,
    course_name TEXT,
    monthly_fee DECIMAL,
    next_payment_date DATE,
    payment_status TEXT,
    balance DECIMAL,
    amount_paid DECIMAL,
    is_paused BOOLEAN,
    is_courtesy BOOLEAN,
    is_minor BOOLEAN,
    active BOOLEAN,
    last_payment_date DATE,
    enrollment_date DATE,
    consecutive_months INTEGER,
    phone TEXT,
    parent_phone TEXT,
    payer_phone TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_cedula TEXT;
BEGIN
    -- Normalize input: remove non-digit characters
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
        s.phone, s.parent_phone, s.payer_phone
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
$$;

-- Ensure anon can call it
GRANT EXECUTE ON FUNCTION rpc_client_login TO anon;

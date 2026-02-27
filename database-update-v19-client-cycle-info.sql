-- =============================================
-- Studio Dancers - v19: Info de ciclo para portal del cliente
-- Agrega classes_used y classes_per_cycle al login del portal
-- =============================================

-- Primero eliminar la función existente (PostgreSQL no permite cambiar RETURNS TABLE)
DROP FUNCTION IF EXISTS rpc_client_login(TEXT, TEXT);

-- Recrear con columnas adicionales
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
    active BOOLEAN,
    last_payment_date DATE,
    enrollment_date DATE,
    classes_used INTEGER,
    classes_per_cycle INTEGER,
    price_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id, s.name, s.course_id,
        COALESCE(c.name, 'Sin curso')::TEXT as course_name,
        s.monthly_fee, s.next_payment_date, s.payment_status,
        s.balance, s.amount_paid, s.is_paused, s.active,
        s.last_payment_date, s.enrollment_date,
        s.classes_used,
        c.classes_per_cycle,
        c.price_type
    FROM students s
    LEFT JOIN courses c ON c.id::text = s.course_id OR c.code = s.course_id
    WHERE s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_client_login(TEXT, TEXT) TO anon;

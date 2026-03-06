-- ============================================================
-- v22: Sistema de Fidelidad (consecutive_months)
-- ============================================================
-- Ejecutar en Supabase → SQL Editor

-- 1. Agregar columna consecutive_months a students
ALTER TABLE students
ADD COLUMN IF NOT EXISTS consecutive_months INTEGER DEFAULT 0;

UPDATE students
SET consecutive_months = 0
WHERE consecutive_months IS NULL;

-- 2. Eliminar función existente primero (requerido para cambiar RETURNS TABLE)
DROP FUNCTION IF EXISTS rpc_client_login(TEXT, TEXT);

-- 3. Recrear rpc_client_login incluyendo consecutive_months
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
    consecutive_months INTEGER
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id, s.name, s.course_id,
        COALESCE(c.name, 'Sin curso')::TEXT as course_name,
        s.monthly_fee, s.next_payment_date, s.payment_status,
        s.balance, s.amount_paid, s.is_paused, s.active,
        s.last_payment_date, s.enrollment_date,
        COALESCE(s.consecutive_months, 0)::INTEGER as consecutive_months
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

GRANT EXECUTE ON FUNCTION rpc_client_login TO anon;

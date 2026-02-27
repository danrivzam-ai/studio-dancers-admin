-- =============================================
-- Studio Dancers - v21: Receipt Number en Transfer Requests
-- Agrega N° Comprobante a transfer_requests
-- =============================================

-- 1. Agregar columna receipt_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'transfer_requests' AND column_name = 'receipt_number'
    ) THEN
        ALTER TABLE transfer_requests ADD COLUMN receipt_number TEXT;
    END IF;
END $$;

-- 2. Actualizar RPC de envío para aceptar receipt_number
DROP FUNCTION IF EXISTS rpc_client_submit_transfer(TEXT, TEXT, UUID, DECIMAL, TEXT, TEXT, TEXT);

CREATE OR REPLACE FUNCTION rpc_client_submit_transfer(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID,
    p_amount DECIMAL,
    p_bank_name TEXT,
    p_receipt_image_url TEXT,
    p_notes TEXT DEFAULT NULL,
    p_receipt_number TEXT DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_request_id UUID;
BEGIN
    -- Validar acceso
    IF NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = p_student_id AND s.active = true
          AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
          AND (
              RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
              OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
              OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          )
    ) THEN
        RAISE EXCEPTION 'Acceso no autorizado';
    END IF;

    INSERT INTO transfer_requests (
        student_id, amount, bank_name, receipt_image_url,
        submitted_by_cedula, submitted_by_phone, notes, receipt_number
    )
    VALUES (
        p_student_id, p_amount, p_bank_name, p_receipt_image_url,
        p_cedula, p_phone_last4, p_notes, p_receipt_number
    )
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

-- 3. Actualizar RPC de consulta para devolver receipt_number
DROP FUNCTION IF EXISTS rpc_client_get_requests(TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION rpc_client_get_requests(p_cedula TEXT, p_phone_last4 TEXT, p_student_id UUID)
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    bank_name TEXT,
    status TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ,
    receipt_number TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Validar acceso
    IF NOT EXISTS (
        SELECT 1 FROM students s
        WHERE s.id = p_student_id AND s.active = true
          AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
          AND (
              RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
              OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
              OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          )
    ) THEN
        RETURN;
    END IF;

    RETURN QUERY
    SELECT tr.id, tr.amount, tr.bank_name, tr.status, tr.rejection_reason,
           tr.submitted_at, tr.verified_at, tr.receipt_number
    FROM transfer_requests tr
    WHERE tr.student_id = p_student_id
    ORDER BY tr.submitted_at DESC
    LIMIT 20;
END;
$$;

-- Permisos
GRANT EXECUTE ON FUNCTION rpc_client_submit_transfer TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_get_requests TO anon;

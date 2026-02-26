-- =============================================
-- Studio Dancers - v17: Portal del Cliente
-- Tabla transfer_requests, campos bancarios, Storage bucket, funciones RPC
-- =============================================

-- 1. Nuevas columnas en school_settings (datos bancarios del estudio)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'bank_name') THEN
        ALTER TABLE school_settings ADD COLUMN bank_name TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'bank_account_number') THEN
        ALTER TABLE school_settings ADD COLUMN bank_account_number TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'bank_account_holder') THEN
        ALTER TABLE school_settings ADD COLUMN bank_account_holder TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'bank_account_type') THEN
        ALTER TABLE school_settings ADD COLUMN bank_account_type TEXT DEFAULT 'Ahorros';
    END IF;
END $$;

-- 2. Tabla transfer_requests
CREATE TABLE IF NOT EXISTS transfer_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    amount DECIMAL(10,2) NOT NULL,
    bank_name TEXT,
    receipt_image_url TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    rejection_reason TEXT,
    submitted_by_cedula TEXT NOT NULL,
    submitted_by_phone TEXT NOT NULL,
    submitted_at TIMESTAMPTZ DEFAULT now(),
    verified_at TIMESTAMPTZ,
    verified_by UUID,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_transfer_requests_status ON transfer_requests(status);
CREATE INDEX IF NOT EXISTS idx_transfer_requests_student ON transfer_requests(student_id);

-- 3. Storage bucket para comprobantes
INSERT INTO storage.buckets (id, name, public)
VALUES ('transfer-receipts', 'transfer-receipts', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (drop+create para idempotencia)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can upload receipts" ON storage.objects;
    DROP POLICY IF EXISTS "Anyone can view receipts" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can delete receipts" ON storage.objects;
END $$;

CREATE POLICY "Anyone can upload receipts"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (bucket_id = 'transfer-receipts');

CREATE POLICY "Anyone can view receipts"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'transfer-receipts');

CREATE POLICY "Auth users can delete receipts"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'transfer-receipts');

-- 4. Funciones RPC para acceso seguro del portal

-- 4a. Login del cliente: busca alumnos por cédula + últimos 4 dígitos del teléfono
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
    enrollment_date DATE
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT
        s.id, s.name, s.course_id,
        COALESCE(c.name, 'Sin curso')::TEXT as course_name,
        s.monthly_fee, s.next_payment_date, s.payment_status,
        s.balance, s.amount_paid, s.is_paused, s.active,
        s.last_payment_date, s.enrollment_date
    FROM students s
    LEFT JOIN courses c ON c.id = s.course_id OR c.code = s.course_id
    WHERE s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );
END;
$$;

-- 4b. Historial de pagos del alumno
CREATE OR REPLACE FUNCTION rpc_client_payment_history(p_cedula TEXT, p_phone_last4 TEXT, p_student_id UUID)
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    payment_date DATE,
    payment_method TEXT,
    receipt_number TEXT,
    payment_type TEXT,
    created_at TIMESTAMPTZ
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    -- Validar acceso: el alumno debe pertenecer a esta cédula+teléfono
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
        RETURN; -- retorna vacío si no tiene acceso
    END IF;

    RETURN QUERY
    SELECT p.id, p.amount, p.payment_date, p.payment_method, p.receipt_number, p.payment_type, p.created_at
    FROM payments p
    WHERE p.student_id = p_student_id
    ORDER BY p.payment_date DESC
    LIMIT 24;
END;
$$;

-- 4c. Obtener datos bancarios del estudio (público)
CREATE OR REPLACE FUNCTION rpc_client_get_bank_info()
RETURNS TABLE (
    school_name TEXT,
    school_logo TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_holder TEXT,
    bank_account_type TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT s.name, s.logo_url, s.bank_name, s.bank_account_number, s.bank_account_holder, s.bank_account_type
    FROM school_settings s
    WHERE s.id = 1;
END;
$$;

-- 4d. Enviar solicitud de transferencia
CREATE OR REPLACE FUNCTION rpc_client_submit_transfer(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID,
    p_amount DECIMAL,
    p_bank_name TEXT,
    p_receipt_image_url TEXT,
    p_notes TEXT DEFAULT NULL
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

    INSERT INTO transfer_requests (student_id, amount, bank_name, receipt_image_url, submitted_by_cedula, submitted_by_phone, notes)
    VALUES (p_student_id, p_amount, p_bank_name, p_receipt_image_url, p_cedula, p_phone_last4, p_notes)
    RETURNING id INTO v_request_id;

    RETURN v_request_id;
END;
$$;

-- 4e. Ver solicitudes del alumno
CREATE OR REPLACE FUNCTION rpc_client_get_requests(p_cedula TEXT, p_phone_last4 TEXT, p_student_id UUID)
RETURNS TABLE (
    id UUID,
    amount DECIMAL,
    bank_name TEXT,
    status TEXT,
    rejection_reason TEXT,
    submitted_at TIMESTAMPTZ,
    verified_at TIMESTAMPTZ
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
    SELECT tr.id, tr.amount, tr.bank_name, tr.status, tr.rejection_reason, tr.submitted_at, tr.verified_at
    FROM transfer_requests tr
    WHERE tr.student_id = p_student_id
    ORDER BY tr.submitted_at DESC
    LIMIT 20;
END;
$$;

-- Permisos para anon (el portal usa anon key)
GRANT EXECUTE ON FUNCTION rpc_client_login TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_payment_history TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_get_bank_info TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_submit_transfer TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_get_requests TO anon;

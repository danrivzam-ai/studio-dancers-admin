-- =====================================================
-- Studio Dancers Admin - v31: Facturación Electrónica SRI
-- =====================================================
-- Agrega tablas y columnas para facturación electrónica
-- Compatible con SRI Ecuador (ADLAB STUDIO S.A.S.)
-- =====================================================

-- 1. Tabla de secuenciales de factura
CREATE TABLE IF NOT EXISTS invoice_sequences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  establishment TEXT NOT NULL DEFAULT '001',
  emission_point TEXT NOT NULL DEFAULT '001',
  environment TEXT NOT NULL DEFAULT '1' CHECK (environment IN ('1', '2')),
  last_number INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(establishment, emission_point, environment)
);

-- Insertar secuencial por defecto (pruebas)
INSERT INTO invoice_sequences (establishment, emission_point, environment, last_number)
VALUES ('001', '001', '1', 0)
ON CONFLICT (establishment, emission_point, environment) DO NOTHING;

-- Insertar secuencial por defecto (producción)
INSERT INTO invoice_sequences (establishment, emission_point, environment, last_number)
VALUES ('001', '001', '2', 0)
ON CONFLICT (establishment, emission_point, environment) DO NOTHING;

-- 2. Tabla de facturas
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identificadores SRI
  invoice_number TEXT NOT NULL,
  access_key TEXT,
  authorization_number TEXT,
  authorization_date TIMESTAMPTZ,

  -- Estado
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'signed', 'sent', 'authorized', 'rejected', 'voided')),
  sri_response JSONB,

  -- Emisor (snapshot al momento de crear)
  issuer_ruc TEXT NOT NULL,
  issuer_name TEXT NOT NULL,
  issuer_trade_name TEXT,
  issuer_address TEXT,

  -- Comprador
  buyer_id_type TEXT NOT NULL DEFAULT '07' CHECK (buyer_id_type IN ('04', '05', '06', '07')),
  buyer_id_number TEXT NOT NULL DEFAULT '9999999999999',
  buyer_name TEXT NOT NULL,
  buyer_email TEXT,
  buyer_phone TEXT,
  buyer_address TEXT,

  -- Montos
  subtotal_0 DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_12 DECIMAL(10,2) NOT NULL DEFAULT 0,
  iva_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,

  -- Método de pago SRI
  payment_method_sri TEXT DEFAULT '01' CHECK (payment_method_sri IN ('01', '15', '16', '17', '19', '20')),

  -- Referencias
  payment_id UUID REFERENCES payments(id),
  student_id UUID REFERENCES students(id),
  sale_plan_id UUID,

  -- XML y PDF
  xml_signed TEXT,
  ride_pdf_url TEXT,

  -- Ambiente
  environment TEXT NOT NULL DEFAULT '1' CHECK (environment IN ('1', '2')),

  -- Auditoría
  created_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID,
  voided_at TIMESTAMPTZ,
  voided_reason TEXT
);

-- 3. Tabla de items de factura
CREATE TABLE IF NOT EXISTS invoice_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(10,2) NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  iva_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  iva_code TEXT NOT NULL DEFAULT '0',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Índices
CREATE INDEX IF NOT EXISTS idx_invoices_payment_id ON invoices(payment_id);
CREATE INDEX IF NOT EXISTS idx_invoices_student_id ON invoices(student_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoices_access_key ON invoices(access_key);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 5. Agregar columnas SRI a school_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_environment') THEN
    ALTER TABLE school_settings ADD COLUMN sri_environment TEXT DEFAULT '1';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_establishment') THEN
    ALTER TABLE school_settings ADD COLUMN sri_establishment TEXT DEFAULT '001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_emission_point') THEN
    ALTER TABLE school_settings ADD COLUMN sri_emission_point TEXT DEFAULT '001';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_invoicing_enabled') THEN
    ALTER TABLE school_settings ADD COLUMN sri_invoicing_enabled BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_obligado_contabilidad') THEN
    ALTER TABLE school_settings ADD COLUMN sri_obligado_contabilidad BOOLEAN DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_contribuyente_especial') THEN
    ALTER TABLE school_settings ADD COLUMN sri_contribuyente_especial TEXT DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'school_settings' AND column_name = 'sri_main_activity') THEN
    ALTER TABLE school_settings ADD COLUMN sri_main_activity TEXT DEFAULT 'P8549.03';
  END IF;
END $$;

-- 6. RLS (Row Level Security)
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_sequences ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoices_auth_all' AND tablename = 'invoices') THEN
    CREATE POLICY invoices_auth_all ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_items_auth_all' AND tablename = 'invoice_items') THEN
    CREATE POLICY invoice_items_auth_all ON invoice_items FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'invoice_sequences_auth_all' AND tablename = 'invoice_sequences') THEN
    CREATE POLICY invoice_sequences_auth_all ON invoice_sequences FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- =====================================================
-- NOTAS DE IMPLEMENTACIÓN:
-- - IVA 0% para todos los servicios de enseñanza de danza (P8549.03)
-- - buyer_id_type: 04=RUC, 05=Cédula, 06=Pasaporte, 07=Consumidor Final
-- - payment_method_sri: 01=Efectivo, 19=Tarjeta Crédito, 20=Transferencia
-- - environment: 1=Pruebas, 2=Producción
-- - status flow: draft → signed → sent → authorized (o rejected/voided)
-- =====================================================

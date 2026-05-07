-- =====================================================
-- Studio Dancers Admin - v36: Integración Factuplan
-- =====================================================
-- Agrega columnas para vincular facturas con Factuplan
-- y el punto de emisión configurado en su cuenta.
-- =====================================================

-- 1. Columnas Factuplan en tabla invoices
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'factuplan_id') THEN
    ALTER TABLE invoices ADD COLUMN factuplan_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'pdf_url') THEN
    ALTER TABLE invoices ADD COLUMN pdf_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'invoices' AND column_name = 'xml_url') THEN
    ALTER TABLE invoices ADD COLUMN xml_url TEXT;
  END IF;
END $$;

-- 2. Ampliar constraint de status para incluir 'processing'
--    (Factuplan puede devolver PROCESSING mientras el SRI procesa)
ALTER TABLE invoices DROP CONSTRAINT IF EXISTS invoices_status_check;
ALTER TABLE invoices ADD CONSTRAINT invoices_status_check
  CHECK (status IN ('draft', 'processing', 'signed', 'sent', 'authorized', 'rejected', 'voided'));

-- 3. Columna Factuplan en school_settings
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                 WHERE table_name = 'school_settings' AND column_name = 'factuplan_emission_point_id') THEN
    ALTER TABLE school_settings ADD COLUMN factuplan_emission_point_id TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. Índice para búsqueda por factuplan_id
CREATE INDEX IF NOT EXISTS idx_invoices_factuplan_id ON invoices(factuplan_id);

-- =====================================================
-- INSTRUCCIONES POST-MIGRACIÓN:
-- 1. Agregar secreto FACTUPLAN_API_KEY en Supabase → Settings → Edge Functions → Secrets
-- 2. Deploy de la Edge Function: supabase functions deploy emitir-factura
-- 3. En Settings de la app: ingresar el UUID del punto de emisión de Factuplan
--    y cambiar sri_environment a '2' (producción) cuando el certificado esté listo
-- 4. Activar sri_invoicing_enabled = true en configuración de la escuela
-- =====================================================

-- ============================================================
-- MIGRACION V16: MailerLite email marketing integration
-- ============================================================
-- Agrega API key y group ID de MailerLite a school_settings
-- para sincronización automática de suscriptores al registrar alumnos

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_settings' AND column_name = 'mailerlite_api_key'
    ) THEN
        ALTER TABLE school_settings ADD COLUMN mailerlite_api_key TEXT DEFAULT NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_settings' AND column_name = 'mailerlite_group_id'
    ) THEN
        ALTER TABLE school_settings ADD COLUMN mailerlite_group_id TEXT DEFAULT NULL;
    END IF;
END $$;

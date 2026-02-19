-- ============================================================
-- MIGRACION V12: Auto-inactivación de alumnas
-- ============================================================
-- Agrega configuración de días de gracia antes de marcar alumna como inactiva
-- Después de X días sin pagar, la alumna pasa a estado "Inactiva" automáticamente

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'school_settings' AND column_name = 'auto_inactive_days'
    ) THEN
        ALTER TABLE school_settings ADD COLUMN auto_inactive_days INTEGER DEFAULT 10;
    END IF;
END $$;

COMMENT ON COLUMN school_settings.auto_inactive_days IS 'Días de gracia después de vencimiento antes de marcar alumna como inactiva (default: 10)';

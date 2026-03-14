-- =====================================================
-- Studio Dancers v31: Sistema de mora y suspensión
-- =====================================================
-- Ejecutar en Supabase SQL Editor

-- 1. Agregar campos de control de mora a school_settings
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS grace_days  INTEGER DEFAULT 5,
  ADD COLUMN IF NOT EXISTS mora_days   INTEGER DEFAULT 20;

-- 2. Actualizar auto_inactive_days a 60 para que sea coherente
--    con el nuevo flujo:
--    días 1-5 gracia | 6-20 vencida | 21-60 suspendida | 61+ inactiva
UPDATE school_settings
SET auto_inactive_days = 60
WHERE auto_inactive_days IS NULL OR auto_inactive_days <= 20;

-- 3. Asegurarse de que el registro base tenga valores
INSERT INTO school_settings (id, grace_days, mora_days, auto_inactive_days)
VALUES (1, 5, 20, 60)
ON CONFLICT (id) DO UPDATE
  SET grace_days         = COALESCE(school_settings.grace_days, 5),
      mora_days          = COALESCE(school_settings.mora_days, 20),
      auto_inactive_days = GREATEST(COALESCE(school_settings.auto_inactive_days, 60), 60);

-- 4. Verificar resultado
SELECT id, grace_days, mora_days, auto_inactive_days FROM school_settings;

-- ============================================
-- v35: Tabla de intentos de login para rate limiting
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla para rastrear intentos de login (rate limiting)
CREATE TABLE IF NOT EXISTS login_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cedula TEXT NOT NULL,
  attempted_at TIMESTAMPTZ DEFAULT NOW(),
  success BOOLEAN DEFAULT false
);

-- Índice para búsqueda rápida por cédula + tiempo
CREATE INDEX IF NOT EXISTS idx_login_attempts_cedula_time
  ON login_attempts(cedula, attempted_at);

-- RLS: solo service_role puede leer/escribir (Edge Functions)
ALTER TABLE login_attempts ENABLE ROW LEVEL SECURITY;

-- No crear policies para authenticated/anon — solo service_role accede
-- (service_role bypasses RLS automáticamente)

-- Función para limpiar intentos antiguos (> 24 horas)
-- Ejecutar periódicamente via pg_cron o manualmente
CREATE OR REPLACE FUNCTION cleanup_old_login_attempts()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  DELETE FROM login_attempts
  WHERE attempted_at < NOW() - INTERVAL '24 hours';
END;
$$;

-- Verificar
SELECT 'Tabla login_attempts creada correctamente' as resultado;

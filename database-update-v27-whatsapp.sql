-- ============================================================
-- v27: WhatsApp Meta API — Credenciales + Log de mensajes
-- Ejecutar en Supabase → SQL Editor → Run
-- ============================================================

-- 1. Agregar columnas de credenciales WhatsApp y Telegram a school_settings
ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS whatsapp_phone_id  TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_token     TEXT,
  ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT,
  ADD COLUMN IF NOT EXISTS telegram_chat_id   TEXT,
  ADD COLUMN IF NOT EXISTS whatsapp_enabled   BOOLEAN NOT NULL DEFAULT false;
-- whatsapp_enabled: interruptor maestro. false = modo desarrollo/pausado, no se envía nada.

-- 2. Tabla de log de mensajes enviados por WhatsApp
--    Permite deduplicación: no se envía el mismo template al mismo alumno el mismo día
CREATE TABLE IF NOT EXISTS whatsapp_messages_log (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id    UUID        REFERENCES students(id) ON DELETE SET NULL,
  phone         TEXT        NOT NULL,
  template_name TEXT        NOT NULL,
  variables     JSONB,                                     -- variables enviadas al template
  status        TEXT        NOT NULL DEFAULT 'sent',       -- 'sent' | 'failed'
  wa_message_id TEXT,                                      -- ID retornado por Meta API
  error_message TEXT,
  sent_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_date     DATE        NOT NULL DEFAULT CURRENT_DATE  -- para filtro de duplicados del día
);

-- Índice de deduplicación: ¿ya se envió este template a este alumno hoy?
CREATE INDEX IF NOT EXISTS idx_wa_log_dedup
  ON whatsapp_messages_log (student_id, template_name, sent_date);

-- Índice para consultas del dashboard (últimos mensajes)
CREATE INDEX IF NOT EXISTS idx_wa_log_sent_at
  ON whatsapp_messages_log (sent_at DESC);

-- RLS: solo usuarios autenticados (admin)
ALTER TABLE whatsapp_messages_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "wa_log_admin_all" ON whatsapp_messages_log;
CREATE POLICY "wa_log_admin_all" ON whatsapp_messages_log
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Verificación
SELECT
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'school_settings'
  AND column_name IN ('whatsapp_phone_id', 'whatsapp_token', 'telegram_bot_token', 'telegram_chat_id', 'whatsapp_enabled')
ORDER BY column_name;

SELECT EXISTS (
  SELECT 1 FROM information_schema.tables
  WHERE table_name = 'whatsapp_messages_log'
) AS tabla_creada;

-- v29: Telegram bot para notificaciones de transferencias del portal
-- Ejecutar en Supabase SQL Editor

ALTER TABLE school_settings
  ADD COLUMN IF NOT EXISTS telegram_transfers_bot_token TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS telegram_transfers_chat_id   TEXT DEFAULT '';

-- Verificar
SELECT telegram_transfers_bot_token, telegram_transfers_chat_id FROM school_settings WHERE id = 1;

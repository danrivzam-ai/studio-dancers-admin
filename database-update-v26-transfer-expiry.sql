-- ============================================================
-- v26: Transfer Requests — Caducidad automática + estado expired
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columna expires_at (7 días desde submission)
ALTER TABLE transfer_requests
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Backfill: transferencias existentes expiran 7 días después de su envío
UPDATE transfer_requests
  SET expires_at = submitted_at + INTERVAL '7 days'
  WHERE expires_at IS NULL;

-- Default para nuevas transferencias: vencen automáticamente en 7 días
ALTER TABLE transfer_requests
  ALTER COLUMN expires_at SET DEFAULT now() + INTERVAL '7 days';

-- 2. Ampliar CHECK constraint para incluir el nuevo estado 'expired'
--    (se elimina y recrea porque PostgreSQL no permite ALTER CHECK)
ALTER TABLE transfer_requests
  DROP CONSTRAINT IF EXISTS transfer_requests_status_check;

ALTER TABLE transfer_requests
  ADD CONSTRAINT transfer_requests_status_check
  CHECK (status IN ('pending', 'approved', 'rejected', 'expired'));

-- 3. Índice para acelerar la query de expiración (status + expires_at)
CREATE INDEX IF NOT EXISTS idx_transfer_requests_expiry
  ON transfer_requests (status, expires_at)
  WHERE status = 'pending';

-- Verificación
SELECT
  COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
  COUNT(*) FILTER (WHERE status = 'approved') AS approved,
  COUNT(*) FILTER (WHERE status = 'rejected') AS rejected,
  COUNT(*) FILTER (WHERE expires_at IS NULL)  AS sin_expires_at
FROM transfer_requests;

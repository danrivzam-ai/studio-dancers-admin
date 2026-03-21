-- ============================================================
-- v36 — Módulo Clases Online
-- Tabla online_classes para gestionar clases grabadas con
-- ventana de 24h (daily) y video semanal (weekly).
-- ============================================================

-- 1. Tabla principal
CREATE TABLE IF NOT EXISTS online_classes (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          TEXT NOT NULL CHECK (type IN ('daily', 'weekly')),
  class_date    DATE NOT NULL,
  storage_key   TEXT NOT NULL,
  title         TEXT,
  file_size     BIGINT,
  active        BOOLEAN NOT NULL DEFAULT false,
  expires_at    TIMESTAMPTZ,
  uploaded_by   UUID REFERENCES auth.users(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

-- Índice parcial único: solo una clase activa por tipo+fecha
CREATE UNIQUE INDEX IF NOT EXISTS uq_online_classes_type_date
  ON online_classes (type, class_date)
  WHERE deleted_at IS NULL;

-- Índice para consultas de clases activas
CREATE INDEX IF NOT EXISTS idx_online_classes_active
  ON online_classes (active, type)
  WHERE deleted_at IS NULL AND active = true;

-- 2. RLS
ALTER TABLE online_classes ENABLE ROW LEVEL SECURITY;

-- Alumnas autenticadas pueden ver clases activas
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_select_portal' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_select_portal ON online_classes
      FOR SELECT TO authenticated
      USING (deleted_at IS NULL AND active = true);
  END IF;
END $$;

-- Admins (no portal) pueden ver todo
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_select_admin' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_select_admin ON online_classes
      FOR SELECT TO authenticated
      USING (
        deleted_at IS NULL
        AND (auth.jwt() ->> 'app_metadata')::jsonb ->> 'portal_role' IS NULL
      );
  END IF;
END $$;

-- Solo admins (no portal) pueden insertar/actualizar/eliminar
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_insert_admin' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_insert_admin ON online_classes
      FOR INSERT TO authenticated
      WITH CHECK (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'portal_role' IS NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_update_admin' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_update_admin ON online_classes
      FOR UPDATE TO authenticated
      USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'portal_role' IS NULL
      );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_delete_admin' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_delete_admin ON online_classes
      FOR DELETE TO authenticated
      USING (
        (auth.jwt() ->> 'app_metadata')::jsonb ->> 'portal_role' IS NULL
      );
  END IF;
END $$;

-- 3. Service role policy (para Edge Functions y cron)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'online_classes_service_all' AND tablename = 'online_classes'
  ) THEN
    CREATE POLICY online_classes_service_all ON online_classes
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

-- 4. Auto-expiración via pg_cron (si está habilitado)
-- Corre cada hora y desactiva clases expiradas
DO $outer$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'expire-online-classes',
      '0 * * * *',
      $$UPDATE online_classes SET active = false WHERE active = true AND expires_at < now()$$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron not available — set up external cron for class expiration';
END $outer$;

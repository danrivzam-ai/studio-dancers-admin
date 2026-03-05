-- ═══════════════════════════════════════════════════════════════════════
-- MIGRACIÓN v23: MÓDULO ALUMNAS ADULTAS — Mi Studio Portal
-- Tablas: contenido_bienestar, publicaciones_bienestar,
--         retos_semanales, publicaciones_retos, diario_alumna
-- Funciones: RPCs del portal + jobs de publicación automática
-- ═══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- 1. CONTENIDO DE BIENESTAR (48 piezas, rotación semestral)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS contenido_bienestar (
  contenido_id  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT        NOT NULL,
  categoria     TEXT        NOT NULL
    CHECK (categoria IN ('fortalecimiento','estiramiento','salud','bienestar_mental','cultura_ballet')),
  cuerpo        TEXT        NOT NULL,   -- Markdown soportado
  icono         TEXT,                   -- nombre del ícono (lucide)
  orden         INTEGER     NOT NULL UNIQUE CHECK (orden BETWEEN 1 AND 48),
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 2. PUBLICACIONES DE BIENESTAR (log cronológico de lo publicado)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicaciones_bienestar (
  publicacion_id    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  contenido_id      UUID    NOT NULL REFERENCES contenido_bienestar(contenido_id),
  fecha_publicacion DATE    NOT NULL DEFAULT CURRENT_DATE,
  ciclo_rotacion    INTEGER NOT NULL DEFAULT 1,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (contenido_id, ciclo_rotacion)  -- evitar duplicar la misma pieza en el mismo ciclo
);

CREATE INDEX IF NOT EXISTS idx_pub_bienestar_fecha
  ON publicaciones_bienestar(fecha_publicacion DESC);

-- ──────────────────────────────────────────────────────────────────────
-- 3. RETOS SEMANALES (48 retos, rotación ~11 meses)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS retos_semanales (
  reto_id       UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo        TEXT        NOT NULL,
  descripcion   TEXT        NOT NULL,
  tip_extra     TEXT,
  categoria     TEXT        NOT NULL
    CHECK (categoria IN ('fuerza','flexibilidad','equilibrio','musicalidad','conciencia_corporal')),
  orden         INTEGER     NOT NULL UNIQUE CHECK (orden BETWEEN 1 AND 48),
  activo        BOOLEAN     NOT NULL DEFAULT true,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ──────────────────────────────────────────────────────────────────────
-- 4. PUBLICACIONES DE RETOS (un reto por semana)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS publicaciones_retos (
  pub_reto_id    UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  reto_id        UUID    NOT NULL REFERENCES retos_semanales(reto_id),
  semana_inicio  DATE    NOT NULL UNIQUE,  -- lunes de la semana
  ciclo_rotacion INTEGER NOT NULL DEFAULT 1,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pub_retos_semana
  ON publicaciones_retos(semana_inicio DESC);

-- ──────────────────────────────────────────────────────────────────────
-- 5. DIARIO DE ALUMNA (privado — acceso solo vía RPC SECURITY DEFINER)
-- ──────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS diario_alumna (
  entrada_id    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  alumna_id     UUID        NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  fecha         DATE        NOT NULL DEFAULT CURRENT_DATE,
  contenido     TEXT        NOT NULL,
  estado_animo  TEXT        CHECK (estado_animo IN ('feliz','motivada','cansada','frustrada','neutral')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diario_alumna_id
  ON diario_alumna(alumna_id, fecha DESC);

-- ──────────────────────────────────────────────────────────────────────
-- 6. RLS — habilitar en todas las tablas
-- ──────────────────────────────────────────────────────────────────────
ALTER TABLE contenido_bienestar    ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicaciones_bienestar ENABLE ROW LEVEL SECURITY;
ALTER TABLE retos_semanales        ENABLE ROW LEVEL SECURITY;
ALTER TABLE publicaciones_retos    ENABLE ROW LEVEL SECURITY;
ALTER TABLE diario_alumna          ENABLE ROW LEVEL SECURITY;

-- Bienestar y Retos: lectura pública (anon puede leer, cron puede escribir)
CREATE POLICY "anon read contenido_bienestar"
  ON contenido_bienestar FOR SELECT TO anon USING (true);

CREATE POLICY "anon read publicaciones_bienestar"
  ON publicaciones_bienestar FOR SELECT TO anon USING (true);

CREATE POLICY "anon read retos_semanales"
  ON retos_semanales FOR SELECT TO anon USING (true);

CREATE POLICY "anon read publicaciones_retos"
  ON publicaciones_retos FOR SELECT TO anon USING (true);

-- Diario: SIN policies para anon ni authenticated.
-- SOLO accesible vía funciones RPC con SECURITY DEFINER.
-- El rol service_role (cron) salta RLS, pero nadie más puede leer.


-- ══════════════════════════════════════════════════════════════════════
-- RPC FUNCTIONS — PORTAL ALUMNAS ADULTAS
-- Todas verifican identidad: cedula + últimos 4 dígitos de teléfono
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Bienestar — lista de piezas publicadas (con paginación)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_bienestar(
  p_cedula     TEXT,
  p_phone4     TEXT,
  p_student_id UUID,
  p_limit      INTEGER DEFAULT 20,
  p_offset     INTEGER DEFAULT 0
)
RETURNS TABLE (
  publicacion_id    UUID,
  contenido_id      UUID,
  titulo            TEXT,
  categoria         TEXT,
  cuerpo            TEXT,
  icono             TEXT,
  fecha_publicacion DATE,
  ciclo_rotacion    INTEGER
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM students
    WHERE id = p_student_id
      AND cedula = p_cedula
      AND right(phone, 4) = p_phone4
      AND active = true
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    pb.publicacion_id,
    cb.contenido_id,
    cb.titulo,
    cb.categoria,
    cb.cuerpo,
    cb.icono,
    pb.fecha_publicacion,
    pb.ciclo_rotacion
  FROM publicaciones_bienestar pb
  JOIN contenido_bienestar cb ON cb.contenido_id = pb.contenido_id
  WHERE cb.activo = true
    AND pb.fecha_publicacion <= CURRENT_DATE
  ORDER BY pb.fecha_publicacion DESC, cb.orden ASC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Retos — activo + historial
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_retos(
  p_cedula     TEXT,
  p_phone4     TEXT,
  p_student_id UUID,
  p_limit      INTEGER DEFAULT 20
)
RETURNS TABLE (
  pub_reto_id   UUID,
  reto_id       UUID,
  titulo        TEXT,
  descripcion   TEXT,
  tip_extra     TEXT,
  categoria     TEXT,
  semana_inicio DATE,
  es_activo     BOOLEAN
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM students
    WHERE id = p_student_id
      AND cedula = p_cedula
      AND right(phone, 4) = p_phone4
      AND active = true
  ) THEN RETURN; END IF;

  RETURN QUERY
  SELECT
    pr.pub_reto_id,
    rs.reto_id,
    rs.titulo,
    rs.descripcion,
    rs.tip_extra,
    rs.categoria,
    pr.semana_inicio,
    (pr.semana_inicio = date_trunc('week', CURRENT_DATE)::date) AS es_activo
  FROM publicaciones_retos pr
  JOIN retos_semanales rs ON rs.reto_id = pr.reto_id
  WHERE rs.activo = true
    AND pr.semana_inicio <= CURRENT_DATE
  ORDER BY pr.semana_inicio DESC
  LIMIT p_limit;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Diario — listar entradas de la alumna
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_diario_list(
  p_cedula     TEXT,
  p_phone4     TEXT,
  p_student_id UUID,
  p_limit      INTEGER DEFAULT 20,
  p_offset     INTEGER DEFAULT 0
)
RETURNS TABLE (
  entrada_id   UUID,
  fecha        DATE,
  contenido    TEXT,
  estado_animo TEXT,
  created_at   TIMESTAMPTZ,
  updated_at   TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_alumna_id UUID;
BEGIN
  SELECT id INTO v_alumna_id FROM students
  WHERE id = p_student_id
    AND cedula = p_cedula
    AND right(phone, 4) = p_phone4
    AND active = true;

  IF v_alumna_id IS NULL THEN RETURN; END IF;

  RETURN QUERY
  SELECT d.entrada_id, d.fecha, d.contenido, d.estado_animo, d.created_at, d.updated_at
  FROM diario_alumna d
  WHERE d.alumna_id = v_alumna_id
  ORDER BY d.fecha DESC, d.created_at DESC
  LIMIT p_limit OFFSET p_offset;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Diario — crear entrada
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_diario_create(
  p_cedula      TEXT,
  p_phone4      TEXT,
  p_student_id  UUID,
  p_fecha       DATE,
  p_contenido   TEXT,
  p_estado_animo TEXT DEFAULT NULL
)
RETURNS TABLE (entrada_id UUID, created_at TIMESTAMPTZ)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_alumna_id  UUID;
  v_entrada_id UUID;
  v_ts         TIMESTAMPTZ;
BEGIN
  SELECT id INTO v_alumna_id FROM students
  WHERE id = p_student_id
    AND cedula = p_cedula
    AND right(phone, 4) = p_phone4
    AND active = true;

  IF v_alumna_id IS NULL THEN RETURN; END IF;

  INSERT INTO diario_alumna (alumna_id, fecha, contenido, estado_animo)
  VALUES (v_alumna_id, p_fecha, trim(p_contenido), p_estado_animo)
  RETURNING diario_alumna.entrada_id, diario_alumna.created_at
  INTO v_entrada_id, v_ts;

  RETURN QUERY SELECT v_entrada_id, v_ts;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Diario — actualizar entrada
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_diario_update(
  p_cedula       TEXT,
  p_phone4       TEXT,
  p_student_id   UUID,
  p_entrada_id   UUID,
  p_contenido    TEXT,
  p_estado_animo TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_alumna_id UUID;
  v_rows      INTEGER;
BEGIN
  SELECT id INTO v_alumna_id FROM students
  WHERE id = p_student_id
    AND cedula = p_cedula
    AND right(phone, 4) = p_phone4
    AND active = true;

  IF v_alumna_id IS NULL THEN RETURN false; END IF;

  UPDATE diario_alumna
  SET contenido    = trim(p_contenido),
      estado_animo = p_estado_animo,
      updated_at   = now()
  WHERE entrada_id = p_entrada_id
    AND alumna_id  = v_alumna_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- RPC: Diario — eliminar entrada
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_client_adultas_diario_delete(
  p_cedula     TEXT,
  p_phone4     TEXT,
  p_student_id UUID,
  p_entrada_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_alumna_id UUID;
  v_rows      INTEGER;
BEGIN
  SELECT id INTO v_alumna_id FROM students
  WHERE id = p_student_id
    AND cedula = p_cedula
    AND right(phone, 4) = p_phone4
    AND active = true;

  IF v_alumna_id IS NULL THEN RETURN false; END IF;

  DELETE FROM diario_alumna
  WHERE entrada_id = p_entrada_id
    AND alumna_id  = v_alumna_id;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- GRANTS — acceso anon a todas las RPCs
-- ──────────────────────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION rpc_client_adultas_bienestar    TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_retos        TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_diario_list  TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_diario_create TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_diario_update TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_diario_delete TO anon;


-- ══════════════════════════════════════════════════════════════════════
-- FUNCIONES DE PUBLICACIÓN AUTOMÁTICA (llamadas por pg_cron)
-- ══════════════════════════════════════════════════════════════════════

-- ──────────────────────────────────────────────────────────────────────
-- fn_publicar_bienestar: publica la siguiente pieza en orden
-- Llamar: lunes y jueves a las 7:00 AM (America/Guayaquil = UTC-5 → 12:00 UTC)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_publicar_bienestar()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_ciclo   INTEGER;
  v_orden   INTEGER;
  v_next_id UUID;
BEGIN
  -- Último publicado
  SELECT pb.ciclo_rotacion, cb.orden
  INTO   v_ciclo, v_orden
  FROM   publicaciones_bienestar pb
  JOIN   contenido_bienestar cb ON cb.contenido_id = pb.contenido_id
  ORDER BY pb.fecha_publicacion DESC, pb.created_at DESC
  LIMIT 1;

  v_ciclo := COALESCE(v_ciclo, 1);
  v_orden := COALESCE(v_orden, 0);

  -- Siguiente en este ciclo
  SELECT contenido_id INTO v_next_id
  FROM contenido_bienestar
  WHERE orden > v_orden AND activo = true
  ORDER BY orden ASC LIMIT 1;

  -- Si se acabó el ciclo → empezar nuevo
  IF v_next_id IS NULL THEN
    v_ciclo := v_ciclo + 1;
    SELECT contenido_id INTO v_next_id
    FROM contenido_bienestar
    WHERE activo = true
    ORDER BY orden ASC LIMIT 1;
  END IF;

  IF v_next_id IS NOT NULL THEN
    INSERT INTO publicaciones_bienestar (contenido_id, fecha_publicacion, ciclo_rotacion)
    VALUES (v_next_id, CURRENT_DATE, v_ciclo)
    ON CONFLICT (contenido_id, ciclo_rotacion) DO NOTHING;
  END IF;
END;
$$;

-- ──────────────────────────────────────────────────────────────────────
-- fn_publicar_reto: publica el reto de la semana (idempotente)
-- Llamar: lunes a las 7:00 AM (12:00 UTC)
-- ──────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION fn_publicar_reto()
RETURNS void LANGUAGE plpgsql AS $$
DECLARE
  v_lunes   DATE;
  v_ciclo   INTEGER;
  v_orden   INTEGER;
  v_next_id UUID;
BEGIN
  v_lunes := date_trunc('week', CURRENT_DATE)::date;

  -- Idempotente: si ya hay reto esta semana, no hacer nada
  IF EXISTS (SELECT 1 FROM publicaciones_retos WHERE semana_inicio = v_lunes) THEN
    RETURN;
  END IF;

  -- Último publicado
  SELECT pr.ciclo_rotacion, rs.orden
  INTO   v_ciclo, v_orden
  FROM   publicaciones_retos pr
  JOIN   retos_semanales rs ON rs.reto_id = pr.reto_id
  ORDER BY pr.semana_inicio DESC, pr.created_at DESC
  LIMIT 1;

  v_ciclo := COALESCE(v_ciclo, 1);
  v_orden := COALESCE(v_orden, 0);

  SELECT reto_id INTO v_next_id
  FROM retos_semanales
  WHERE orden > v_orden AND activo = true
  ORDER BY orden ASC LIMIT 1;

  IF v_next_id IS NULL THEN
    v_ciclo := v_ciclo + 1;
    SELECT reto_id INTO v_next_id
    FROM retos_semanales
    WHERE activo = true
    ORDER BY orden ASC LIMIT 1;
  END IF;

  IF v_next_id IS NOT NULL THEN
    INSERT INTO publicaciones_retos (reto_id, semana_inicio, ciclo_rotacion)
    VALUES (v_next_id, v_lunes, v_ciclo);
  END IF;
END;
$$;


-- ══════════════════════════════════════════════════════════════════════
-- CRON JOBS (pg_cron — habilitar en Supabase: Extensions → pg_cron)
-- Horario Guayaquil UTC-5: 7:00 AM = 12:00 UTC
-- ══════════════════════════════════════════════════════════════════════

-- Bienestar: lunes (dow=1) y jueves (dow=4)
SELECT cron.schedule(
  'publicar-bienestar-lunes',
  '0 12 * * 1',
  'SELECT fn_publicar_bienestar()'
);

SELECT cron.schedule(
  'publicar-bienestar-jueves',
  '0 12 * * 4',
  'SELECT fn_publicar_bienestar()'
);

-- Reto semanal: lunes
SELECT cron.schedule(
  'publicar-reto-semanal',
  '0 12 * * 1',
  'SELECT fn_publicar_reto()'
);

-- Para ver los jobs creados:
-- SELECT * FROM cron.job;

-- Para desactivar un job si es necesario:
-- SELECT cron.unschedule('publicar-bienestar-lunes');


-- ══════════════════════════════════════════════════════════════════════
-- PUBLICACIÓN MANUAL (para cargar seed data o publicar fuera de ciclo)
-- ══════════════════════════════════════════════════════════════════════
-- Publicar todas las piezas de bienestar como historial inicial
-- (ejecutar una sola vez después de cargar el seed data):
--
-- DO $$
-- DECLARE i INTEGER;
-- BEGIN
--   FOR i IN 1..48 LOOP
--     PERFORM fn_publicar_bienestar();
--   END LOOP;
-- END $$;
--
-- Publicar primer reto de la semana actual:
-- SELECT fn_publicar_reto();

-- ═══════════════════════════════════════════════════════════════════════
-- ACTIVACIÓN INICIAL: Bienestar + Retos
-- Ejecutar en Supabase SQL Editor una sola vez.
-- Publica las primeras piezas de contenido para que aparezcan hoy.
--
-- PRE-REQUISITO: ya corriste database-update-v23-adultas-portal.sql
--                ya corriste database-seed-v23.sql
-- ═══════════════════════════════════════════════════════════════════════


-- ──────────────────────────────────────────────────────────────────────
-- PASO 1: Verificar que el contenido esté cargado
-- ──────────────────────────────────────────────────────────────────────
DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM contenido_bienestar;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'contenido_bienestar está vacía. Corre primero database-seed-v23.sql';
  END IF;
  RAISE NOTICE '✓ contenido_bienestar: % piezas disponibles', v_count;

  SELECT COUNT(*) INTO v_count FROM retos_semanales;
  IF v_count = 0 THEN
    RAISE EXCEPTION 'retos_semanales está vacía. Corre primero database-seed-v23.sql';
  END IF;
  RAISE NOTICE '✓ retos_semanales: % retos disponibles', v_count;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- PASO 2: Publicar las primeras 8 piezas de Bienestar (retroactivo)
-- Las publica con fechas de los últimos 4 lunes/jueves para que aparezcan
-- de más reciente a más antiguo, igual que haría el cron automático.
-- ON CONFLICT DO NOTHING → si ya existen, no falla.
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO publicaciones_bienestar (contenido_id, fecha_publicacion, ciclo_rotacion)
SELECT
  cb.contenido_id,
  -- Fechas retroactivas: últimas 4 semanas (lunes y jueves)
  CASE cb.orden
    WHEN 1 THEN CURRENT_DATE - 21   -- hace 3 semanas (lunes)
    WHEN 2 THEN CURRENT_DATE - 18   -- hace 3 semanas (jueves)
    WHEN 3 THEN CURRENT_DATE - 14   -- hace 2 semanas (lunes)
    WHEN 4 THEN CURRENT_DATE - 11   -- hace 2 semanas (jueves)
    WHEN 5 THEN CURRENT_DATE - 7    -- hace 1 semana  (lunes)
    WHEN 6 THEN CURRENT_DATE - 4    -- hace 1 semana  (jueves)
    WHEN 7 THEN CURRENT_DATE - 1    -- ayer (aparece como reciente)
    WHEN 8 THEN CURRENT_DATE        -- hoy
    ELSE CURRENT_DATE
  END,
  1 AS ciclo_rotacion
FROM contenido_bienestar cb
WHERE cb.orden BETWEEN 1 AND 8
  AND cb.activo = true
ON CONFLICT (contenido_id, ciclo_rotacion) DO NOTHING;

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM publicaciones_bienestar;
  RAISE NOTICE '✓ publicaciones_bienestar: % piezas publicadas', v_count;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- PASO 3: Publicar el Reto de esta semana
-- semana_inicio = lunes de la semana actual
-- ──────────────────────────────────────────────────────────────────────
INSERT INTO publicaciones_retos (reto_id, semana_inicio, ciclo_rotacion)
SELECT
  rs.reto_id,
  date_trunc('week', CURRENT_DATE)::date AS semana_inicio,
  1 AS ciclo_rotacion
FROM retos_semanales rs
WHERE rs.orden = 1
  AND rs.activo = true
ON CONFLICT (semana_inicio) DO NOTHING;

DO $$
DECLARE v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count FROM publicaciones_retos;
  RAISE NOTICE '✓ publicaciones_retos: % retos publicados', v_count;
END;
$$;


-- ──────────────────────────────────────────────────────────────────────
-- VERIFICACIÓN FINAL
-- ──────────────────────────────────────────────────────────────────────
SELECT
  'BIENESTAR' AS modulo,
  cb.titulo,
  cb.categoria,
  pb.fecha_publicacion
FROM publicaciones_bienestar pb
JOIN contenido_bienestar cb ON cb.contenido_id = pb.contenido_id
ORDER BY pb.fecha_publicacion DESC, cb.orden ASC;

SELECT
  'RETO ACTIVO' AS modulo,
  rs.titulo,
  rs.categoria,
  pr.semana_inicio
FROM publicaciones_retos pr
JOIN retos_semanales rs ON rs.reto_id = pr.reto_id
ORDER BY pr.semana_inicio DESC
LIMIT 3;

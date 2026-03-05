-- =============================================
-- Studio Dancers - v22: Dashboard Adultas
-- Ciclos, Asistencias, Bitácora, Progresión, Tips
-- =============================================

-- 1. TABLA: ciclos
CREATE TABLE IF NOT EXISTS ciclos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id TEXT NOT NULL,                    -- references courses.code or courses.id
    numero_ciclo INTEGER NOT NULL DEFAULT 1,
    total_clases INTEGER NOT NULL DEFAULT 8,
    fecha_inicio DATE NOT NULL,
    fecha_fin_estimada DATE,
    objetivo_ciclo TEXT,
    estado TEXT NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'cerrado')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(curso_id, numero_ciclo)
);

CREATE INDEX IF NOT EXISTS idx_ciclos_curso ON ciclos(curso_id);
CREATE INDEX IF NOT EXISTS idx_ciclos_estado ON ciclos(estado);

-- 2. TABLA: asistencias
CREATE TABLE IF NOT EXISTS asistencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
    alumna_id UUID NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    fecha_clase DATE NOT NULL,
    estado TEXT NOT NULL DEFAULT 'presente' CHECK (estado IN ('presente', 'ausente', 'tardia')),
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(ciclo_id, alumna_id, fecha_clase)
);

CREATE INDEX IF NOT EXISTS idx_asistencias_ciclo ON asistencias(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_asistencias_alumna ON asistencias(alumna_id);

-- 3. TABLA: bitacora_clases
CREATE TABLE IF NOT EXISTS bitacora_clases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ciclo_id UUID NOT NULL REFERENCES ciclos(id) ON DELETE CASCADE,
    curso_id TEXT NOT NULL,
    fecha_clase DATE NOT NULL,
    titulo TEXT,
    contenido TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bitacora_curso ON bitacora_clases(curso_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_ciclo ON bitacora_clases(ciclo_id);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha ON bitacora_clases(fecha_clase DESC);

-- 4. TABLA: progresion_plantillas
CREATE TABLE IF NOT EXISTS progresion_plantillas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    descripcion TEXT,
    curso_tipo TEXT DEFAULT 'adultas',          -- 'adultas' | 'ninas'
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. TABLA: progresion_bloques
CREATE TABLE IF NOT EXISTS progresion_bloques (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plantilla_id UUID NOT NULL REFERENCES progresion_plantillas(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. TABLA: progresion_items
CREATE TABLE IF NOT EXISTS progresion_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bloque_id UUID NOT NULL REFERENCES progresion_bloques(id) ON DELETE CASCADE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    enlace_glosario UUID,                       -- future: ID in glosario table
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 7. TABLA: progresion_estado (estado por curso por ítem — progresión grupal)
CREATE TABLE IF NOT EXISTS progresion_estado (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id TEXT NOT NULL,
    item_id UUID NOT NULL REFERENCES progresion_items(id) ON DELETE CASCADE,
    estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'en_curso', 'cubierto')),
    ciclo_id UUID REFERENCES ciclos(id),        -- en qué ciclo se cubrió
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(curso_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_progresion_estado_curso ON progresion_estado(curso_id);

-- 8. Agregar plantilla_progresion_id a courses
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'courses' AND column_name = 'plantilla_progresion_id'
    ) THEN
        ALTER TABLE courses ADD COLUMN plantilla_progresion_id UUID REFERENCES progresion_plantillas(id);
    END IF;
END $$;

-- 9. TABLA: tips_curso
CREATE TABLE IF NOT EXISTS tips_curso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    curso_id TEXT NOT NULL,
    titulo TEXT NOT NULL,
    contenido TEXT NOT NULL,
    publicado BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tips_curso ON tips_curso(curso_id);
CREATE INDEX IF NOT EXISTS idx_tips_created ON tips_curso(created_at DESC);

-- ── RLS ──────────────────────────────────────────────────────────
ALTER TABLE ciclos ENABLE ROW LEVEL SECURITY;
ALTER TABLE asistencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE bitacora_clases ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresion_plantillas ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresion_bloques ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresion_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE progresion_estado ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips_curso ENABLE ROW LEVEL SECURITY;

-- Authenticated users (admin/instructors) have full access
DROP POLICY IF EXISTS "auth_all_ciclos" ON ciclos;
DROP POLICY IF EXISTS "auth_all_asistencias" ON asistencias;
DROP POLICY IF EXISTS "auth_all_bitacora" ON bitacora_clases;
DROP POLICY IF EXISTS "auth_all_plantillas" ON progresion_plantillas;
DROP POLICY IF EXISTS "auth_all_bloques" ON progresion_bloques;
DROP POLICY IF EXISTS "auth_all_items" ON progresion_items;
DROP POLICY IF EXISTS "auth_all_estado" ON progresion_estado;
DROP POLICY IF EXISTS "auth_all_tips" ON tips_curso;

CREATE POLICY "auth_all_ciclos" ON ciclos TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_asistencias" ON asistencias TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bitacora" ON bitacora_clases TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_plantillas" ON progresion_plantillas TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_bloques" ON progresion_bloques TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_items" ON progresion_items TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_estado" ON progresion_estado TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "auth_all_tips" ON tips_curso TO authenticated USING (true) WITH CHECK (true);

-- ── RPC FUNCTIONS (SECURITY DEFINER — accesibles a anon) ─────────

-- ── RPC: Ciclo actual + asistencias (Block 1) ────────────────────
DROP FUNCTION IF EXISTS rpc_client_adultas_ciclo(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION rpc_client_adultas_ciclo(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_course_id TEXT;
    v_ciclo_id UUID;
    v_result JSON;
BEGIN
    -- Validar acceso y obtener course_id
    SELECT s.course_id INTO v_course_id
    FROM students s
    WHERE s.id = p_student_id AND s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );

    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Obtener ciclo activo del curso
    SELECT id INTO v_ciclo_id
    FROM ciclos
    WHERE curso_id = v_course_id AND estado = 'activo'
    ORDER BY numero_ciclo DESC
    LIMIT 1;

    IF v_ciclo_id IS NULL THEN
        -- Retornar null ciclo pero con class_days para que el frontend sepa el horario
        SELECT json_build_object(
            'ciclo', NULL,
            'asistencias', '[]'::JSON,
            'class_days', COALESCE(c.class_days::JSON, NULL)
        ) INTO v_result
        FROM courses c
        WHERE c.id::text = v_course_id OR c.code = v_course_id
        LIMIT 1;
        RETURN COALESCE(v_result, json_build_object('ciclo', NULL, 'asistencias', '[]'::JSON, 'class_days', NULL));
    END IF;

    -- Construir respuesta: datos del ciclo + asistencias + class_days del curso
    SELECT json_build_object(
        'ciclo', json_build_object(
            'id', ci.id,
            'numero_ciclo', ci.numero_ciclo,
            'total_clases', ci.total_clases,
            'fecha_inicio', ci.fecha_inicio,
            'fecha_fin_estimada', ci.fecha_fin_estimada,
            'objetivo_ciclo', ci.objetivo_ciclo,
            'estado', ci.estado
        ),
        'asistencias', COALESCE(
            (SELECT json_agg(json_build_object(
                'fecha_clase', a.fecha_clase,
                'estado', a.estado
            ) ORDER BY a.fecha_clase)
            FROM asistencias a
            WHERE a.ciclo_id = v_ciclo_id AND a.alumna_id = p_student_id),
            '[]'::JSON
        ),
        'class_days', COALESCE(c.class_days::JSON, NULL)
    ) INTO v_result
    FROM ciclos ci
    LEFT JOIN courses c ON c.id::text = v_course_id OR c.code = v_course_id
    WHERE ci.id = v_ciclo_id
    LIMIT 1;

    RETURN v_result;
END;
$$;

-- ── RPC: Bitácora de clase (Block 4) ─────────────────────────────
DROP FUNCTION IF EXISTS rpc_client_adultas_bitacora(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION rpc_client_adultas_bitacora(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_course_id TEXT;
    v_result JSON;
BEGIN
    -- Validar acceso
    SELECT s.course_id INTO v_course_id
    FROM students s
    WHERE s.id = p_student_id AND s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );

    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(json_agg(entry ORDER BY (entry->>'fecha_clase') DESC), '[]'::JSON)
    INTO v_result
    FROM (
        SELECT json_build_object(
            'id', b.id,
            'ciclo_id', b.ciclo_id,
            'numero_ciclo', ci.numero_ciclo,
            'fecha_clase', b.fecha_clase,
            'titulo', b.titulo,
            'contenido', b.contenido
        ) as entry
        FROM bitacora_clases b
        JOIN ciclos ci ON ci.id = b.ciclo_id
        WHERE b.curso_id = v_course_id
        ORDER BY b.fecha_clase DESC
        LIMIT 60
    ) entries;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ── RPC: Mapa de progresión (Block 3) ────────────────────────────
DROP FUNCTION IF EXISTS rpc_client_adultas_progresion(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION rpc_client_adultas_progresion(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_course_id TEXT;
    v_plantilla_id UUID;
    v_result JSON;
BEGIN
    -- Validar acceso y obtener course_id
    SELECT s.course_id INTO v_course_id
    FROM students s
    WHERE s.id = p_student_id AND s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );

    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Obtener plantilla asignada al curso
    SELECT c.plantilla_progresion_id INTO v_plantilla_id
    FROM courses c
    WHERE c.id::text = v_course_id OR c.code = v_course_id
    LIMIT 1;

    IF v_plantilla_id IS NULL THEN
        RETURN json_build_object('plantilla', NULL, 'bloques', '[]'::JSON);
    END IF;

    -- Construir mapa completo con estados actuales
    SELECT json_build_object(
        'plantilla', json_build_object(
            'id', p.id,
            'nombre', p.nombre,
            'descripcion', p.descripcion
        ),
        'bloques', COALESCE(
            (SELECT json_agg(
                json_build_object(
                    'id', pb.id,
                    'nombre', pb.nombre,
                    'descripcion', pb.descripcion,
                    'orden', pb.orden,
                    'items', COALESCE(
                        (SELECT json_agg(
                            json_build_object(
                                'id', pi.id,
                                'nombre', pi.nombre,
                                'descripcion', pi.descripcion,
                                'orden', pi.orden,
                                'enlace_glosario', pi.enlace_glosario,
                                'estado', COALESCE(pe.estado, 'pendiente')
                            ) ORDER BY pi.orden
                        )
                        FROM progresion_items pi
                        LEFT JOIN progresion_estado pe
                            ON pe.item_id = pi.id AND pe.curso_id = v_course_id
                        WHERE pi.bloque_id = pb.id),
                        '[]'::JSON
                    )
                ) ORDER BY pb.orden
            )
            FROM progresion_bloques pb
            WHERE pb.plantilla_id = v_plantilla_id),
            '[]'::JSON
        )
    ) INTO v_result
    FROM progresion_plantillas p
    WHERE p.id = v_plantilla_id;

    RETURN v_result;
END;
$$;

-- ── RPC: Constancia / racha (Block 2) ────────────────────────────
DROP FUNCTION IF EXISTS rpc_client_adultas_constancia(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION rpc_client_adultas_constancia(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID,
    p_umbral_pct INTEGER DEFAULT 80      -- threshold % para contar ciclo como "bueno"
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_course_id TEXT;
    v_total_clases INTEGER := 0;
    v_primera_asistencia DATE;
    v_racha INTEGER := 0;
    v_ciclo RECORD;
    v_pct NUMERIC;
BEGIN
    -- Validar acceso
    SELECT s.course_id INTO v_course_id
    FROM students s
    WHERE s.id = p_student_id AND s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );

    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Total clases asistidas (presente o tardía) — global para este alumna en todos los cursos
    SELECT COUNT(*), MIN(fecha_clase)
    INTO v_total_clases, v_primera_asistencia
    FROM asistencias
    WHERE alumna_id = p_student_id AND estado IN ('presente', 'tardia');

    -- Calcular racha: ciclos cerrados del curso en orden cronológico inverso
    FOR v_ciclo IN
        SELECT ci.id, ci.total_clases,
               COUNT(a.id) FILTER (WHERE a.estado IN ('presente', 'tardia')) AS asistidas
        FROM ciclos ci
        LEFT JOIN asistencias a ON a.ciclo_id = ci.id AND a.alumna_id = p_student_id
        WHERE ci.curso_id = v_course_id AND ci.estado = 'cerrado'
        GROUP BY ci.id, ci.total_clases, ci.numero_ciclo
        ORDER BY ci.numero_ciclo DESC
    LOOP
        IF v_ciclo.total_clases > 0 THEN
            v_pct := (v_ciclo.asistidas::NUMERIC / v_ciclo.total_clases) * 100;
        ELSE
            v_pct := 0;
        END IF;

        IF v_pct >= p_umbral_pct THEN
            v_racha := v_racha + 1;
        ELSE
            EXIT; -- racha se rompe
        END IF;
    END LOOP;

    RETURN json_build_object(
        'total_clases', v_total_clases,
        'primera_asistencia', v_primera_asistencia,
        'racha_ciclos', v_racha
    );
END;
$$;

-- ── RPC: Tip más reciente (Block 5) ──────────────────────────────
DROP FUNCTION IF EXISTS rpc_client_adultas_tips(TEXT, TEXT, UUID);
CREATE OR REPLACE FUNCTION rpc_client_adultas_tips(
    p_cedula TEXT,
    p_phone_last4 TEXT,
    p_student_id UUID
)
RETURNS JSON LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_course_id TEXT;
    v_result JSON;
BEGIN
    -- Validar acceso
    SELECT s.course_id INTO v_course_id
    FROM students s
    WHERE s.id = p_student_id AND s.active = true
      AND (s.cedula = p_cedula OR s.parent_cedula = p_cedula OR s.payer_cedula = p_cedula)
      AND (
          RIGHT(REGEXP_REPLACE(COALESCE(s.phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.parent_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
          OR RIGHT(REGEXP_REPLACE(COALESCE(s.payer_phone, ''), '\D', '', 'g'), 4) = p_phone_last4
      );

    IF v_course_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT COALESCE(json_agg(t ORDER BY t->>'created_at' DESC), '[]'::JSON)
    INTO v_result
    FROM (
        SELECT json_build_object(
            'id', tc.id,
            'titulo', tc.titulo,
            'contenido', tc.contenido,
            'created_at', tc.created_at
        ) as t
        FROM tips_curso tc
        WHERE tc.curso_id = v_course_id AND tc.publicado = true
        ORDER BY tc.created_at DESC
        LIMIT 20
    ) tips;

    RETURN COALESCE(v_result, '[]'::JSON);
END;
$$;

-- ── Permisos anon ──────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION rpc_client_adultas_ciclo TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_bitacora TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_progresion TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_constancia TO anon;
GRANT EXECUTE ON FUNCTION rpc_client_adultas_tips TO anon;

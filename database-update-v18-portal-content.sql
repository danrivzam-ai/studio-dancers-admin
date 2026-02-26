-- =============================================
-- Studio Dancers - v18: Portal Content (Cursos públicos)
-- Nuevas columnas en courses, bucket course-images, RPC rpc_public_courses
-- =============================================

-- 1. Nuevas columnas en courses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'image_url') THEN
        ALTER TABLE courses ADD COLUMN image_url TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'benefits') THEN
        ALTER TABLE courses ADD COLUMN benefits TEXT DEFAULT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'requirements') THEN
        ALTER TABLE courses ADD COLUMN requirements TEXT DEFAULT NULL;
    END IF;
END $$;

-- 2. Storage bucket para imágenes de cursos
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-images', 'course-images', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage (drop+create para idempotencia)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Anyone can view course images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can upload course images" ON storage.objects;
    DROP POLICY IF EXISTS "Auth users can delete course images" ON storage.objects;
END $$;

CREATE POLICY "Anyone can view course images"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'course-images');

CREATE POLICY "Auth users can upload course images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'course-images');

CREATE POLICY "Auth users can delete course images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'course-images');

-- 3. RPC pública para catálogo de cursos (sin auth)
CREATE OR REPLACE FUNCTION rpc_public_courses()
RETURNS TABLE (
    id UUID,
    code TEXT,
    name TEXT,
    description TEXT,
    category TEXT,
    age_min INTEGER,
    age_max INTEGER,
    schedule TEXT,
    price DECIMAL,
    price_type TEXT,
    class_days JSONB,
    classes_per_cycle INTEGER,
    image_url TEXT,
    benefits TEXT,
    requirements TEXT
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.description, c.category,
           c.age_min, c.age_max, c.schedule, c.price, c.price_type,
           c.class_days, c.classes_per_cycle,
           c.image_url, c.benefits, c.requirements
    FROM courses c
    WHERE c.active = true
    ORDER BY
        CASE c.category
            WHEN 'regular' THEN 1
            WHEN 'intensivo' THEN 2
            WHEN 'camp' THEN 3
            WHEN 'especial' THEN 4
            ELSE 5
        END,
        c.name;
END;
$$;

GRANT EXECUTE ON FUNCTION rpc_public_courses TO anon;

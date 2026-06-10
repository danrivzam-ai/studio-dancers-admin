-- ============================================================================
-- Migración v39 — rpc_public_courses devuelve ciclo escolar
-- ============================================================================
-- El portal Mi Studio enriquece cada student con datos de rpc_public_courses
-- (que lista todos los cursos activos). Para que el portal pueda mostrar el
-- ciclo escolar (inicio/fin), agregamos esos 2 campos al RETURN TABLE.
--
-- Sigue siendo público (SECURITY DEFINER, no expone más que las fechas).
-- ============================================================================

DROP FUNCTION IF EXISTS public.rpc_public_courses();

CREATE OR REPLACE FUNCTION public.rpc_public_courses()
 RETURNS TABLE(
    id uuid, code text, name text, description text, category text,
    age_min integer, age_max integer, schedule text,
    price numeric, price_type text,
    class_days jsonb, classes_per_cycle integer,
    image_url text, benefits text, requirements text,
    -- NUEVOS: ciclo escolar opcional del curso
    ciclo_inicio date, ciclo_fin date
 )
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
    RETURN QUERY
    SELECT c.id, c.code, c.name, c.description, c.category,
           c.age_min, c.age_max, c.schedule, c.price, c.price_type,
           c.class_days, c.classes_per_cycle,
           c.image_url, c.benefits, c.requirements,
           c.ciclo_inicio, c.ciclo_fin
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
$function$;

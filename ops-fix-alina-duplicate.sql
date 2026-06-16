-- ============================================================================
-- OPS — Resolver duplicado de Alina Isabella Palacios Medina
-- ============================================================================
-- Contexto: hay 2 registros activos para la misma alumna en el curso
-- 'Dance Crew - Ciclo Formativo' (course-1781621772119):
--   - ade5e3b1: 'Alina Isabella Palacios Medina' (vacío, creado por error 14:57)
--   - f342e46f: 'Alina Isabella Palacios Medina 9:2' (con pagos reales, 15:35)
--
-- El índice idx_students_unique_name_course_active impide editar el bueno
-- (f342e46f) para quitarle el sufijo '9:2' porque chocaría con el vacío.
--
-- Decisión del dueño: desactivar el duplicado vacío y limpiar el sufijo del bueno.
-- ============================================================================

-- Paso 1: Desactivar el duplicado vacío (libera el slot del índice único)
UPDATE public.students
SET active = false
WHERE id = 'ade5e3b1-7dcc-4ac8-a3ed-a96e1c6e1d29'
  AND active = true                                  -- guarda contra re-ejecución
  AND name = 'Alina Isabella Palacios Medina';

-- Paso 2: Verificar que NO hay pagos asociados al duplicado vacío (sanity check)
SELECT COUNT(*) AS pagos_del_duplicado
FROM public.payments
WHERE student_id = 'ade5e3b1-7dcc-4ac8-a3ed-a96e1c6e1d29';

-- Paso 3: Limpiar el sufijo '9:2' del registro bueno
UPDATE public.students
SET name = 'Alina Isabella Palacios Medina'
WHERE id = 'f342e46f-3cd7-454b-b61c-e0f9c2e32045'
  AND name = 'Alina Isabella Palacios Medina 9:2';   -- guarda contra re-ejecución

-- Verificación final
SELECT id, name, active, parent_name, last_payment_date
FROM public.students
WHERE id IN (
  'ade5e3b1-7dcc-4ac8-a3ed-a96e1c6e1d29',
  'f342e46f-3cd7-454b-b61c-e0f9c2e32045'
);

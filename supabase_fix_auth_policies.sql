-- ============================================================
-- FIX: Políticas RLS para rol 'authenticated' (admin)
-- El SQL de seguridad v2 habilitó RLS en varias tablas pero
-- solo creó políticas para 'anon' (portal instructoras).
-- El admin usa rol 'authenticated' (Supabase Auth) y quedó
-- sin acceso a sus propias tablas.
-- EJECUTAR: Supabase -> SQL Editor -> Run
-- ============================================================

-- cycles: admin crea, cierra y administra ciclos
DROP POLICY IF EXISTS "cycles_auth_all" ON cycles;
CREATE POLICY "cycles_auth_all" ON cycles
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- attendance: admin visualiza en AsistenciaAdmin
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "attendance_auth_all" ON attendance;
CREATE POLICY "attendance_auth_all" ON attendance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- student_notes: admin puede revisar
ALTER TABLE student_notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "student_notes_auth_all" ON student_notes;
CREATE POLICY "student_notes_auth_all" ON student_notes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- class_log (bitácora): admin puede revisar
ALTER TABLE class_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "class_log_auth_all" ON class_log;
CREATE POLICY "class_log_auth_all" ON class_log
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- weekly_tips: admin puede revisar
ALTER TABLE weekly_tips ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "weekly_tips_auth_all" ON weekly_tips;
CREATE POLICY "weekly_tips_auth_all" ON weekly_tips
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cycle_evaluations: admin visualiza reportes
ALTER TABLE cycle_evaluations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycle_evaluations_auth_all" ON cycle_evaluations;
CREATE POLICY "cycle_evaluations_auth_all" ON cycle_evaluations
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- cycle_progression: admin visualiza progresión
ALTER TABLE cycle_progression ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cycle_progression_auth_all" ON cycle_progression;
CREATE POLICY "cycle_progression_auth_all" ON cycle_progression
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- instructor_sessions: admin puede auditar sesiones
ALTER TABLE instructor_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "instructor_sessions_auth_all" ON instructor_sessions;
CREATE POLICY "instructor_sessions_auth_all" ON instructor_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Tablas opcionales (si existen)
DO $auth_opt$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='class_plans') THEN
    EXECUTE 'DROP POLICY IF EXISTS "class_plans_auth_all" ON class_plans';
    EXECUTE 'CREATE POLICY "class_plans_auth_all" ON class_plans FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='evaluations') THEN
    EXECUTE 'DROP POLICY IF EXISTS "evaluations_auth_all" ON evaluations';
    EXECUTE 'CREATE POLICY "evaluations_auth_all" ON evaluations FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='course_progression') THEN
    EXECUTE 'DROP POLICY IF EXISTS "course_progression_auth_all" ON course_progression';
    EXECUTE 'CREATE POLICY "course_progression_auth_all" ON course_progression FOR ALL TO authenticated USING (true) WITH CHECK (true)';
  END IF;
END $auth_opt$;

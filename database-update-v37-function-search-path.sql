-- ============================================================
-- v37 — Function Search Path Hardening
-- Fixes: 35 funciones con search_path mutable (WARN linter)
-- Técnica: DO block dinámico via pg_proc para cubrir todas
-- las sobrecargas sin necesidad de especificar firmas.
-- ============================================================

DO $$
DECLARE
  func_rec  RECORD;
  func_list TEXT[] := ARRAY[
    'cleanup_old_login_attempts',
    'handle_new_user_role',
    'get_instructor_from_session',
    'rpc_create_instructor_session',
    'rpc_get_instructor_by_session',
    'rpc_cleanup_expired_sessions',
    'rpc_admin_reset_student_month',
    'rpc_public_courses',
    'rpc_upgrade_password_hash',
    'rpc_reset_login_attempts',
    'rpc_client_payment_history',
    'rpc_client_get_bank_info',
    'rpc_get_course_info',
    'rpc_client_login',
    'rpc_record_login_failure',
    'rpc_first_login_change_password',
    'rpc_delete_instructor_session',
    'fn_publicar_bienestar',
    'fn_publicar_reto',
    'rpc_client_submit_transfer',
    'rpc_client_get_tips',
    'rpc_client_get_requests',
    'rpc_client_toggle_reaction',
    'rpc_client_adultas_ciclo',
    'rpc_client_adultas_bitacora',
    'fn_set_updated_at',
    'rpc_client_adultas_progresion',
    'rpc_client_adultas_constancia',
    'rpc_client_adultas_tips',
    'rpc_get_tip_reactions',
    'rpc_client_adultas_bienestar',
    'rpc_client_adultas_retos',
    'get_students_for_export',
    'rpc_client_adultas_diario_list',
    'rpc_client_adultas_diario_create',
    'rpc_client_adultas_diario_update',
    'rpc_client_adultas_diario_delete'
  ];
BEGIN
  FOR func_rec IN
    SELECT p.oid::regprocedure AS signature
    FROM   pg_proc      p
    JOIN   pg_namespace n ON p.pronamespace = n.oid
    WHERE  n.nspname = 'public'
      AND  p.proname = ANY(func_list)
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = public',
        func_rec.signature
      );
      RAISE NOTICE 'Fixed search_path: %', func_rec.signature;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Could not alter %: %', func_rec.signature, SQLERRM;
    END;
  END LOOP;
END
$$;


-- ============================================================
-- Verificación: lista las funciones que aún tienen
-- search_path mutable después del fix (debería estar vacía)
-- ============================================================
SELECT p.proname                          AS funcion,
       pg_get_function_identity_arguments(p.oid) AS argumentos,
       p.proconfig                        AS config
FROM   pg_proc      p
JOIN   pg_namespace n ON p.pronamespace = n.oid
WHERE  n.nspname = 'public'
  AND  p.proname = ANY(ARRAY[
    'cleanup_old_login_attempts','handle_new_user_role',
    'get_instructor_from_session','rpc_create_instructor_session',
    'rpc_get_instructor_by_session','rpc_cleanup_expired_sessions',
    'rpc_admin_reset_student_month','rpc_public_courses',
    'rpc_upgrade_password_hash','rpc_reset_login_attempts',
    'rpc_client_payment_history','rpc_client_get_bank_info',
    'rpc_get_course_info','rpc_client_login',
    'rpc_record_login_failure','rpc_first_login_change_password',
    'rpc_delete_instructor_session','fn_publicar_bienestar',
    'fn_publicar_reto','rpc_client_submit_transfer',
    'rpc_client_get_tips','rpc_client_get_requests',
    'rpc_client_toggle_reaction','rpc_client_adultas_ciclo',
    'rpc_client_adultas_bitacora','fn_set_updated_at',
    'rpc_client_adultas_progresion','rpc_client_adultas_constancia',
    'rpc_client_adultas_tips','rpc_get_tip_reactions',
    'rpc_client_adultas_bienestar','rpc_client_adultas_retos',
    'get_students_for_export','rpc_client_adultas_diario_list',
    'rpc_client_adultas_diario_create','rpc_client_adultas_diario_update',
    'rpc_client_adultas_diario_delete'
  ])
  AND (p.proconfig IS NULL OR NOT EXISTS (
    SELECT 1 FROM unnest(p.proconfig) cfg
    WHERE cfg LIKE 'search_path%'
  ))
ORDER BY p.proname;

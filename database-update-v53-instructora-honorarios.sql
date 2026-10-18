-- ── v53: "Mis honorarios" en el portal de instructoras ───────────────────────
--
-- El portal de instructoras (studio-dancers-instructoras) no usa Supabase Auth:
-- identifica a la instructora por el header x-session-token y
-- get_instructor_from_session(). Las tablas de honorarios (payment_periods,
-- payment_details) y los datos bancarios de instructors son solo staff (v42,
-- v51), así que el portal las lee con esta RPC SECURITY DEFINER que devuelve
-- únicamente lo de la instructora de la sesión:
--   - su tarifa base y sus datos bancarios (v51)
--   - su horario con la tarifa efectiva de cada clase (horario o base)
--   - sus comprobantes (payment_periods) con el detalle por horario
--
-- Sin sesión válida lanza 'sin_sesion'. Solo lectura.
-- Idempotente: se puede ejecutar varias veces.

CREATE OR REPLACE FUNCTION public.rpc_instructora_honorarios()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id uuid := public.get_instructor_from_session();
  v_result jsonb;
BEGIN
  IF v_id IS NULL THEN
    RAISE EXCEPTION 'sin_sesion';
  END IF;

  SELECT jsonb_build_object(
    'tarifa_hora', i.tarifa_hora,
    'banco', jsonb_build_object(
      'nombre',          i.banco_nombre,
      'tipo_cuenta',     i.banco_tipo_cuenta,
      'numero_cuenta',   i.banco_numero_cuenta,
      'titular',         i.banco_titular,
      'cedula_titular',  i.banco_cedula_titular
    ),
    'horario', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'day_of_week', s.day_of_week,
        'time_start',  s.time_start,
        'time_end',    s.time_end,
        'group_name',  s.group_name,
        'tarifa_hora', COALESCE(s.tarifa_hora, i.tarifa_hora),
        'tarifa_propia', s.tarifa_hora IS NOT NULL
      ) ORDER BY s.day_of_week, s.time_start)
      FROM public.instructor_schedule s
      WHERE s.instructor_id = i.id
    ), '[]'::jsonb),
    'periodos', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id',                   p.id,
        'numero_comprobante',   p.numero_comprobante,
        'fecha_inicio',         p.fecha_inicio,
        'fecha_fin',            p.fecha_fin,
        'total_horas',          p.total_horas,
        'total_pagar',          p.total_pagar,
        'tarifa_hora_snapshot', p.tarifa_hora_snapshot,
        'observaciones',        p.observaciones,
        'creado_en',            p.creado_en,
        'detalles', COALESCE((
          SELECT jsonb_agg(jsonb_build_object(
            'dia_semana',         d.dia_semana,
            'dia_nombre',         d.dia_nombre,
            'horario',            d.horario,
            'group_name',         d.group_name,
            'horas_clase',        d.horas_clase,
            'clases_programadas', d.clases_programadas,
            'canceladas',         d.canceladas,
            'recuperaciones',     d.recuperaciones,
            'clases_efectivas',   d.clases_efectivas,
            'horas_trabajadas',   d.horas_trabajadas,
            'tarifa_hora',        d.tarifa_hora,
            'monto',              d.monto
          ) ORDER BY d.dia_semana)
          FROM public.payment_details d
          WHERE d.periodo_id = p.id
        ), '[]'::jsonb)
      ) ORDER BY p.fecha_fin DESC, p.creado_en DESC)
      FROM public.payment_periods p
      WHERE p.instructor_id = i.id
    ), '[]'::jsonb)
  )
  INTO v_result
  FROM public.instructors i
  WHERE i.id = v_id AND i.active = true;

  IF v_result IS NULL THEN
    RAISE EXCEPTION 'sin_sesion';
  END IF;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.rpc_instructora_honorarios() FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.rpc_instructora_honorarios() TO anon;

-- Verificación: sin header x-session-token debe fallar con 'sin_sesion'
-- SELECT public.rpc_instructora_honorarios();

-- ══════════════════════════════════════════════════════════════════
--  USUARIO DEMO — Solo para demostraciones
--  NO afecta datos reales. Alumna ficticia con datos de muestra.
--
--  CREDENCIALES DE ACCESO (Portal de Alumnos):
--    Cédula       : 0000000001
--    Últimos 4 tel: 1234
--
--  Para ELIMINAR el demo después: ejecuta el bloque al final del archivo.
-- ══════════════════════════════════════════════════════════════════


-- ── 1. ALUMNA DEMO ────────────────────────────────────────────────
INSERT INTO students (
  id,
  name,
  cedula,
  phone,
  email,
  is_minor,
  active,
  is_paused,
  course_id,
  monthly_fee,
  enrollment_date,
  payment_status,
  notes
) VALUES (
  'a0000000-0000-0000-0000-000000000001',   -- ID fijo para poder eliminar fácilmente
  'DEMO — Alumna de Prueba',
  '0000000001',                              -- Cédula de acceso
  '0999991234',                              -- Últimos 4: 1234
  'demo@studiodancers.com',
  false,                                     -- Es adulta
  true,
  false,
  'ballet-adultos-semana',                   -- Curso: Ballet Adultos M-J
  40.00,
  '2026-01-01',
  'paid',
  '⚠ CUENTA DEMO — No eliminar sin usar el script de limpieza'
)
ON CONFLICT (id) DO NOTHING;


-- ── 2. PAGOS DE MUESTRA ───────────────────────────────────────────
-- 3 meses: enero pagado, febrero pagado, marzo pendiente de verificación

INSERT INTO payments (student_id, amount, payment_date, receipt_number, payment_method, notes)
VALUES
  -- Enero: pagado
  (
    'a0000000-0000-0000-0000-000000000001',
    40.00,
    '2026-01-06',
    'DEMO-202601',
    'Transferencia',
    'Pago demo enero'
  ),
  -- Febrero: pagado
  (
    'a0000000-0000-0000-0000-000000000001',
    40.00,
    '2026-02-03',
    'DEMO-202602',
    'Efectivo',
    'Pago demo febrero'
  ),
  -- Marzo: registrado (simula comprobante subido, pendiente de verificación)
  (
    'a0000000-0000-0000-0000-000000000001',
    40.00,
    '2026-03-04',
    'DEMO-202603',
    'Transferencia',
    'Pago demo marzo — pendiente verificación'
  )
ON CONFLICT DO NOTHING;


-- ══════════════════════════════════════════════════════════════════
--  PARA ELIMINAR EL DEMO (cuando ya no lo necesites):
--  Ejecuta solo este bloque:
-- ══════════════════════════════════════════════════════════════════

/*

DELETE FROM payments
WHERE student_id = 'a0000000-0000-0000-0000-000000000001';

DELETE FROM students
WHERE id = 'a0000000-0000-0000-0000-000000000001';

*/

-- ── v37: Pausa multi-día con auto-descongelamiento ──────────────────────────
-- pause_until_date : fecha en que se debe quitar el flag automáticamente
-- pause_classes_count: cuántas clases se pausaron (para auditoría / UI)

ALTER TABLE students
  ADD COLUMN IF NOT EXISTS pause_until_date    DATE,
  ADD COLUMN IF NOT EXISTS pause_classes_count INT DEFAULT 0;

-- Comentarios descriptivos
COMMENT ON COLUMN students.pause_until_date    IS 'Fecha en que la pausa expira automáticamente (calculada por clases)';
COMMENT ON COLUMN students.pause_classes_count IS 'Número de clases pausadas en el ciclo activo';

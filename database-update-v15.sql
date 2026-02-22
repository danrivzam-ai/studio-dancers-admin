-- v15: Agregar dirección del alumno (para adultos y menores)
-- Ejecutar en Supabase SQL Editor

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'students' AND column_name = 'address') THEN
    ALTER TABLE students ADD COLUMN address TEXT DEFAULT NULL;
    RAISE NOTICE 'Columna address agregada a students';
  END IF;
END $$;

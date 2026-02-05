-- Agregar columna de dirección del pagador
ALTER TABLE students
ADD COLUMN IF NOT EXISTS payer_address TEXT DEFAULT NULL;

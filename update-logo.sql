-- Actualizar el logo a usar el archivo local
UPDATE school_settings
SET logo_url = '/logo.png'
WHERE id = 1;

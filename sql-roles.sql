-- ============================================
-- Sistema de Roles - Studio Dancers
-- Ejecutar en Supabase SQL Editor
-- ============================================

-- Tabla de roles de usuario
CREATE TABLE IF NOT EXISTS user_roles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'receptionist',
    display_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    UNIQUE(user_id),
    UNIQUE(email),
    CONSTRAINT valid_role CHECK (role IN ('admin', 'receptionist', 'viewer'))
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);

-- Habilitar RLS
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Políticas: todos pueden leer roles (para verificar permisos)
DROP POLICY IF EXISTS "Users can view all roles" ON user_roles;
CREATE POLICY "Users can view all roles" ON user_roles
    FOR SELECT USING (true);

-- Solo admins pueden insertar roles
DROP POLICY IF EXISTS "Admins can insert roles" ON user_roles;
CREATE POLICY "Admins can insert roles" ON user_roles
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
        OR NOT EXISTS (SELECT 1 FROM user_roles) -- Permite el primer usuario
    );

-- Solo admins pueden actualizar roles
DROP POLICY IF EXISTS "Admins can update roles" ON user_roles;
CREATE POLICY "Admins can update roles" ON user_roles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Solo admins pueden eliminar roles
DROP POLICY IF EXISTS "Admins can delete roles" ON user_roles;
CREATE POLICY "Admins can delete roles" ON user_roles
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM user_roles
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- Función para asignar rol automáticamente al primer usuario como admin
CREATE OR REPLACE FUNCTION handle_new_user_role()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no hay usuarios, el primero es admin
    IF NOT EXISTS (SELECT 1 FROM user_roles) THEN
        INSERT INTO user_roles (user_id, email, role, display_name)
        VALUES (NEW.id, NEW.email, 'admin', COALESCE(NEW.raw_user_meta_data->>'studio_name', 'Administrador'));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para nuevo usuario
DROP TRIGGER IF EXISTS on_auth_user_created_role ON auth.users;
CREATE TRIGGER on_auth_user_created_role
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user_role();

-- Verificar
SELECT 'Tabla de roles creada correctamente' as resultado;

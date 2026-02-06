-- ============================================================
-- MIGRACIÓN V10: Sistema de Egresos y Control de Caja
-- Studio Dancers Administration
-- Fecha: 2026-02-05
-- ============================================================
-- Este script crea las tablas necesarias para:
-- 1. Categorías y subcategorías de egresos
-- 2. Registro de egresos (expenses)
-- 3. Movimientos de caja (depósitos, retiros, préstamos)
-- 4. Log de importaciones externas
-- 5. Log de auditoría inmutable
-- 6. Mejoras a cash_registers (turnos, tracking de egresos)
-- 7. Nuevos roles (supervisor, contador)
-- ============================================================


-- ============================================================
-- PARTE 1: TABLAS NUEVAS
-- ============================================================

-- 1.1 Categorías de egresos
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'expense' CHECK (type IN ('expense', 'income')),
    color VARCHAR(7),
    monthly_budget DECIMAL(10,2),
    active BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.2 Subcategorías de egresos
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_subcategories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    category_id UUID NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.3 Egresos (expenses)
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cash_register_id UUID REFERENCES cash_registers(id),
    category_id UUID NOT NULL REFERENCES expense_categories(id),
    subcategory_id UUID REFERENCES expense_subcategories(id),
    description TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash', 'transfer', 'card', 'check')),
    receipt_number VARCHAR(50),
    receipt_image_url TEXT,
    provider VARCHAR(100),
    requires_approval BOOLEAN DEFAULT false,
    approved_by UUID,
    approved_at TIMESTAMPTZ,
    voided BOOLEAN DEFAULT false,
    voided_at TIMESTAMPTZ,
    voided_reason TEXT,
    notes TEXT,
    registered_by UUID,
    expense_date TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.4 Movimientos de caja
-- ============================================================
CREATE TABLE IF NOT EXISTS cash_movements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cash_register_id UUID REFERENCES cash_registers(id),
    type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'owner_loan', 'owner_reimbursement')),
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    bank VARCHAR(100),
    receipt_number VARCHAR(50),
    receipt_image_url TEXT,
    responsible VARCHAR(100),
    notes TEXT,
    registered_by UUID,
    movement_date TIMESTAMPTZ DEFAULT NOW(),
    deleted_at TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Log de importaciones
-- ============================================================
CREATE TABLE IF NOT EXISTS import_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    import_date DATE NOT NULL,
    source VARCHAR(50) NOT NULL CHECK (source IN ('api', 'file', 'manual')),
    file_path TEXT,
    total_records INTEGER DEFAULT 0,
    success_records INTEGER DEFAULT 0,
    failed_records INTEGER DEFAULT 0,
    error_log TEXT,
    imported_by UUID,
    status TEXT DEFAULT 'processing' CHECK (status IN ('processing', 'success', 'partial', 'failed')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Log de auditoría (inmutable: solo SELECT e INSERT)
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID,
    action VARCHAR(50) NOT NULL,
    table_name VARCHAR(50) NOT NULL,
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================
-- PARTE 2: ALTERACIONES A TABLAS EXISTENTES
-- ============================================================

-- 2.1 Agregar columnas a cash_registers
-- ============================================================
DO $$
BEGIN
    -- Columna shift (turno)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'shift'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN shift TEXT DEFAULT 'unico';
    END IF;

    -- Columna opened_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'opened_by'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN opened_by UUID;
    END IF;

    -- Columna closed_by
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'closed_by'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN closed_by UUID;
    END IF;

    -- Columna total_expenses
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'total_expenses'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN total_expenses DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Columna total_movements
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'total_movements'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN total_movements DECIMAL(10,2) DEFAULT 0;
    END IF;

    -- Columna updated_at
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'cash_registers' AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE cash_registers
        ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Agregar CHECK constraint para shift
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage
        WHERE table_name = 'cash_registers' AND constraint_name = 'cash_registers_shift_check'
    ) THEN
        ALTER TABLE cash_registers
        ADD CONSTRAINT cash_registers_shift_check
        CHECK (shift IN ('unico', 'manana', 'tarde', 'noche'));
    END IF;
END $$;

-- 2.2 Cambiar UNIQUE constraint de cash_registers
-- Eliminar UNIQUE en register_date solo, crear UNIQUE en (register_date, shift)
-- ============================================================
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Buscar el constraint UNIQUE actual en register_date
    SELECT conname INTO constraint_name_var
    FROM pg_constraint
    WHERE conrelid = 'cash_registers'::regclass
    AND contype = 'u'
    AND array_length(conkey, 1) = 1
    AND conkey[1] = (
        SELECT attnum FROM pg_attribute
        WHERE attrelid = 'cash_registers'::regclass
        AND attname = 'register_date'
    );

    -- Si existe, eliminarlo
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE cash_registers DROP CONSTRAINT ' || constraint_name_var;
    END IF;

    -- Crear nuevo UNIQUE compuesto si no existe
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'cash_registers'::regclass
        AND conname = 'cash_registers_date_shift_unique'
    ) THEN
        ALTER TABLE cash_registers
        ADD CONSTRAINT cash_registers_date_shift_unique
        UNIQUE (register_date, shift);
    END IF;
END $$;

-- 2.3 Agregar roles supervisor y contador a user_roles
-- ============================================================
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Buscar el CHECK constraint de role
    SELECT conname INTO constraint_name_var
    FROM pg_constraint
    WHERE conrelid = 'user_roles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';

    -- Si existe, eliminarlo y recrear con nuevos roles
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE 'ALTER TABLE user_roles DROP CONSTRAINT ' || constraint_name_var;
    END IF;

    -- Crear nuevo constraint con todos los roles
    ALTER TABLE user_roles
    ADD CONSTRAINT valid_role
    CHECK (role IN ('admin', 'receptionist', 'viewer', 'supervisor', 'contador'));
END $$;


-- ============================================================
-- PARTE 3: ÍNDICES
-- ============================================================

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_cash_register ON expenses(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_payment_method ON expenses(payment_method);

-- Cash Movements
CREATE INDEX IF NOT EXISTS idx_cash_movements_cash_register ON cash_movements(cash_register_id);
CREATE INDEX IF NOT EXISTS idx_cash_movements_date ON cash_movements(movement_date);
CREATE INDEX IF NOT EXISTS idx_cash_movements_type ON cash_movements(type);

-- Audit Log
CREATE INDEX IF NOT EXISTS idx_audit_log_user ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_date ON audit_log(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_table ON audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

-- Expense Categories
CREATE INDEX IF NOT EXISTS idx_expense_categories_active ON expense_categories(active);
CREATE INDEX IF NOT EXISTS idx_expense_categories_type ON expense_categories(type);

-- Expense Subcategories
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_category ON expense_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_expense_subcategories_active ON expense_subcategories(active);

-- Import Logs
CREATE INDEX IF NOT EXISTS idx_import_logs_date ON import_logs(import_date);
CREATE INDEX IF NOT EXISTS idx_import_logs_status ON import_logs(status);


-- ============================================================
-- PARTE 4: ROW LEVEL SECURITY
-- ============================================================

-- expense_categories: acceso completo (modo desarrollo)
ALTER TABLE expense_categories ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'expense_categories' AND policyname = 'expense_categories_all'
    ) THEN
        CREATE POLICY expense_categories_all ON expense_categories FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- expense_subcategories: acceso completo
ALTER TABLE expense_subcategories ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'expense_subcategories' AND policyname = 'expense_subcategories_all'
    ) THEN
        CREATE POLICY expense_subcategories_all ON expense_subcategories FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- expenses: acceso completo
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'expenses' AND policyname = 'expenses_all'
    ) THEN
        CREATE POLICY expenses_all ON expenses FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- cash_movements: acceso completo
ALTER TABLE cash_movements ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'cash_movements' AND policyname = 'cash_movements_all'
    ) THEN
        CREATE POLICY cash_movements_all ON cash_movements FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- import_logs: acceso completo
ALTER TABLE import_logs ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'import_logs' AND policyname = 'import_logs_all'
    ) THEN
        CREATE POLICY import_logs_all ON import_logs FOR ALL USING (true) WITH CHECK (true);
    END IF;
END $$;

-- audit_log: solo SELECT e INSERT (inmutable)
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_select'
    ) THEN
        CREATE POLICY audit_log_select ON audit_log FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'audit_log' AND policyname = 'audit_log_insert'
    ) THEN
        CREATE POLICY audit_log_insert ON audit_log FOR INSERT WITH CHECK (true);
    END IF;
END $$;


-- ============================================================
-- PARTE 5: DATOS INICIALES - CATEGORÍAS Y SUBCATEGORÍAS
-- ============================================================

-- Insertar categorías solo si la tabla está vacía
DO $$
DECLARE
    cat_count INTEGER;
    cat_id UUID;
BEGIN
    SELECT COUNT(*) INTO cat_count FROM expense_categories;

    IF cat_count = 0 THEN

        -- 1. Pagos a Personal
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Pagos a Personal', 'expense', '#EF4444', 1)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Profesores (por clase)'),
        (cat_id, 'Salarios fijos'),
        (cat_id, 'Bonos por desempeño'),
        (cat_id, 'Comisiones');

        -- 2. Servicios Básicos
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Servicios Básicos', 'expense', '#F59E0B', 2)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Energía eléctrica'),
        (cat_id, 'Agua potable'),
        (cat_id, 'Internet / Teléfono'),
        (cat_id, 'Gas');

        -- 3. Mantenimiento e Infraestructura
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Mantenimiento e Infraestructura', 'expense', '#8B5CF6', 3)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Reparación de espejos'),
        (cat_id, 'Mantenimiento de barras'),
        (cat_id, 'Reparación de piso de danza'),
        (cat_id, 'Pintura / decoración'),
        (cat_id, 'Plomería / electricidad');

        -- 4. Material y Consumibles
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Material y Consumibles', 'expense', '#06B6D4', 4)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Música / licencias'),
        (cat_id, 'Material para clases'),
        (cat_id, 'Limpieza'),
        (cat_id, 'Papelería');

        -- 5. Marketing y Publicidad
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Marketing y Publicidad', 'expense', '#EC4899', 5)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Redes sociales (ads)'),
        (cat_id, 'Material impreso'),
        (cat_id, 'Diseño gráfico'),
        (cat_id, 'Fotografía / video');

        -- 6. Administrativo
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Administrativo', 'expense', '#6366F1', 6)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Contador'),
        (cat_id, 'Abogado'),
        (cat_id, 'Gestión bancaria'),
        (cat_id, 'Trámites gubernamentales');

        -- 7. Inventario para Reventa
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Inventario para Reventa', 'expense', '#10B981', 7)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Ropa de danza'),
        (cat_id, 'Accesorios'),
        (cat_id, 'Calzado');

        -- 8. Otros Gastos
        INSERT INTO expense_categories (name, type, color, sort_order)
        VALUES ('Otros Gastos', 'expense', '#6B7280', 8)
        RETURNING id INTO cat_id;

        INSERT INTO expense_subcategories (category_id, name) VALUES
        (cat_id, 'Imprevistos'),
        (cat_id, 'Caja chica'),
        (cat_id, 'Varios');

        RAISE NOTICE 'Categorías y subcategorías insertadas correctamente';
    ELSE
        RAISE NOTICE 'Las categorías ya existen, no se insertaron datos';
    END IF;
END $$;


-- ============================================================
-- PARTE 6: VISTA - RESUMEN DIARIO DE CAJA
-- ============================================================

CREATE OR REPLACE VIEW daily_cash_summary AS
SELECT
    cr.id AS cash_register_id,
    cr.register_date,
    cr.shift,
    cr.status,
    cr.opening_amount,
    cr.opened_at,
    cr.closed_at,

    -- Ingresos desde pagos de alumnos
    COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.payment_date = cr.register_date
    ), 0) AS student_payments_total,

    -- Ingresos desde pagos rápidos
    COALESCE((
        SELECT SUM(qp.amount)
        FROM quick_payments qp
        WHERE qp.payment_date = cr.register_date
    ), 0) AS quick_payments_total,

    -- Ingresos desde ventas
    COALESCE((
        SELECT SUM(s.total)
        FROM sales s
        WHERE s.sale_date = cr.register_date
    ), 0) AS sales_total,

    -- Total egresos
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.cash_register_id = cr.id
        AND e.deleted_at IS NULL
        AND e.voided = false
    ), 0) AS expenses_total,

    -- Egresos en efectivo
    COALESCE((
        SELECT SUM(e.amount)
        FROM expenses e
        WHERE e.cash_register_id = cr.id
        AND e.deleted_at IS NULL
        AND e.voided = false
        AND e.payment_method = 'cash'
    ), 0) AS expenses_cash_total,

    -- Depósitos bancarios (salida de efectivo de caja)
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type = 'deposit'
    ), 0) AS deposits_total,

    -- Retiros / préstamos (entrada de efectivo a caja)
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type IN ('withdrawal', 'owner_loan')
    ), 0) AS cash_in_total,

    -- Reembolsos al dueño (salida de efectivo)
    COALESCE((
        SELECT SUM(cm.amount)
        FROM cash_movements cm
        WHERE cm.cash_register_id = cr.id
        AND cm.deleted_at IS NULL
        AND cm.type = 'owner_reimbursement'
    ), 0) AS cash_out_total,

    -- Ingresos en efectivo (pagos alumnos + rápidos en efectivo)
    COALESCE((
        SELECT SUM(p.amount)
        FROM payments p
        WHERE p.payment_date = cr.register_date
        AND p.payment_method = 'Efectivo'
    ), 0) + COALESCE((
        SELECT SUM(qp.amount)
        FROM quick_payments qp
        WHERE qp.payment_date = cr.register_date
        AND qp.payment_method = 'Efectivo'
    ), 0) + COALESCE((
        SELECT SUM(s.total)
        FROM sales s
        WHERE s.sale_date = cr.register_date
        AND s.payment_method = 'cash'
    ), 0) AS income_cash_total

FROM cash_registers cr
ORDER BY cr.register_date DESC, cr.shift;


-- ============================================================
-- PARTE 7: COMENTARIOS EN TABLAS
-- ============================================================

COMMENT ON TABLE expense_categories IS 'Categorías configurables de egresos del estudio de danza';
COMMENT ON TABLE expense_subcategories IS 'Subcategorías vinculadas a categorías de egresos';
COMMENT ON TABLE expenses IS 'Registro de todos los egresos/gastos del negocio';
COMMENT ON TABLE cash_movements IS 'Movimientos de caja: depósitos bancarios, retiros, préstamos';
COMMENT ON TABLE import_logs IS 'Tracking de importaciones de datos desde software externo';
COMMENT ON TABLE audit_log IS 'Log inmutable de auditoría de todas las acciones del sistema';

COMMENT ON COLUMN cash_registers.shift IS 'Turno: unico (sin turnos), manana, tarde, noche';
COMMENT ON COLUMN cash_registers.total_expenses IS 'Total de egresos registrados en este turno';
COMMENT ON COLUMN cash_registers.total_movements IS 'Total neto de movimientos de caja en este turno';

COMMENT ON COLUMN expenses.payment_method IS 'Método de pago: cash, transfer, card, check';
COMMENT ON COLUMN expenses.requires_approval IS 'true si el monto supera el límite del usuario';
COMMENT ON COLUMN cash_movements.type IS 'deposit=salida a banco, withdrawal=entrada desde banco, owner_loan=préstamo dueño, owner_reimbursement=reembolso a dueño';


-- ============================================================
-- FIN DE MIGRACIÓN V10
-- ============================================================
-- Para ejecutar: Copiar todo este contenido en Supabase SQL Editor y ejecutar
--
-- Verificación post-ejecución:
-- 1. SELECT * FROM expense_categories;  (debe mostrar 8 categorías)
-- 2. SELECT * FROM expense_subcategories;  (debe mostrar ~30 subcategorías)
-- 3. SELECT column_name FROM information_schema.columns WHERE table_name = 'cash_registers' AND column_name IN ('shift', 'opened_by', 'closed_by', 'total_expenses', 'total_movements');
-- 4. SELECT * FROM daily_cash_summary LIMIT 5;
-- ============================================================

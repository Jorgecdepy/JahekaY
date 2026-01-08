-- ================================================================
-- SCHEMA DE BASE DE DATOS PARA GESTIÓN DE CAJA DIARIA
-- Sistema JahekaY
-- ================================================================

-- Tabla: categorias_transaccion
-- Propósito: Clasificar tipos de transacciones (ingresos/gastos)
-- ================================================================
CREATE TABLE IF NOT EXISTS categorias_transaccion (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    color VARCHAR(7) DEFAULT '#6366f1', -- Color hex para UI
    descripcion TEXT,
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por tipo
CREATE INDEX IF NOT EXISTS idx_categorias_tipo ON categorias_transaccion(tipo, activo);

-- ================================================================
-- Tabla: caja_diaria
-- Propósito: Estado de la caja por día (arqueos)
-- ================================================================
CREATE TABLE IF NOT EXISTS caja_diaria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha DATE NOT NULL UNIQUE,
    monto_inicial DECIMAL(12,2) DEFAULT 0.00,
    total_ingresos DECIMAL(12,2) DEFAULT 0.00,
    total_gastos DECIMAL(12,2) DEFAULT 0.00,
    monto_final DECIMAL(12,2) GENERATED ALWAYS AS (monto_inicial + total_ingresos - total_gastos) STORED,
    estado VARCHAR(20) DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    hora_apertura TIMESTAMP WITH TIME ZONE,
    hora_cierre TIMESTAMP WITH TIME ZONE,
    observaciones TEXT,
    arqueo_generado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas por fecha y estado
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_diaria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_caja_estado ON caja_diaria(estado);

-- ================================================================
-- Tabla: transacciones_caja
-- Propósito: Registro detallado de ingresos/gastos
-- ================================================================
CREATE TABLE IF NOT EXISTS transacciones_caja (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    caja_diaria_id UUID NOT NULL REFERENCES caja_diaria(id) ON DELETE CASCADE,
    categoria_id UUID REFERENCES categorias_transaccion(id) ON DELETE SET NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('ingreso', 'gasto')),
    monto DECIMAL(12,2) NOT NULL CHECK (monto > 0),
    descripcion TEXT NOT NULL,
    metodo_pago VARCHAR(50) DEFAULT 'efectivo', -- efectivo, transferencia, tarjeta
    referencia VARCHAR(100), -- número de comprobante, factura, etc.
    usuario_relacionado UUID REFERENCES usuarios(id) ON DELETE SET NULL, -- si es pago de cliente
    factura_relacionada UUID REFERENCES facturas(id) ON DELETE SET NULL, -- si es pago de factura
    comprobante_url TEXT, -- URL de imagen/documento en Supabase Storage
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para optimización de queries
CREATE INDEX IF NOT EXISTS idx_transacciones_caja ON transacciones_caja(caja_diaria_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_tipo ON transacciones_caja(tipo);
CREATE INDEX IF NOT EXISTS idx_transacciones_categoria ON transacciones_caja(categoria_id);
CREATE INDEX IF NOT EXISTS idx_transacciones_fecha ON transacciones_caja(created_at DESC);

-- ================================================================
-- FUNCIÓN: Actualizar totales de caja automáticamente
-- ================================================================
CREATE OR REPLACE FUNCTION actualizar_totales_caja()
RETURNS TRIGGER AS $$
BEGIN
    -- Actualizar totales cuando se inserta/actualiza/elimina una transacción
    UPDATE caja_diaria
    SET
        total_ingresos = (
            SELECT COALESCE(SUM(monto), 0)
            FROM transacciones_caja
            WHERE caja_diaria_id = COALESCE(NEW.caja_diaria_id, OLD.caja_diaria_id)
            AND tipo = 'ingreso'
        ),
        total_gastos = (
            SELECT COALESCE(SUM(monto), 0)
            FROM transacciones_caja
            WHERE caja_diaria_id = COALESCE(NEW.caja_diaria_id, OLD.caja_diaria_id)
            AND tipo = 'gasto'
        ),
        updated_at = NOW()
    WHERE id = COALESCE(NEW.caja_diaria_id, OLD.caja_diaria_id);

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar totales automáticamente
DROP TRIGGER IF EXISTS trigger_actualizar_totales_caja ON transacciones_caja;
CREATE TRIGGER trigger_actualizar_totales_caja
    AFTER INSERT OR UPDATE OR DELETE ON transacciones_caja
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_totales_caja();

-- ================================================================
-- FUNCIÓN: Generar arqueo automático diario
-- ================================================================
CREATE OR REPLACE FUNCTION generar_arqueo_automatico()
RETURNS void AS $$
DECLARE
    caja_actual RECORD;
    monto_cierre DECIMAL(12,2);
BEGIN
    -- Cerrar caja del día anterior si está abierta
    FOR caja_actual IN
        SELECT * FROM caja_diaria
        WHERE fecha < CURRENT_DATE
        AND estado = 'abierta'
    LOOP
        UPDATE caja_diaria
        SET
            estado = 'cerrada',
            hora_cierre = NOW(),
            arqueo_generado = true,
            updated_at = NOW()
        WHERE id = caja_actual.id;
    END LOOP;

    -- Crear caja para el día actual si no existe
    IF NOT EXISTS (SELECT 1 FROM caja_diaria WHERE fecha = CURRENT_DATE) THEN
        -- Obtener monto final de la caja anterior
        SELECT monto_final INTO monto_cierre
        FROM caja_diaria
        WHERE fecha = CURRENT_DATE - INTERVAL '1 day'
        LIMIT 1;

        INSERT INTO caja_diaria (fecha, monto_inicial, hora_apertura)
        VALUES (CURRENT_DATE, COALESCE(monto_cierre, 0), NOW());
    END IF;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- DATOS INICIALES: Categorías predeterminadas
-- ================================================================
INSERT INTO categorias_transaccion (nombre, tipo, color, descripcion) VALUES
    -- Ingresos
    ('Pago de Factura', 'ingreso', '#10b981', 'Pagos de facturas de agua'),
    ('Reconexión', 'ingreso', '#3b82f6', 'Cobro por reconexión del servicio'),
    ('Multas', 'ingreso', '#f59e0b', 'Multas por mora o incumplimiento'),
    ('Otros Ingresos', 'ingreso', '#8b5cf6', 'Ingresos diversos'),

    -- Gastos
    ('Mantenimiento', 'gasto', '#ef4444', 'Reparaciones y mantenimiento'),
    ('Materiales', 'gasto', '#f97316', 'Compra de materiales y suministros'),
    ('Servicios', 'gasto', '#ec4899', 'Pago de servicios (luz, teléfono, etc)'),
    ('Salarios', 'gasto', '#6366f1', 'Pago de salarios y bonificaciones'),
    ('Administrativos', 'gasto', '#14b8a6', 'Gastos administrativos'),
    ('Otros Gastos', 'gasto', '#64748b', 'Gastos diversos')
ON CONFLICT DO NOTHING;

-- ================================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ================================================================

-- Habilitar RLS
ALTER TABLE categorias_transaccion ENABLE ROW LEVEL SECURITY;
ALTER TABLE caja_diaria ENABLE ROW LEVEL SECURITY;
ALTER TABLE transacciones_caja ENABLE ROW LEVEL SECURITY;

-- Políticas para usuarios autenticados (ajustar según tu sistema de auth)
CREATE POLICY "Usuarios autenticados pueden ver categorías"
    ON categorias_transaccion FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver caja"
    ON caja_diaria FOR ALL
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver transacciones"
    ON transacciones_caja FOR ALL
    USING (auth.role() = 'authenticated');

-- ================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ================================================================
COMMENT ON TABLE categorias_transaccion IS 'Catálogo de categorías para clasificar ingresos y gastos';
COMMENT ON TABLE caja_diaria IS 'Registro diario de arqueo de caja con totales consolidados';
COMMENT ON TABLE transacciones_caja IS 'Detalle de todas las transacciones (ingresos/gastos) del día';
COMMENT ON FUNCTION generar_arqueo_automatico() IS 'Cierra cajas pendientes y abre nueva caja del día';

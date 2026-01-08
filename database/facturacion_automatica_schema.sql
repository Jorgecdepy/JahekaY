-- ================================================================
-- SCHEMA PARA FACTURACIÓN AUTOMÁTICA
-- Sistema JahekaY
-- ================================================================

-- Tabla: configuracion_sistema
-- Propósito: Almacenar configuraciones generales del sistema
-- ================================================================
CREATE TABLE IF NOT EXISTS configuracion_sistema (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    clave VARCHAR(100) NOT NULL UNIQUE,
    valor TEXT NOT NULL,
    tipo VARCHAR(50) DEFAULT 'string', -- string, number, boolean, json
    descripcion TEXT,
    categoria VARCHAR(50) DEFAULT 'general',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por clave
CREATE INDEX IF NOT EXISTS idx_configuracion_clave ON configuracion_sistema(clave);
CREATE INDEX IF NOT EXISTS idx_configuracion_categoria ON configuracion_sistema(categoria);

-- ================================================================
-- Tabla: historial_facturacion_automatica
-- Propósito: Registro de ejecuciones de facturación automática
-- ================================================================
CREATE TABLE IF NOT EXISTS historial_facturacion_automatica (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    fecha_ejecucion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    periodo VARCHAR(20) NOT NULL, -- Ej: "Enero 2025"
    facturas_generadas INTEGER DEFAULT 0,
    facturas_con_error INTEGER DEFAULT 0,
    clientes_procesados INTEGER DEFAULT 0,
    estado VARCHAR(50) DEFAULT 'completado', -- completado, error, parcial
    detalles JSONB, -- Información detallada de la ejecución
    mensaje_error TEXT,
    duracion_segundos DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para consultas por fecha
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_facturacion_automatica(fecha_ejecucion DESC);

-- ================================================================
-- CONFIGURACIONES INICIALES PARA FACTURACIÓN AUTOMÁTICA
-- ================================================================
INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion, categoria) VALUES
    ('facturacion_automatica_activa', 'false', 'boolean', 'Habilitar o deshabilitar la facturación automática', 'facturacion'),
    ('facturacion_dia_mes', '1', 'number', 'Día del mes para generar facturas (1-31)', 'facturacion'),
    ('facturacion_hora', '00:00', 'string', 'Hora del día para generar facturas (formato HH:mm)', 'facturacion'),
    ('facturacion_dias_vencimiento', '15', 'number', 'Días de gracia para vencimiento de facturas', 'facturacion'),
    ('facturacion_notificar_admin', 'true', 'boolean', 'Enviar notificación al administrador después de generar facturas', 'facturacion'),
    ('facturacion_email_admin', '', 'string', 'Email del administrador para notificaciones', 'facturacion')
ON CONFLICT (clave) DO NOTHING;

-- ================================================================
-- FUNCIÓN: Obtener configuración del sistema
-- ================================================================
CREATE OR REPLACE FUNCTION obtener_configuracion(p_clave VARCHAR)
RETURNS TEXT AS $$
DECLARE
    v_valor TEXT;
BEGIN
    SELECT valor INTO v_valor
    FROM configuracion_sistema
    WHERE clave = p_clave;

    RETURN v_valor;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCIÓN: Actualizar configuración del sistema
-- ================================================================
CREATE OR REPLACE FUNCTION actualizar_configuracion(
    p_clave VARCHAR,
    p_valor TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE configuracion_sistema
    SET valor = p_valor,
        updated_at = NOW()
    WHERE clave = p_clave;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCIÓN: Generar facturas automáticamente
-- ================================================================
CREATE OR REPLACE FUNCTION generar_facturas_automaticas()
RETURNS JSONB AS $$
DECLARE
    v_periodo VARCHAR(20);
    v_mes INTEGER;
    v_anio INTEGER;
    v_dias_vencimiento INTEGER;
    v_fecha_emision DATE;
    v_fecha_vencimiento DATE;
    v_facturas_generadas INTEGER := 0;
    v_facturas_error INTEGER := 0;
    v_clientes_procesados INTEGER := 0;
    v_cliente RECORD;
    v_lectura RECORD;
    v_consumo DECIMAL(10,2);
    v_total DECIMAL(10,2);
    v_historial_id UUID;
    v_inicio TIMESTAMP;
    v_fin TIMESTAMP;
    v_detalles JSONB := '[]'::JSONB;
    v_tarifa RECORD;
    v_cargo_fijo DECIMAL(10,2);
    v_costo_consumo DECIMAL(10,2);
BEGIN
    v_inicio := clock_timestamp();

    -- Verificar si la facturación automática está activa
    IF (SELECT valor FROM configuracion_sistema WHERE clave = 'facturacion_automatica_activa') != 'true' THEN
        RETURN jsonb_build_object(
            'success', false,
            'mensaje', 'La facturación automática está desactivada'
        );
    END IF;

    -- Obtener mes y año actual
    v_mes := EXTRACT(MONTH FROM CURRENT_DATE);
    v_anio := EXTRACT(YEAR FROM CURRENT_DATE);

    -- Formato del periodo (ej: "Enero 2025")
    v_periodo := TO_CHAR(CURRENT_DATE, 'TMMonth YYYY');

    -- Obtener días de vencimiento
    v_dias_vencimiento := (SELECT valor::INTEGER FROM configuracion_sistema WHERE clave = 'facturacion_dias_vencimiento');

    -- Fechas de emisión y vencimiento
    v_fecha_emision := CURRENT_DATE;
    v_fecha_vencimiento := CURRENT_DATE + (v_dias_vencimiento || ' days')::INTERVAL;

    -- Obtener tarifa activa
    SELECT * INTO v_tarifa
    FROM tarifas
    WHERE activo = true
    ORDER BY fecha_inicio DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'mensaje', 'No hay tarifa activa configurada'
        );
    END IF;

    v_cargo_fijo := v_tarifa.cargo_fijo_mensual;

    -- Insertar registro en historial
    INSERT INTO historial_facturacion_automatica (periodo, estado)
    VALUES (v_periodo, 'procesando')
    RETURNING id INTO v_historial_id;

    -- Procesar cada cliente activo
    FOR v_cliente IN
        SELECT * FROM usuarios WHERE estado = 'activo'
    LOOP
        v_clientes_procesados := v_clientes_procesados + 1;

        BEGIN
            -- Buscar la última lectura del mes para este cliente
            SELECT * INTO v_lectura
            FROM lecturas
            WHERE usuario_id = v_cliente.id
                AND mes = v_mes
                AND anio = v_anio
            ORDER BY fecha_lectura DESC
            LIMIT 1;

            IF FOUND THEN
                v_consumo := v_lectura.consumo_m3;

                -- Calcular costo según consumo y tarifa
                v_costo_consumo := v_consumo * v_tarifa.precio_por_m3;
                v_total := v_cargo_fijo + v_costo_consumo;

                -- Insertar factura
                INSERT INTO facturas (
                    usuario_id,
                    lectura_id,
                    periodo,
                    consumo_m3,
                    cargo_fijo,
                    costo_consumo,
                    total,
                    fecha_emision,
                    fecha_vencimiento,
                    estado
                ) VALUES (
                    v_cliente.id,
                    v_lectura.id,
                    v_periodo,
                    v_consumo,
                    v_cargo_fijo,
                    v_costo_consumo,
                    v_total,
                    v_fecha_emision,
                    v_fecha_vencimiento,
                    'pendiente'
                );

                v_facturas_generadas := v_facturas_generadas + 1;

                -- Agregar detalle
                v_detalles := v_detalles || jsonb_build_object(
                    'cliente_id', v_cliente.id,
                    'cliente_nombre', v_cliente.nombre_completo,
                    'consumo', v_consumo,
                    'total', v_total,
                    'estado', 'generada'
                );
            ELSE
                -- Cliente sin lectura del mes
                v_facturas_error := v_facturas_error + 1;

                v_detalles := v_detalles || jsonb_build_object(
                    'cliente_id', v_cliente.id,
                    'cliente_nombre', v_cliente.nombre_completo,
                    'estado', 'sin_lectura',
                    'mensaje', 'No se encontró lectura del mes'
                );
            END IF;

        EXCEPTION WHEN OTHERS THEN
            v_facturas_error := v_facturas_error + 1;

            v_detalles := v_detalles || jsonb_build_object(
                'cliente_id', v_cliente.id,
                'cliente_nombre', v_cliente.nombre_completo,
                'estado', 'error',
                'mensaje', SQLERRM
            );
        END;
    END LOOP;

    v_fin := clock_timestamp();

    -- Actualizar historial
    UPDATE historial_facturacion_automatica
    SET
        facturas_generadas = v_facturas_generadas,
        facturas_con_error = v_facturas_error,
        clientes_procesados = v_clientes_procesados,
        estado = CASE
            WHEN v_facturas_error = 0 THEN 'completado'
            WHEN v_facturas_generadas = 0 THEN 'error'
            ELSE 'parcial'
        END,
        detalles = v_detalles,
        duracion_segundos = EXTRACT(EPOCH FROM (v_fin - v_inicio))
    WHERE id = v_historial_id;

    RETURN jsonb_build_object(
        'success', true,
        'mensaje', 'Facturación automática completada',
        'periodo', v_periodo,
        'facturas_generadas', v_facturas_generadas,
        'facturas_con_error', v_facturas_error,
        'clientes_procesados', v_clientes_procesados,
        'historial_id', v_historial_id
    );

END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- FUNCIÓN: Verificar si debe ejecutarse la facturación automática
-- ================================================================
CREATE OR REPLACE FUNCTION debe_ejecutar_facturacion_automatica()
RETURNS BOOLEAN AS $$
DECLARE
    v_activa BOOLEAN;
    v_dia_configurado INTEGER;
    v_dia_actual INTEGER;
    v_ya_ejecutado BOOLEAN;
BEGIN
    -- Verificar si está activa
    SELECT valor::BOOLEAN INTO v_activa
    FROM configuracion_sistema
    WHERE clave = 'facturacion_automatica_activa';

    IF NOT v_activa THEN
        RETURN FALSE;
    END IF;

    -- Obtener día configurado
    SELECT valor::INTEGER INTO v_dia_configurado
    FROM configuracion_sistema
    WHERE clave = 'facturacion_dia_mes';

    v_dia_actual := EXTRACT(DAY FROM CURRENT_DATE);

    -- Verificar si es el día correcto
    IF v_dia_actual != v_dia_configurado THEN
        RETURN FALSE;
    END IF;

    -- Verificar si ya se ejecutó hoy
    SELECT EXISTS (
        SELECT 1
        FROM historial_facturacion_automatica
        WHERE DATE(fecha_ejecucion) = CURRENT_DATE
            AND estado IN ('completado', 'parcial')
    ) INTO v_ya_ejecutado;

    RETURN NOT v_ya_ejecutado;
END;
$$ LANGUAGE plpgsql;

-- ================================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- ================================================================
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;
ALTER TABLE historial_facturacion_automatica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver configuración"
    ON configuracion_sistema FOR SELECT
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden actualizar configuración"
    ON configuracion_sistema FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Usuarios autenticados pueden ver historial"
    ON historial_facturacion_automatica FOR SELECT
    USING (auth.role() = 'authenticated');

-- ================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ================================================================
COMMENT ON TABLE configuracion_sistema IS 'Configuraciones generales del sistema';
COMMENT ON TABLE historial_facturacion_automatica IS 'Registro de ejecuciones de facturación automática';
COMMENT ON FUNCTION generar_facturas_automaticas() IS 'Genera facturas automáticamente basándose en las lecturas del mes';
COMMENT ON FUNCTION debe_ejecutar_facturacion_automatica() IS 'Verifica si debe ejecutarse la facturación automática';

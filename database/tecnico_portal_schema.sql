-- ============================================
-- PORTAL DEL TÉCNICO - SCHEMA Y FUNCIONES
-- ============================================
-- Este archivo contiene:
-- 1. Extensiones para coordenadas geográficas
-- 2. Tablas para zonas de trabajo y cañerías
-- 3. Actualizaciones a tabla reclamos para incluir coordenadas
-- 4. Notificaciones de técnicos a administración
-- 5. Funciones RPC para el portal del técnico
-- ============================================

-- ============================================
-- 1. HABILITAR EXTENSIÓN POSTGIS (OPCIONAL)
-- ============================================
-- Si PostGIS está disponible, habilitar para funciones geográficas avanzadas
-- Si no está disponible, usaremos POINT o coordenadas simples
-- CREATE EXTENSION IF NOT EXISTS postgis;

-- ============================================
-- 2. AGREGAR COORDENADAS A TABLA RECLAMOS
-- ============================================
-- Agregar campos de latitud y longitud para ubicación exacta del reclamo
ALTER TABLE reclamos
ADD COLUMN IF NOT EXISTS latitud DECIMAL(10, 8),
ADD COLUMN IF NOT EXISTS longitud DECIMAL(11, 8),
ADD COLUMN IF NOT EXISTS coordenadas_verificadas BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS foto_ubicacion TEXT;

-- Índice para búsquedas geográficas
CREATE INDEX IF NOT EXISTS idx_reclamos_coordenadas ON reclamos(latitud, longitud);

-- ============================================
-- 3. TABLA DE ZONAS DE TRABAJO
-- ============================================
CREATE TABLE IF NOT EXISTS zonas_trabajo (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#3B82F6', -- Color para mostrar en mapa
    coordenadas_poligono JSONB, -- Array de coordenadas [{lat, lng}, ...]
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE zonas_trabajo IS 'Zonas de trabajo para asignación de técnicos';
COMMENT ON COLUMN zonas_trabajo.coordenadas_poligono IS 'Array JSON de coordenadas para dibujar polígono en mapa: [{lat: -25.123, lng: -57.456}, ...]';

-- ============================================
-- 4. TABLA DE CAÑERÍAS
-- ============================================
CREATE TABLE IF NOT EXISTS canerias (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    tipo VARCHAR(50), -- 'principal', 'secundaria', 'domiciliaria'
    diametro_pulgadas DECIMAL(5, 2),
    material VARCHAR(50), -- 'PVC', 'hierro', 'polietileno', etc.
    coordenadas_linea JSONB NOT NULL, -- Array de coordenadas [{lat, lng}, ...]
    zona_trabajo_id INTEGER REFERENCES zonas_trabajo(id),
    estado VARCHAR(30) DEFAULT 'operativa', -- 'operativa', 'en_reparacion', 'fuera_servicio'
    fecha_instalacion DATE,
    activa BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE canerias IS 'Registro de cañerías y tuberías del sistema';
COMMENT ON COLUMN canerias.coordenadas_linea IS 'Array JSON de coordenadas para dibujar línea en mapa: [{lat: -25.123, lng: -57.456}, ...]';

CREATE INDEX IF NOT EXISTS idx_canerias_zona ON canerias(zona_trabajo_id);
CREATE INDEX IF NOT EXISTS idx_canerias_tipo ON canerias(tipo);

-- ============================================
-- 5. TABLA DE NOTIFICACIONES A ADMINISTRACIÓN
-- ============================================
CREATE TABLE IF NOT EXISTS notificaciones_tecnico (
    id SERIAL PRIMARY KEY,
    tecnico_id INTEGER NOT NULL REFERENCES empleados(id),
    reclamo_id INTEGER REFERENCES reclamos(id),
    tipo VARCHAR(50) NOT NULL, -- 'problema', 'solicitud_material', 'consulta', 'reporte'
    asunto VARCHAR(200) NOT NULL,
    mensaje TEXT NOT NULL,
    prioridad VARCHAR(20) DEFAULT 'media', -- 'urgente', 'alta', 'media', 'baja'
    adjuntos JSONB, -- Array de URLs de fotos/documentos
    leida BOOLEAN DEFAULT FALSE,
    respondida BOOLEAN DEFAULT FALSE,
    respuesta TEXT,
    respondida_por INTEGER REFERENCES empleados(id),
    respondida_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE notificaciones_tecnico IS 'Notificaciones enviadas por técnicos a la administración';

CREATE INDEX IF NOT EXISTS idx_notif_tecnico_tecnico ON notificaciones_tecnico(tecnico_id);
CREATE INDEX IF NOT EXISTS idx_notif_tecnico_leida ON notificaciones_tecnico(leida);
CREATE INDEX IF NOT EXISTS idx_notif_tecnico_fecha ON notificaciones_tecnico(created_at DESC);

-- ============================================
-- 6. TABLA DE SEGUIMIENTO DE UBICACIÓN DEL TÉCNICO
-- ============================================
CREATE TABLE IF NOT EXISTS ubicacion_tecnico (
    id SERIAL PRIMARY KEY,
    tecnico_id INTEGER NOT NULL REFERENCES empleados(id),
    latitud DECIMAL(10, 8) NOT NULL,
    longitud DECIMAL(11, 8) NOT NULL,
    precision_metros DECIMAL(8, 2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE ubicacion_tecnico IS 'Registro de ubicaciones GPS de técnicos en campo';

CREATE INDEX IF NOT EXISTS idx_ubicacion_tecnico ON ubicacion_tecnico(tecnico_id, created_at DESC);

-- ============================================
-- 7. VISTA PARA TÉCNICOS
-- ============================================
CREATE OR REPLACE VIEW vista_tecnico_reclamos AS
SELECT
    r.id,
    r.numero_reclamo,
    r.cliente_id,
    u.nombre_completo as cliente_nombre,
    u.numero_medidor,
    u.direccion as cliente_direccion,
    u.telefono as cliente_telefono,
    r.tipo_reclamo_id,
    tr.nombre as tipo_reclamo_nombre,
    tr.icono as tipo_reclamo_icono,
    r.descripcion,
    r.estado,
    r.prioridad,
    r.ubicacion,
    r.latitud,
    r.longitud,
    r.coordenadas_verificadas,
    r.foto_ubicacion,
    r.asignado_a,
    e.nombre_completo as tecnico_nombre,
    r.fotos,
    r.created_at,
    r.updated_at,
    r.fecha_resolucion,
    r.resolucion,
    -- Contar comentarios
    (SELECT COUNT(*) FROM comentarios_reclamos WHERE reclamo_id = r.id) as total_comentarios
FROM reclamos r
LEFT JOIN usuarios u ON r.cliente_id = u.id
LEFT JOIN tipos_reclamos tr ON r.tipo_reclamo_id = tr.id
LEFT JOIN empleados e ON r.asignado_a = e.id;

-- ============================================
-- 8. FUNCIONES RPC PARA PORTAL DEL TÉCNICO
-- ============================================

-- ------------------------------------
-- 8.1. Autenticación del técnico
-- ------------------------------------
CREATE OR REPLACE FUNCTION autenticar_tecnico(
    p_email VARCHAR,
    p_password_hash VARCHAR
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    tecnico JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_empleado RECORD;
    v_rol RECORD;
BEGIN
    -- Buscar empleado por email
    SELECT e.*, r.nombre as rol_nombre, r.permisos
    INTO v_empleado
    FROM empleados e
    JOIN roles r ON e.rol_id = r.id
    WHERE e.email = p_email
    AND e.activo = TRUE;

    -- Verificar si existe
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Credenciales inválidas', NULL::JSONB;
        RETURN;
    END IF;

    -- Verificar que sea técnico
    IF v_empleado.rol_nombre != 'Técnico' THEN
        RETURN QUERY SELECT FALSE, 'Acceso no autorizado. Esta cuenta no es de técnico.', NULL::JSONB;
        RETURN;
    END IF;

    -- Retornar datos del técnico
    RETURN QUERY SELECT
        TRUE,
        'Autenticación exitosa',
        jsonb_build_object(
            'id', v_empleado.id,
            'nombre_completo', v_empleado.nombre_completo,
            'email', v_empleado.email,
            'rol', v_empleado.rol_nombre,
            'permisos', v_empleado.permisos
        );
END;
$$;

-- ------------------------------------
-- 8.2. Obtener reclamos asignados al técnico
-- ------------------------------------
CREATE OR REPLACE FUNCTION obtener_reclamos_tecnico(
    p_tecnico_id INTEGER,
    p_estado VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    numero_reclamo VARCHAR,
    cliente_nombre VARCHAR,
    numero_medidor VARCHAR,
    cliente_direccion TEXT,
    cliente_telefono VARCHAR,
    tipo_reclamo_nombre VARCHAR,
    tipo_reclamo_icono VARCHAR,
    descripcion TEXT,
    estado VARCHAR,
    prioridad VARCHAR,
    ubicacion TEXT,
    latitud DECIMAL,
    longitud DECIMAL,
    coordenadas_verificadas BOOLEAN,
    fotos JSONB,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    total_comentarios BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        vtr.id,
        vtr.numero_reclamo,
        vtr.cliente_nombre,
        vtr.numero_medidor,
        vtr.cliente_direccion,
        vtr.cliente_telefono,
        vtr.tipo_reclamo_nombre,
        vtr.tipo_reclamo_icono,
        vtr.descripcion,
        vtr.estado,
        vtr.prioridad,
        vtr.ubicacion,
        vtr.latitud,
        vtr.longitud,
        vtr.coordenadas_verificadas,
        vtr.fotos,
        vtr.created_at,
        vtr.updated_at,
        vtr.total_comentarios
    FROM vista_tecnico_reclamos vtr
    WHERE vtr.asignado_a = p_tecnico_id
    AND (p_estado IS NULL OR vtr.estado = p_estado)
    ORDER BY
        CASE vtr.prioridad
            WHEN 'urgente' THEN 1
            WHEN 'alta' THEN 2
            WHEN 'media' THEN 3
            WHEN 'baja' THEN 4
        END,
        vtr.created_at DESC;
END;
$$;

-- ------------------------------------
-- 8.3. Actualizar estado de reclamo (técnico)
-- ------------------------------------
CREATE OR REPLACE FUNCTION actualizar_reclamo_tecnico(
    p_reclamo_id INTEGER,
    p_tecnico_id INTEGER,
    p_estado VARCHAR,
    p_resolucion TEXT DEFAULT NULL,
    p_fotos JSONB DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_reclamo RECORD;
BEGIN
    -- Verificar que el reclamo está asignado a este técnico
    SELECT * INTO v_reclamo
    FROM reclamos
    WHERE id = p_reclamo_id
    AND asignado_a = p_tecnico_id;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Reclamo no encontrado o no asignado a este técnico';
        RETURN;
    END IF;

    -- Actualizar reclamo
    UPDATE reclamos
    SET
        estado = p_estado,
        resolucion = COALESCE(p_resolucion, resolucion),
        fotos = CASE
            WHEN p_fotos IS NOT NULL THEN
                COALESCE(fotos, '[]'::jsonb) || p_fotos
            ELSE fotos
        END,
        fecha_resolucion = CASE
            WHEN p_estado = 'Resuelto' THEN NOW()
            ELSE fecha_resolucion
        END,
        updated_at = NOW()
    WHERE id = p_reclamo_id;

    RETURN QUERY SELECT TRUE, 'Reclamo actualizado exitosamente';
END;
$$;

-- ------------------------------------
-- 8.4. Actualizar coordenadas de reclamo
-- ------------------------------------
CREATE OR REPLACE FUNCTION actualizar_coordenadas_reclamo(
    p_reclamo_id INTEGER,
    p_tecnico_id INTEGER,
    p_latitud DECIMAL,
    p_longitud DECIMAL,
    p_foto_ubicacion TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Verificar que el reclamo está asignado a este técnico
    IF NOT EXISTS (
        SELECT 1 FROM reclamos
        WHERE id = p_reclamo_id
        AND asignado_a = p_tecnico_id
    ) THEN
        RETURN QUERY SELECT FALSE, 'Reclamo no encontrado o no asignado a este técnico';
        RETURN;
    END IF;

    -- Actualizar coordenadas
    UPDATE reclamos
    SET
        latitud = p_latitud,
        longitud = p_longitud,
        coordenadas_verificadas = TRUE,
        foto_ubicacion = COALESCE(p_foto_ubicacion, foto_ubicacion),
        updated_at = NOW()
    WHERE id = p_reclamo_id;

    RETURN QUERY SELECT TRUE, 'Coordenadas actualizadas exitosamente';
END;
$$;

-- ------------------------------------
-- 8.5. Crear notificación a administración
-- ------------------------------------
CREATE OR REPLACE FUNCTION crear_notificacion_admin(
    p_tecnico_id INTEGER,
    p_reclamo_id INTEGER,
    p_tipo VARCHAR,
    p_asunto VARCHAR,
    p_mensaje TEXT,
    p_prioridad VARCHAR DEFAULT 'media',
    p_adjuntos JSONB DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    notificacion_id INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notif_id INTEGER;
BEGIN
    -- Insertar notificación
    INSERT INTO notificaciones_tecnico (
        tecnico_id,
        reclamo_id,
        tipo,
        asunto,
        mensaje,
        prioridad,
        adjuntos
    ) VALUES (
        p_tecnico_id,
        p_reclamo_id,
        p_tipo,
        p_asunto,
        p_mensaje,
        p_prioridad,
        p_adjuntos
    )
    RETURNING id INTO v_notif_id;

    RETURN QUERY SELECT TRUE, 'Notificación enviada exitosamente', v_notif_id;
END;
$$;

-- ------------------------------------
-- 8.6. Obtener zonas de trabajo
-- ------------------------------------
CREATE OR REPLACE FUNCTION obtener_zonas_trabajo()
RETURNS TABLE (
    id INTEGER,
    nombre VARCHAR,
    descripcion TEXT,
    color VARCHAR,
    coordenadas_poligono JSONB,
    activa BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        z.id,
        z.nombre,
        z.descripcion,
        z.color,
        z.coordenadas_poligono,
        z.activa
    FROM zonas_trabajo z
    WHERE z.activa = TRUE
    ORDER BY z.nombre;
END;
$$;

-- ------------------------------------
-- 8.7. Obtener cañerías
-- ------------------------------------
CREATE OR REPLACE FUNCTION obtener_canerias(
    p_zona_id INTEGER DEFAULT NULL
)
RETURNS TABLE (
    id INTEGER,
    nombre VARCHAR,
    tipo VARCHAR,
    diametro_pulgadas DECIMAL,
    material VARCHAR,
    coordenadas_linea JSONB,
    zona_trabajo_id INTEGER,
    estado VARCHAR
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.nombre,
        c.tipo,
        c.diametro_pulgadas,
        c.material,
        c.coordenadas_linea,
        c.zona_trabajo_id,
        c.estado
    FROM canerias c
    WHERE c.activa = TRUE
    AND (p_zona_id IS NULL OR c.zona_trabajo_id = p_zona_id)
    ORDER BY c.tipo, c.nombre;
END;
$$;

-- ------------------------------------
-- 8.8. Registrar ubicación del técnico
-- ------------------------------------
CREATE OR REPLACE FUNCTION registrar_ubicacion_tecnico(
    p_tecnico_id INTEGER,
    p_latitud DECIMAL,
    p_longitud DECIMAL,
    p_precision DECIMAL DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO ubicacion_tecnico (
        tecnico_id,
        latitud,
        longitud,
        precision_metros
    ) VALUES (
        p_tecnico_id,
        p_latitud,
        p_longitud,
        p_precision
    );

    RETURN QUERY SELECT TRUE, 'Ubicación registrada';
END;
$$;

-- ------------------------------------
-- 8.9. Obtener mis notificaciones enviadas
-- ------------------------------------
CREATE OR REPLACE FUNCTION obtener_mis_notificaciones(
    p_tecnico_id INTEGER,
    p_limite INTEGER DEFAULT 50
)
RETURNS TABLE (
    id INTEGER,
    reclamo_id INTEGER,
    numero_reclamo VARCHAR,
    tipo VARCHAR,
    asunto VARCHAR,
    mensaje TEXT,
    prioridad VARCHAR,
    adjuntos JSONB,
    leida BOOLEAN,
    respondida BOOLEAN,
    respuesta TEXT,
    respondida_por_nombre VARCHAR,
    respondida_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        nt.id,
        nt.reclamo_id,
        r.numero_reclamo,
        nt.tipo,
        nt.asunto,
        nt.mensaje,
        nt.prioridad,
        nt.adjuntos,
        nt.leida,
        nt.respondida,
        nt.respuesta,
        e.nombre_completo as respondida_por_nombre,
        nt.respondida_en,
        nt.created_at
    FROM notificaciones_tecnico nt
    LEFT JOIN reclamos r ON nt.reclamo_id = r.id
    LEFT JOIN empleados e ON nt.respondida_por = e.id
    WHERE nt.tecnico_id = p_tecnico_id
    ORDER BY nt.created_at DESC
    LIMIT p_limite;
END;
$$;

-- ============================================
-- 9. DATOS DE EJEMPLO
-- ============================================

-- Insertar zona de trabajo de ejemplo
INSERT INTO zonas_trabajo (nombre, descripcion, color, coordenadas_poligono, activa)
VALUES
(
    'Zona Centro',
    'Zona céntrica de la ciudad',
    '#3B82F6',
    '[
        {"lat": -25.280, "lng": -57.630},
        {"lat": -25.280, "lng": -57.620},
        {"lat": -25.290, "lng": -57.620},
        {"lat": -25.290, "lng": -57.630}
    ]'::jsonb,
    TRUE
),
(
    'Zona Norte',
    'Zona norte residencial',
    '#10B981',
    '[
        {"lat": -25.270, "lng": -57.630},
        {"lat": -25.270, "lng": -57.620},
        {"lat": -25.280, "lng": -57.620},
        {"lat": -25.280, "lng": -57.630}
    ]'::jsonb,
    TRUE
)
ON CONFLICT DO NOTHING;

-- Insertar cañerías de ejemplo
INSERT INTO canerias (nombre, tipo, diametro_pulgadas, material, coordenadas_linea, zona_trabajo_id, estado)
VALUES
(
    'Tubería Principal Av. España',
    'principal',
    12.00,
    'PVC',
    '[
        {"lat": -25.280, "lng": -57.630},
        {"lat": -25.280, "lng": -57.625},
        {"lat": -25.280, "lng": -57.620}
    ]'::jsonb,
    1,
    'operativa'
),
(
    'Tubería Secundaria Calle Los Lapachos',
    'secundaria',
    6.00,
    'PVC',
    '[
        {"lat": -25.275, "lng": -57.625},
        {"lat": -25.278, "lng": -57.625},
        {"lat": -25.280, "lng": -57.625}
    ]'::jsonb,
    2,
    'operativa'
)
ON CONFLICT DO NOTHING;

-- ============================================
-- FIN DEL SCHEMA
-- ============================================

-- ========================================
-- SISTEMA COMPLETO DE RECLAMOS
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. CREAR TABLA tipos_reclamos
CREATE TABLE IF NOT EXISTS tipos_reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  icono VARCHAR(50),
  prioridad VARCHAR(20) DEFAULT 'media',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_tipos_reclamos_activo ON tipos_reclamos(activo);

-- 2. CREAR TABLA reclamos
CREATE TABLE IF NOT EXISTS reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_reclamo_id UUID REFERENCES tipos_reclamos(id) ON DELETE SET NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente',
  prioridad VARCHAR(20) DEFAULT 'media',
  ubicacion TEXT,
  fotos JSONB DEFAULT '[]',
  respuesta TEXT,
  asignado_a UUID,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_reclamos_cliente ON reclamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_estado ON reclamos(estado);
CREATE INDEX IF NOT EXISTS idx_reclamos_fecha ON reclamos(created_at DESC);

-- 3. CREAR TABLA comentarios_reclamos
CREATE TABLE IF NOT EXISTS comentarios_reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id UUID REFERENCES reclamos(id) ON DELETE CASCADE,
  autor_tipo VARCHAR(20) NOT NULL,
  autor_id UUID NOT NULL,
  comentario TEXT NOT NULL,
  adjuntos JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE INDEX IF NOT EXISTS idx_comentarios_reclamo ON comentarios_reclamos(reclamo_id);

-- 4. INSERTAR TIPOS DE RECLAMOS
INSERT INTO tipos_reclamos (nombre, descripcion, icono, prioridad) VALUES
('Falta de Agua', 'Ausencia total o parcial del suministro de agua', 'water-off', 'alta'),
('Tubería Rota', 'Rotura o fuga en tubería principal o secundaria', 'pipe-broken', 'urgente'),
('Fuga de Agua', 'Fuga visible de agua en instalaciones', 'water-leak', 'alta'),
('Medidor Dañado', 'Medidor con fallas o funcionamiento incorrecto', 'gauge', 'alta'),
('Agua Turbia', 'Agua con color, olor o sabor anormal', 'water-alert', 'media'),
('Presión Baja', 'Presión de agua insuficiente', 'water-low', 'media'),
('Facturación', 'Error o consulta sobre facturación', 'invoice-error', 'media'),
('Alcantarillado', 'Problemas con el sistema de alcantarillado', 'drain', 'alta'),
('Atención al Cliente', 'Consultas o quejas sobre atención', 'support', 'baja'),
('Otro', 'Otro tipo de reclamo o consulta', 'help-circle', 'media')
ON CONFLICT (nombre) DO NOTHING;

-- 5. FUNCIÓN: Obtener tipos de reclamos
CREATE OR REPLACE FUNCTION obtener_tipos_reclamos()
RETURNS TABLE (
  id UUID,
  nombre VARCHAR,
  descripcion TEXT,
  icono VARCHAR,
  prioridad VARCHAR
) AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.nombre, t.descripcion, t.icono, t.prioridad
  FROM tipos_reclamos t
  WHERE t.activo = true
  ORDER BY t.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. FUNCIÓN: Crear reclamo
CREATE OR REPLACE FUNCTION crear_reclamo_cliente(
  p_cliente_id UUID,
  p_tipo_reclamo_id UUID,
  p_titulo VARCHAR,
  p_descripcion TEXT,
  p_ubicacion TEXT DEFAULT NULL,
  p_fotos JSONB DEFAULT '[]'
)
RETURNS JSONB AS $$
DECLARE
  v_reclamo_id UUID;
  v_prioridad VARCHAR;
BEGIN
  -- Obtener prioridad del tipo de reclamo
  SELECT prioridad INTO v_prioridad
  FROM tipos_reclamos
  WHERE id = p_tipo_reclamo_id;

  -- Crear el reclamo
  INSERT INTO reclamos (
    cliente_id,
    tipo_reclamo_id,
    titulo,
    descripcion,
    ubicacion,
    fotos,
    prioridad,
    estado
  ) VALUES (
    p_cliente_id,
    p_tipo_reclamo_id,
    p_titulo,
    p_descripcion,
    p_ubicacion,
    p_fotos,
    COALESCE(v_prioridad, 'media'),
    'pendiente'
  ) RETURNING id INTO v_reclamo_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Reclamo creado exitosamente',
    'reclamo_id', v_reclamo_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exito', false,
    'mensaje', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. FUNCIÓN: Obtener reclamos del cliente
CREATE OR REPLACE FUNCTION obtener_reclamos_cliente(
  p_cliente_id UUID,
  p_estado VARCHAR DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  tipo_reclamo_id UUID,
  titulo VARCHAR,
  descripcion TEXT,
  estado VARCHAR,
  prioridad VARCHAR,
  ubicacion TEXT,
  fotos JSONB,
  respuesta TEXT,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  tipo_nombre VARCHAR,
  tipo_icono VARCHAR,
  total_comentarios BIGINT,
  fecha_creacion TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.cliente_id,
    r.tipo_reclamo_id,
    r.titulo,
    r.descripcion,
    r.estado,
    r.prioridad,
    r.ubicacion,
    r.fotos,
    r.respuesta,
    r.fecha_resolucion,
    r.created_at,
    tr.nombre as tipo_nombre,
    tr.icono as tipo_icono,
    (SELECT COUNT(*) FROM comentarios_reclamos cr WHERE cr.reclamo_id = r.id) as total_comentarios,
    r.created_at as fecha_creacion
  FROM reclamos r
  LEFT JOIN tipos_reclamos tr ON r.tipo_reclamo_id = tr.id
  WHERE r.cliente_id = p_cliente_id
    AND (p_estado IS NULL OR r.estado = p_estado)
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. FUNCIÓN: Obtener comentarios de reclamo
CREATE OR REPLACE FUNCTION obtener_comentarios_reclamo(
  p_reclamo_id UUID,
  p_cliente_id UUID
)
RETURNS TABLE (
  id UUID,
  reclamo_id UUID,
  autor_tipo VARCHAR,
  autor_id UUID,
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  fecha_comentario TIMESTAMP WITH TIME ZONE,
  es_cliente BOOLEAN
) AS $$
BEGIN
  IF NOT EXISTS(SELECT 1 FROM reclamos WHERE reclamos.id = p_reclamo_id AND reclamos.cliente_id = p_cliente_id) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.reclamo_id,
    c.autor_tipo,
    c.autor_id,
    c.comentario,
    c.created_at,
    c.created_at as fecha_comentario,
    (c.autor_tipo = 'cliente') as es_cliente
  FROM comentarios_reclamos c
  WHERE c.reclamo_id = p_reclamo_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. FUNCIÓN: Agregar comentario
CREATE OR REPLACE FUNCTION agregar_comentario_reclamo(
  p_reclamo_id UUID,
  p_cliente_id UUID,
  p_comentario TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_comentario_id UUID;
BEGIN
  IF NOT EXISTS(SELECT 1 FROM reclamos WHERE id = p_reclamo_id AND cliente_id = p_cliente_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Reclamo no encontrado');
  END IF;

  INSERT INTO comentarios_reclamos (reclamo_id, autor_tipo, autor_id, comentario)
  VALUES (p_reclamo_id, 'cliente', p_cliente_id, p_comentario)
  RETURNING id INTO v_comentario_id;

  RETURN jsonb_build_object('exito', true, 'mensaje', 'Comentario agregado', 'comentario_id', v_comentario_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. PERMISOS PARA TODAS LAS FUNCIONES
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO anon;
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO authenticated;
GRANT EXECUTE ON FUNCTION crear_reclamo_cliente(UUID, UUID, VARCHAR, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION crear_reclamo_cliente(UUID, UUID, VARCHAR, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION agregar_comentario_reclamo(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION agregar_comentario_reclamo(UUID, UUID, TEXT) TO authenticated;

-- 11. VERIFICAR
SELECT 'Tipos de reclamos creados:' as info, COUNT(*) as total FROM tipos_reclamos;
SELECT 'Tablas creadas correctamente' as resultado;

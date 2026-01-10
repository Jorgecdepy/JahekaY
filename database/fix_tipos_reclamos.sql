-- ========================================
-- CORRECCIONES PARA TIPOS DE RECLAMOS
-- Ejecutar en Supabase SQL Editor
-- ========================================

-- 1. Insertar tipos de reclamos (si no existen)
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

-- 2. Actualizar la función obtener_reclamos_cliente para devolver tipo_nombre
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
  asignado_a UUID,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
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
    r.asignado_a,
    r.fecha_resolucion,
    r.created_at,
    r.updated_at,
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

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO authenticated;

-- 3. Actualizar función obtener_tipos_reclamos para devolver formato correcto
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
  SELECT
    t.id,
    t.nombre,
    t.descripcion,
    t.icono,
    t.prioridad
  FROM tipos_reclamos t
  WHERE t.activo = true
  ORDER BY t.nombre;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO anon;
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO authenticated;

-- 4. Actualizar función obtener_comentarios_reclamo para devolver formato correcto
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
  adjuntos JSONB,
  created_at TIMESTAMP WITH TIME ZONE,
  fecha_comentario TIMESTAMP WITH TIME ZONE,
  es_cliente BOOLEAN
) AS $$
BEGIN
  -- Verificar que el reclamo pertenece al cliente
  IF NOT EXISTS(
    SELECT 1 FROM reclamos
    WHERE reclamos.id = p_reclamo_id AND reclamos.cliente_id = p_cliente_id
  ) THEN
    RETURN;
  END IF;

  RETURN QUERY
  SELECT
    c.id,
    c.reclamo_id,
    c.autor_tipo,
    c.autor_id,
    c.comentario,
    c.adjuntos,
    c.created_at,
    c.created_at as fecha_comentario,
    (c.autor_tipo = 'cliente') as es_cliente
  FROM comentarios_reclamos c
  WHERE c.reclamo_id = p_reclamo_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Otorgar permisos
GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO authenticated;

-- 5. Verificar que los datos se insertaron correctamente
SELECT id, nombre, prioridad FROM tipos_reclamos WHERE activo = true ORDER BY nombre;

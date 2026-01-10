-- ========================================
-- FUNCIONES DE GESTIÓN ADMIN DE RECLAMOS
-- Para el tablero Kanban de arrastrar y soltar
-- ========================================

-- 1. FUNCIÓN: Obtener todos los reclamos (Admin)
CREATE OR REPLACE FUNCTION obtener_reclamos_admin()
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  cliente_nombre VARCHAR,
  cliente_direccion TEXT,
  tipo_reclamo_id UUID,
  tipo_nombre VARCHAR,
  tipo_icono VARCHAR,
  titulo VARCHAR,
  descripcion TEXT,
  estado VARCHAR,
  prioridad VARCHAR,
  ubicacion TEXT,
  fotos JSONB,
  respuesta TEXT,
  asignado_a UUID,
  asignado_nombre VARCHAR,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE,
  total_comentarios BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.cliente_id,
    u.nombre_completo::VARCHAR as cliente_nombre,
    u.direccion as cliente_direccion,
    r.tipo_reclamo_id,
    tr.nombre as tipo_nombre,
    tr.icono as tipo_icono,
    r.titulo,
    r.descripcion,
    r.estado,
    r.prioridad,
    r.ubicacion,
    r.fotos,
    r.respuesta,
    r.asignado_a,
    e.nombre_completo::VARCHAR as asignado_nombre,
    r.fecha_resolucion,
    r.created_at,
    r.updated_at,
    (SELECT COUNT(*) FROM comentarios_reclamos cr WHERE cr.reclamo_id = r.id) as total_comentarios
  FROM reclamos r
  LEFT JOIN usuarios u ON r.cliente_id = u.id
  LEFT JOIN tipos_reclamos tr ON r.tipo_reclamo_id = tr.id
  LEFT JOIN empleados e ON r.asignado_a = e.id
  ORDER BY
    CASE r.prioridad
      WHEN 'urgente' THEN 1
      WHEN 'alta' THEN 2
      WHEN 'media' THEN 3
      WHEN 'baja' THEN 4
      ELSE 5
    END,
    r.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. FUNCIÓN: Actualizar estado de reclamo
CREATE OR REPLACE FUNCTION actualizar_estado_reclamo(
  p_reclamo_id UUID,
  p_nuevo_estado VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_fecha_resolucion TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Si el nuevo estado es 'resuelto', establecer fecha de resolución
  IF p_nuevo_estado = 'resuelto' THEN
    v_fecha_resolucion := NOW();
  ELSE
    v_fecha_resolucion := NULL;
  END IF;

  -- Actualizar el reclamo
  UPDATE reclamos
  SET
    estado = p_nuevo_estado,
    fecha_resolucion = v_fecha_resolucion,
    updated_at = NOW()
  WHERE id = p_reclamo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'Reclamo no encontrado'
    );
  END IF;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Estado actualizado exitosamente'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exito', false,
    'mensaje', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. FUNCIÓN: Asignar reclamo a empleado
CREATE OR REPLACE FUNCTION asignar_reclamo(
  p_reclamo_id UUID,
  p_empleado_id UUID,
  p_cambiar_estado BOOLEAN DEFAULT true
)
RETURNS JSONB AS $$
BEGIN
  -- Verificar que el empleado existe
  IF NOT EXISTS(SELECT 1 FROM empleados WHERE id = p_empleado_id) THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'Empleado no encontrado'
    );
  END IF;

  -- Actualizar el reclamo
  UPDATE reclamos
  SET
    asignado_a = p_empleado_id,
    estado = CASE
      WHEN p_cambiar_estado THEN 'asignado'
      ELSE estado
    END,
    updated_at = NOW()
  WHERE id = p_reclamo_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'Reclamo no encontrado'
    );
  END IF;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Reclamo asignado exitosamente'
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exito', false,
    'mensaje', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. FUNCIÓN: Agregar comentario como admin
CREATE OR REPLACE FUNCTION agregar_comentario_admin(
  p_reclamo_id UUID,
  p_empleado_id UUID,
  p_comentario TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_comentario_id UUID;
BEGIN
  -- Verificar que el reclamo existe
  IF NOT EXISTS(SELECT 1 FROM reclamos WHERE id = p_reclamo_id) THEN
    RETURN jsonb_build_object('exito', false, 'mensaje', 'Reclamo no encontrado');
  END IF;

  -- Insertar comentario
  INSERT INTO comentarios_reclamos (reclamo_id, autor_tipo, autor_id, comentario)
  VALUES (p_reclamo_id, 'admin', p_empleado_id, p_comentario)
  RETURNING id INTO v_comentario_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Comentario agregado exitosamente',
    'comentario_id', v_comentario_id
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exito', false,
    'mensaje', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. FUNCIÓN: Obtener comentarios para admin (todos los comentarios)
CREATE OR REPLACE FUNCTION obtener_comentarios_admin(
  p_reclamo_id UUID
)
RETURNS TABLE (
  id UUID,
  reclamo_id UUID,
  autor_tipo VARCHAR,
  autor_id UUID,
  autor_nombre VARCHAR,
  comentario TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  fecha_comentario TIMESTAMP WITH TIME ZONE,
  es_cliente BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id,
    c.reclamo_id,
    c.autor_tipo,
    c.autor_id,
    CASE
      WHEN c.autor_tipo = 'cliente' THEN u.nombre_completo::VARCHAR
      WHEN c.autor_tipo = 'admin' THEN e.nombre_completo::VARCHAR
      ELSE 'Desconocido'
    END as autor_nombre,
    c.comentario,
    c.created_at,
    c.created_at as fecha_comentario,
    (c.autor_tipo = 'cliente') as es_cliente
  FROM comentarios_reclamos c
  LEFT JOIN usuarios u ON c.autor_tipo = 'cliente' AND c.autor_id = u.id
  LEFT JOIN empleados e ON c.autor_tipo = 'admin' AND c.autor_id = e.id
  WHERE c.reclamo_id = p_reclamo_id
  ORDER BY c.created_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. PERMISOS
GRANT EXECUTE ON FUNCTION obtener_reclamos_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION actualizar_estado_reclamo(UUID, VARCHAR) TO authenticated;
GRANT EXECUTE ON FUNCTION asignar_reclamo(UUID, UUID, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION agregar_comentario_admin(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION obtener_comentarios_admin(UUID) TO authenticated;

-- 7. VERIFICAR
SELECT 'Funciones de gestión admin creadas correctamente' as resultado;

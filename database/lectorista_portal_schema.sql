-- ========================================
-- FUNCIONES DEL PORTAL DEL LECTORISTA
-- Para el registro de lecturas en campo
-- ========================================

-- 1. Buscar clientes para cargar lectura
CREATE OR REPLACE FUNCTION buscar_clientes_lectura(
  p_busqueda VARCHAR
)
RETURNS TABLE (
  id UUID,
  nombre_completo VARCHAR,
  numero_medidor VARCHAR,
  direccion TEXT,
  telefono VARCHAR,
  activo BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.nombre_completo::VARCHAR,
    u.numero_medidor::VARCHAR,
    u.direccion,
    u.telefono::VARCHAR,
    u.activo
  FROM usuarios u
  WHERE u.activo = true
    AND (
      u.nombre_completo ILIKE '%' || p_busqueda || '%'
      OR u.numero_medidor ILIKE '%' || p_busqueda || '%'
      OR u.direccion ILIKE '%' || p_busqueda || '%'
    )
  ORDER BY u.nombre_completo
  LIMIT 20;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION buscar_clientes_lectura(VARCHAR) TO authenticated;

-- 2. Obtener última lectura de un cliente
CREATE OR REPLACE FUNCTION obtener_ultima_lectura_cliente(
  p_cliente_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_lectura JSONB;
BEGIN
  SELECT jsonb_build_object(
    'id', l.id,
    'fecha_lectura', l.fecha_lectura,
    'lectura_anterior', l.lectura_anterior,
    'lectura_actual', l.lectura_actual,
    'consumo_m3', l.consumo_m3,
    'observaciones', l.observaciones
  ) INTO v_lectura
  FROM lecturas l
  WHERE l.cliente_id = p_cliente_id
  ORDER BY l.fecha_lectura DESC, l.created_at DESC
  LIMIT 1;

  RETURN v_lectura;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_ultima_lectura_cliente(UUID) TO authenticated;

-- 3. Registrar nueva lectura (por lectorista)
CREATE OR REPLACE FUNCTION registrar_lectura_lectorista(
  p_cliente_id UUID,
  p_empleado_id UUID,
  p_lectura_actual INT,
  p_observaciones TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_lectura_anterior INT;
  v_consumo INT;
  v_lectura_id UUID;
  v_fecha_lectura DATE;
BEGIN
  -- Obtener lectura anterior
  SELECT COALESCE(lectura_actual, 0) INTO v_lectura_anterior
  FROM lecturas
  WHERE cliente_id = p_cliente_id
  ORDER BY fecha_lectura DESC, created_at DESC
  LIMIT 1;

  -- Si no hay lectura anterior, usar 0
  IF v_lectura_anterior IS NULL THEN
    v_lectura_anterior := 0;
  END IF;

  -- Validar que la lectura actual sea mayor o igual a la anterior
  IF p_lectura_actual < v_lectura_anterior THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'La lectura actual debe ser mayor o igual a la anterior (' || v_lectura_anterior || ')'
    );
  END IF;

  -- Calcular consumo
  v_consumo := p_lectura_actual - v_lectura_anterior;
  v_fecha_lectura := CURRENT_DATE;

  -- Insertar nueva lectura
  INSERT INTO lecturas (
    cliente_id,
    fecha_lectura,
    lectura_anterior,
    lectura_actual,
    consumo_m3,
    observaciones
  ) VALUES (
    p_cliente_id,
    v_fecha_lectura,
    v_lectura_anterior,
    p_lectura_actual,
    v_consumo,
    p_observaciones
  ) RETURNING id INTO v_lectura_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Lectura registrada exitosamente',
    'lectura_id', v_lectura_id,
    'consumo', v_consumo
  );

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'exito', false,
    'mensaje', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION registrar_lectura_lectorista(UUID, UUID, INT, TEXT) TO authenticated;

-- 4. Obtener estadísticas del lectorista
CREATE OR REPLACE FUNCTION obtener_stats_lectorista(
  p_empleado_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
  v_lecturas_hoy INT;
  v_lecturas_mes INT;
  v_clientes_pendientes INT;
BEGIN
  -- Lecturas de hoy (todas las lecturas del día)
  SELECT COUNT(*) INTO v_lecturas_hoy
  FROM lecturas
  WHERE DATE(created_at) = CURRENT_DATE;

  -- Lecturas del mes
  SELECT COUNT(*) INTO v_lecturas_mes
  FROM lecturas
  WHERE DATE_TRUNC('month', created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Clientes sin lectura este mes
  SELECT COUNT(*) INTO v_clientes_pendientes
  FROM usuarios u
  WHERE u.activo = true
    AND NOT EXISTS (
      SELECT 1 FROM lecturas l
      WHERE l.cliente_id = u.id
        AND DATE_TRUNC('month', l.fecha_lectura) = DATE_TRUNC('month', CURRENT_DATE)
    );

  RETURN jsonb_build_object(
    'lecturas_hoy', v_lecturas_hoy,
    'lecturas_mes', v_lecturas_mes,
    'clientes_pendientes', v_clientes_pendientes
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_stats_lectorista(UUID) TO authenticated;

-- 5. Obtener lecturas realizadas por el lectorista
CREATE OR REPLACE FUNCTION obtener_lecturas_lectorista(
  p_empleado_id UUID,
  p_filtro_fecha VARCHAR DEFAULT 'hoy',
  p_limite INT DEFAULT 50
)
RETURNS TABLE (
  id UUID,
  cliente_id UUID,
  cliente_nombre VARCHAR,
  numero_medidor VARCHAR,
  fecha_lectura DATE,
  lectura_anterior INT,
  lectura_actual INT,
  consumo_m3 INT,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.id,
    l.cliente_id,
    u.nombre_completo::VARCHAR as cliente_nombre,
    u.numero_medidor::VARCHAR,
    l.fecha_lectura,
    l.lectura_anterior,
    l.lectura_actual,
    l.consumo_m3,
    l.observaciones,
    l.created_at
  FROM lecturas l
  JOIN usuarios u ON l.cliente_id = u.id
  WHERE
    CASE p_filtro_fecha
      WHEN 'hoy' THEN DATE(l.created_at) = CURRENT_DATE
      WHEN 'semana' THEN l.created_at >= CURRENT_DATE - INTERVAL '7 days'
      WHEN 'mes' THEN DATE_TRUNC('month', l.created_at) = DATE_TRUNC('month', CURRENT_DATE)
      ELSE true
    END
  ORDER BY l.created_at DESC
  LIMIT p_limite;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_lecturas_lectorista(UUID, VARCHAR, INT) TO authenticated;

-- 6. Obtener detalle de cliente para lectura
CREATE OR REPLACE FUNCTION obtener_detalle_cliente_lectura(
  p_cliente_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_cliente JSONB;
  v_ultima_lectura JSONB;
  v_historial JSONB;
BEGIN
  -- Datos del cliente
  SELECT jsonb_build_object(
    'id', u.id,
    'nombre_completo', u.nombre_completo,
    'numero_medidor', u.numero_medidor,
    'direccion', u.direccion,
    'telefono', u.telefono,
    'email', u.email,
    'activo', u.activo
  ) INTO v_cliente
  FROM usuarios u
  WHERE u.id = p_cliente_id;

  IF v_cliente IS NULL THEN
    RETURN NULL;
  END IF;

  -- Última lectura
  SELECT jsonb_build_object(
    'id', l.id,
    'fecha_lectura', l.fecha_lectura,
    'lectura_actual', l.lectura_actual,
    'consumo_m3', l.consumo_m3
  ) INTO v_ultima_lectura
  FROM lecturas l
  WHERE l.cliente_id = p_cliente_id
  ORDER BY l.fecha_lectura DESC, l.created_at DESC
  LIMIT 1;

  -- Historial de últimas lecturas
  SELECT COALESCE(jsonb_agg(row_to_json(h.*)), '[]'::jsonb) INTO v_historial
  FROM (
    SELECT
      l.fecha_lectura,
      l.lectura_actual,
      l.consumo_m3
    FROM lecturas l
    WHERE l.cliente_id = p_cliente_id
    ORDER BY l.fecha_lectura DESC
    LIMIT 6
  ) h;

  RETURN v_cliente || jsonb_build_object(
    'ultima_lectura', v_ultima_lectura,
    'historial_lecturas', v_historial
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_detalle_cliente_lectura(UUID) TO authenticated;

-- Verificar que las funciones fueron creadas
SELECT 'Funciones del portal lectorista creadas correctamente' as resultado;

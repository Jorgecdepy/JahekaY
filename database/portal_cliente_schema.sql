-- ========================================
-- PORTAL DEL CLIENTE
-- ========================================
-- Sistema para que clientes accedan a su información,
-- hagan reclamos y descarguen facturas

-- ========================================
-- AGREGAR CÓDIGO PIN A USUARIOS
-- ========================================

-- Agregar columna de código PIN para autenticación de clientes
ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS codigo_pin VARCHAR(6);

-- Índice para búsqueda rápida por código PIN
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_pin ON usuarios(codigo_pin);

-- ========================================
-- TABLA DE TIPOS DE RECLAMOS
-- ========================================

CREATE TABLE IF NOT EXISTS tipos_reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(100) NOT NULL UNIQUE,
  descripcion TEXT,
  icono VARCHAR(50), -- Nombre del icono para UI
  prioridad VARCHAR(20) DEFAULT 'media', -- baja, media, alta, urgente
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_tipos_reclamos_activo ON tipos_reclamos(activo);

-- ========================================
-- TABLA DE RECLAMOS
-- ========================================

CREATE TABLE IF NOT EXISTS reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_reclamo_id UUID REFERENCES tipos_reclamos(id) ON DELETE SET NULL,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NOT NULL,
  estado VARCHAR(50) DEFAULT 'pendiente', -- pendiente, en_proceso, resuelto, cerrado
  prioridad VARCHAR(20) DEFAULT 'media', -- baja, media, alta, urgente
  ubicacion TEXT, -- Ubicación específica del problema
  fotos JSONB DEFAULT '[]', -- Array de URLs de fotos
  respuesta TEXT, -- Respuesta del administrador
  asignado_a UUID REFERENCES empleados(id) ON DELETE SET NULL,
  fecha_resolucion TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para rendimiento
CREATE INDEX IF NOT EXISTS idx_reclamos_cliente ON reclamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_reclamos_estado ON reclamos(estado);
CREATE INDEX IF NOT EXISTS idx_reclamos_prioridad ON reclamos(prioridad);
CREATE INDEX IF NOT EXISTS idx_reclamos_asignado ON reclamos(asignado_a);
CREATE INDEX IF NOT EXISTS idx_reclamos_fecha ON reclamos(created_at DESC);

-- ========================================
-- TABLA DE COMENTARIOS EN RECLAMOS
-- ========================================

CREATE TABLE IF NOT EXISTS comentarios_reclamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reclamo_id UUID REFERENCES reclamos(id) ON DELETE CASCADE,
  autor_tipo VARCHAR(20) NOT NULL, -- 'cliente' o 'empleado'
  autor_id UUID NOT NULL, -- ID del cliente o empleado
  comentario TEXT NOT NULL,
  adjuntos JSONB DEFAULT '[]', -- Array de URLs de archivos adjuntos
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_comentarios_reclamo ON comentarios_reclamos(reclamo_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_fecha ON comentarios_reclamos(created_at DESC);

-- ========================================
-- TABLA DE NOTIFICACIONES PARA CLIENTES
-- ========================================

CREATE TABLE IF NOT EXISTS notificaciones_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL, -- 'factura', 'pago', 'reclamo', 'aviso', 'alerta'
  titulo VARCHAR(200) NOT NULL,
  mensaje TEXT NOT NULL,
  enlace VARCHAR(500), -- URL o ruta de referencia
  leida BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_notificaciones_cliente ON notificaciones_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_leida ON notificaciones_clientes(leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_fecha ON notificaciones_clientes(created_at DESC);

-- ========================================
-- TABLA DE SESIONES DE CLIENTES (OPCIONAL)
-- ========================================

CREATE TABLE IF NOT EXISTS sesiones_clientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  token VARCHAR(500) NOT NULL UNIQUE,
  dispositivo VARCHAR(200), -- Info del dispositivo/navegador
  ip_address INET,
  ultima_actividad TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  expira_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW() + INTERVAL '30 days'),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_sesiones_cliente ON sesiones_clientes(cliente_id);
CREATE INDEX IF NOT EXISTS idx_sesiones_token ON sesiones_clientes(token);
CREATE INDEX IF NOT EXISTS idx_sesiones_expiracion ON sesiones_clientes(expira_en);

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

-- Habilitar RLS
ALTER TABLE tipos_reclamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reclamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE comentarios_reclamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE notificaciones_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE sesiones_clientes ENABLE ROW LEVEL SECURITY;

-- Políticas para tipos_reclamos (lectura pública)
CREATE POLICY "Todos pueden ver tipos de reclamos activos"
  ON tipos_reclamos FOR SELECT
  TO authenticated, anon
  USING (activo = true);

-- Políticas para reclamos
CREATE POLICY "Clientes ven solo sus reclamos"
  ON reclamos FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid() OR auth.uid() IN (SELECT id FROM empleados));

CREATE POLICY "Clientes crean sus reclamos"
  ON reclamos FOR INSERT
  TO authenticated
  WITH CHECK (cliente_id = auth.uid());

CREATE POLICY "Clientes actualizan sus reclamos"
  ON reclamos FOR UPDATE
  TO authenticated
  USING (cliente_id = auth.uid() OR auth.uid() IN (SELECT id FROM empleados));

-- Políticas para comentarios
CREATE POLICY "Ver comentarios de reclamos propios"
  ON comentarios_reclamos FOR SELECT
  TO authenticated
  USING (
    reclamo_id IN (SELECT id FROM reclamos WHERE cliente_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM empleados)
  );

CREATE POLICY "Crear comentarios en reclamos propios"
  ON comentarios_reclamos FOR INSERT
  TO authenticated
  WITH CHECK (
    reclamo_id IN (SELECT id FROM reclamos WHERE cliente_id = auth.uid())
    OR auth.uid() IN (SELECT id FROM empleados)
  );

-- Políticas para notificaciones
CREATE POLICY "Clientes ven solo sus notificaciones"
  ON notificaciones_clientes FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

CREATE POLICY "Clientes marcan sus notificaciones como leídas"
  ON notificaciones_clientes FOR UPDATE
  TO authenticated
  USING (cliente_id = auth.uid());

-- Políticas para sesiones
CREATE POLICY "Clientes ven solo sus sesiones"
  ON sesiones_clientes FOR SELECT
  TO authenticated
  USING (cliente_id = auth.uid());

-- ========================================
-- TRIGGERS
-- ========================================

-- Trigger para actualizar updated_at en tipos_reclamos
CREATE TRIGGER update_tipos_reclamos_updated_at
  BEFORE UPDATE ON tipos_reclamos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger para actualizar updated_at en reclamos
CREATE TRIGGER update_reclamos_updated_at
  BEFORE UPDATE ON reclamos
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista de reclamos con información completa
CREATE OR REPLACE VIEW vista_reclamos_completa AS
SELECT
  r.id,
  r.titulo,
  r.descripcion,
  r.estado,
  r.prioridad,
  r.ubicacion,
  r.fotos,
  r.respuesta,
  r.fecha_resolucion,
  r.created_at,
  r.updated_at,
  u.id as cliente_id,
  u.nombre_completo as cliente_nombre,
  u.numero_medidor,
  u.telefono as cliente_telefono,
  u.direccion as cliente_direccion,
  tr.nombre as tipo_reclamo,
  tr.icono as tipo_icono,
  e.nombre_completo as asignado_nombre,
  (SELECT COUNT(*) FROM comentarios_reclamos WHERE reclamo_id = r.id) as total_comentarios
FROM reclamos r
LEFT JOIN usuarios u ON r.cliente_id = u.id
LEFT JOIN tipos_reclamos tr ON r.tipo_reclamo_id = tr.id
LEFT JOIN empleados e ON r.asignado_a = e.id;

-- Vista de estadísticas del cliente
CREATE OR REPLACE VIEW vista_estadisticas_cliente AS
SELECT
  u.id as cliente_id,
  u.nombre_completo,
  u.numero_medidor,
  -- Facturas
  (SELECT COUNT(*) FROM facturas WHERE cliente_id = u.id) as total_facturas,
  (SELECT COUNT(*) FROM facturas WHERE cliente_id = u.id AND estado = 'pagada') as facturas_pagadas,
  (SELECT COUNT(*) FROM facturas WHERE cliente_id = u.id AND estado = 'pendiente') as facturas_pendientes,
  (SELECT COUNT(*) FROM facturas WHERE cliente_id = u.id AND estado = 'vencida') as facturas_vencidas,
  (SELECT SUM(total) FROM facturas WHERE cliente_id = u.id AND estado IN ('pendiente', 'vencida')) as saldo_pendiente,
  (SELECT SUM(total) FROM facturas WHERE cliente_id = u.id AND estado = 'pagada') as total_pagado,
  -- Lecturas
  (SELECT COUNT(*) FROM lecturas WHERE cliente_id = u.id) as total_lecturas,
  (SELECT AVG(consumo_m3) FROM lecturas WHERE cliente_id = u.id) as consumo_promedio,
  (SELECT MAX(consumo_m3) FROM lecturas WHERE cliente_id = u.id) as consumo_maximo,
  (SELECT MIN(consumo_m3) FROM lecturas WHERE cliente_id = u.id) as consumo_minimo,
  -- Última lectura
  (SELECT fecha_lectura FROM lecturas WHERE cliente_id = u.id ORDER BY fecha_lectura DESC LIMIT 1) as ultima_lectura_fecha,
  (SELECT consumo_m3 FROM lecturas WHERE cliente_id = u.id ORDER BY fecha_lectura DESC LIMIT 1) as ultima_lectura_consumo,
  -- Reclamos
  (SELECT COUNT(*) FROM reclamos WHERE cliente_id = u.id) as total_reclamos,
  (SELECT COUNT(*) FROM reclamos WHERE cliente_id = u.id AND estado = 'pendiente') as reclamos_pendientes,
  (SELECT COUNT(*) FROM reclamos WHERE cliente_id = u.id AND estado = 'resuelto') as reclamos_resueltos
FROM usuarios u
WHERE u.activo = true;

-- ========================================
-- TIPOS DE RECLAMOS PREDEFINIDOS
-- ========================================

INSERT INTO tipos_reclamos (nombre, descripcion, icono, prioridad) VALUES
('Falta de Agua', 'Ausencia total o parcial del suministro de agua', 'water-off', 'alta'),
('Tubería Rota', 'Rotura o fuga en tubería principal o secundaria', 'pipe-broken', 'urgente'),
('Medidor Dañado', 'Medidor con fallas o funcionamiento incorrecto', 'gauge', 'alta'),
('Agua Turbia', 'Agua con color, olor o sabor anormal', 'water-alert', 'media'),
('Baja Presión', 'Presión de agua insuficiente', 'water-low', 'media'),
('Facturación Incorrecta', 'Error o inconsistencia en la factura', 'invoice-error', 'media'),
('Fuga en Calle', 'Fuga de agua en vía pública', 'street-leak', 'alta'),
('Solicitud de Corte', 'Solicitud de suspensión temporal del servicio', 'service-stop', 'baja'),
('Solicitud de Reconexión', 'Solicitud de reactivación del servicio', 'service-start', 'media'),
('Otro', 'Otro tipo de reclamo o consulta', 'help-circle', 'media')
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- FUNCIONES ÚTILES
-- ========================================

-- Función para autenticar cliente con número de medidor y PIN
CREATE OR REPLACE FUNCTION autenticar_cliente(
  p_numero_medidor VARCHAR,
  p_codigo_pin VARCHAR
)
RETURNS JSONB AS $$
DECLARE
  v_cliente usuarios%ROWTYPE;
  v_token VARCHAR;
BEGIN
  -- Buscar cliente
  SELECT * INTO v_cliente
  FROM usuarios
  WHERE numero_medidor = p_numero_medidor
    AND codigo_pin = p_codigo_pin
    AND activo = true;

  -- Verificar si existe
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'Número de medidor o código PIN incorrecto'
    );
  END IF;

  -- Generar token de sesión
  v_token := encode(gen_random_bytes(32), 'base64');

  -- Crear sesión
  INSERT INTO sesiones_clientes (cliente_id, token)
  VALUES (v_cliente.id, v_token);

  -- Retornar datos
  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Autenticación exitosa',
    'token', v_token,
    'cliente', jsonb_build_object(
      'id', v_cliente.id,
      'nombre_completo', v_cliente.nombre_completo,
      'numero_medidor', v_cliente.numero_medidor,
      'email', v_cliente.email,
      'telefono', v_cliente.telefono,
      'direccion', v_cliente.direccion
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permisos de ejecución para usuarios anónimos y autenticados
GRANT EXECUTE ON FUNCTION autenticar_cliente(VARCHAR, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION autenticar_cliente(VARCHAR, VARCHAR) TO authenticated;

-- ========================================
-- FUNCIONES RPC PARA EL PORTAL DEL CLIENTE
-- (Permiten acceso a datos sin sesión de Supabase Auth)
-- ========================================

-- Función para obtener facturas del cliente
CREATE OR REPLACE FUNCTION obtener_facturas_cliente(
  p_cliente_id UUID,
  p_estado VARCHAR DEFAULT NULL,
  p_limite INT DEFAULT 100
)
RETURNS JSONB AS $$
DECLARE
  v_facturas JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(f.*)), '[]'::jsonb)
  INTO v_facturas
  FROM (
    SELECT *
    FROM facturas
    WHERE cliente_id = p_cliente_id
      AND (p_estado IS NULL OR estado = p_estado)
    ORDER BY fecha_emision DESC
    LIMIT p_limite
  ) f;

  RETURN v_facturas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_facturas_cliente(UUID, VARCHAR, INT) TO anon;
GRANT EXECUTE ON FUNCTION obtener_facturas_cliente(UUID, VARCHAR, INT) TO authenticated;

-- Función para obtener lecturas del cliente
CREATE OR REPLACE FUNCTION obtener_lecturas_cliente(
  p_cliente_id UUID,
  p_limite INT DEFAULT 50
)
RETURNS JSONB AS $$
DECLARE
  v_lecturas JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(l.*)), '[]'::jsonb)
  INTO v_lecturas
  FROM (
    SELECT *
    FROM lecturas
    WHERE cliente_id = p_cliente_id
    ORDER BY fecha_lectura DESC
    LIMIT p_limite
  ) l;

  RETURN v_lecturas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_lecturas_cliente(UUID, INT) TO anon;
GRANT EXECUTE ON FUNCTION obtener_lecturas_cliente(UUID, INT) TO authenticated;

-- Función para obtener notificaciones del cliente
CREATE OR REPLACE FUNCTION obtener_notificaciones_cliente(
  p_cliente_id UUID,
  p_limite INT DEFAULT 20
)
RETURNS JSONB AS $$
DECLARE
  v_notificaciones JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(n.*)), '[]'::jsonb)
  INTO v_notificaciones
  FROM (
    SELECT *
    FROM notificaciones_clientes
    WHERE cliente_id = p_cliente_id
    ORDER BY created_at DESC
    LIMIT p_limite
  ) n;

  RETURN v_notificaciones;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_notificaciones_cliente(UUID, INT) TO anon;
GRANT EXECUTE ON FUNCTION obtener_notificaciones_cliente(UUID, INT) TO authenticated;

-- Función para marcar notificación como leída
CREATE OR REPLACE FUNCTION marcar_notificacion_leida(
  p_notificacion_id UUID,
  p_cliente_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
  UPDATE notificaciones_clientes
  SET leida = true
  WHERE id = p_notificacion_id
    AND cliente_id = p_cliente_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION marcar_notificacion_leida(UUID, UUID) TO authenticated;

-- Función para obtener reclamos del cliente
CREATE OR REPLACE FUNCTION obtener_reclamos_cliente(
  p_cliente_id UUID,
  p_estado VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_reclamos JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(row_to_json(r.*)), '[]'::jsonb)
  INTO v_reclamos
  FROM (
    SELECT
      rec.*,
      tr.nombre as tipo_reclamo_nombre,
      tr.icono as tipo_reclamo_icono
    FROM reclamos rec
    LEFT JOIN tipos_reclamos tr ON rec.tipo_reclamo_id = tr.id
    WHERE rec.cliente_id = p_cliente_id
      AND (p_estado IS NULL OR rec.estado = p_estado)
    ORDER BY rec.created_at DESC
  ) r;

  RETURN v_reclamos;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO anon;
GRANT EXECUTE ON FUNCTION obtener_reclamos_cliente(UUID, VARCHAR) TO authenticated;

-- Función para crear reclamo del cliente
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

GRANT EXECUTE ON FUNCTION crear_reclamo_cliente(UUID, UUID, VARCHAR, TEXT, TEXT, JSONB) TO anon;
GRANT EXECUTE ON FUNCTION crear_reclamo_cliente(UUID, UUID, VARCHAR, TEXT, TEXT, JSONB) TO authenticated;

-- Función para obtener tipos de reclamos
CREATE OR REPLACE FUNCTION obtener_tipos_reclamos()
RETURNS JSONB AS $$
BEGIN
  RETURN (
    SELECT COALESCE(jsonb_agg(row_to_json(t.*)), '[]'::jsonb)
    FROM tipos_reclamos t
    WHERE activo = true
    ORDER BY nombre
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO anon;
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO authenticated;

-- Función para obtener comentarios de un reclamo
CREATE OR REPLACE FUNCTION obtener_comentarios_reclamo(
  p_reclamo_id UUID,
  p_cliente_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_comentarios JSONB;
  v_reclamo_existe BOOLEAN;
BEGIN
  -- Verificar que el reclamo pertenece al cliente
  SELECT EXISTS(
    SELECT 1 FROM reclamos
    WHERE id = p_reclamo_id AND cliente_id = p_cliente_id
  ) INTO v_reclamo_existe;

  IF NOT v_reclamo_existe THEN
    RETURN '[]'::jsonb;
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(c.*)), '[]'::jsonb)
  INTO v_comentarios
  FROM (
    SELECT *
    FROM comentarios_reclamos
    WHERE reclamo_id = p_reclamo_id
    ORDER BY created_at ASC
  ) c;

  RETURN v_comentarios;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION obtener_comentarios_reclamo(UUID, UUID) TO authenticated;

-- Función para agregar comentario a un reclamo
CREATE OR REPLACE FUNCTION agregar_comentario_reclamo(
  p_reclamo_id UUID,
  p_cliente_id UUID,
  p_comentario TEXT
)
RETURNS JSONB AS $$
DECLARE
  v_reclamo_existe BOOLEAN;
  v_comentario_id UUID;
BEGIN
  -- Verificar que el reclamo pertenece al cliente
  SELECT EXISTS(
    SELECT 1 FROM reclamos
    WHERE id = p_reclamo_id AND cliente_id = p_cliente_id
  ) INTO v_reclamo_existe;

  IF NOT v_reclamo_existe THEN
    RETURN jsonb_build_object(
      'exito', false,
      'mensaje', 'Reclamo no encontrado'
    );
  END IF;

  -- Insertar comentario
  INSERT INTO comentarios_reclamos (
    reclamo_id,
    autor_tipo,
    autor_id,
    comentario
  ) VALUES (
    p_reclamo_id,
    'cliente',
    p_cliente_id,
    p_comentario
  ) RETURNING id INTO v_comentario_id;

  RETURN jsonb_build_object(
    'exito', true,
    'mensaje', 'Comentario agregado exitosamente',
    'comentario_id', v_comentario_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION agregar_comentario_reclamo(UUID, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION agregar_comentario_reclamo(UUID, UUID, TEXT) TO authenticated;

-- Función para generar código PIN aleatorio
CREATE OR REPLACE FUNCTION generar_pin_cliente(p_cliente_id UUID)
RETURNS VARCHAR AS $$
DECLARE
  v_pin VARCHAR(6);
BEGIN
  -- Generar PIN de 6 dígitos
  v_pin := LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0');

  -- Actualizar usuario
  UPDATE usuarios
  SET codigo_pin = v_pin
  WHERE id = p_cliente_id;

  RETURN v_pin;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para crear notificación para cliente
CREATE OR REPLACE FUNCTION crear_notificacion_cliente(
  p_cliente_id UUID,
  p_tipo VARCHAR,
  p_titulo VARCHAR,
  p_mensaje TEXT,
  p_enlace VARCHAR DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_notificacion_id UUID;
BEGIN
  INSERT INTO notificaciones_clientes (
    cliente_id,
    tipo,
    titulo,
    mensaje,
    enlace
  ) VALUES (
    p_cliente_id,
    p_tipo,
    p_titulo,
    p_mensaje,
    p_enlace
  ) RETURNING id INTO v_notificacion_id;

  RETURN v_notificacion_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener estadísticas del cliente
CREATE OR REPLACE FUNCTION obtener_estadisticas_cliente(p_cliente_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_stats JSONB;
BEGIN
  SELECT row_to_json(v.*)::jsonb INTO v_stats
  FROM vista_estadisticas_cliente v
  WHERE cliente_id = p_cliente_id;

  RETURN COALESCE(v_stats, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION obtener_estadisticas_cliente(UUID) TO anon;
GRANT EXECUTE ON FUNCTION obtener_estadisticas_cliente(UUID) TO authenticated;

-- ========================================
-- TRIGGER AUTOMÁTICO DE NOTIFICACIONES
-- ========================================

-- Notificar al cliente cuando se crea una nueva factura
CREATE OR REPLACE FUNCTION notificar_nueva_factura()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM crear_notificacion_cliente(
    NEW.cliente_id,
    'factura',
    'Nueva Factura Generada',
    'Se ha generado tu factura del mes ' || TO_CHAR(NEW.fecha_emision, 'Month YYYY') ||
    '. Total: ' || TO_CHAR(NEW.total, 'FM999G999G999') || ' Gs.',
    '/portal-cliente/facturas/' || NEW.id::text
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_nueva_factura
  AFTER INSERT ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION notificar_nueva_factura();

-- Notificar cuando una factura es pagada
CREATE OR REPLACE FUNCTION notificar_pago_factura()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.estado = 'pagada' AND OLD.estado != 'pagada' THEN
    PERFORM crear_notificacion_cliente(
      NEW.cliente_id,
      'pago',
      'Pago Registrado',
      'Tu pago de ' || TO_CHAR(NEW.total, 'FM999G999G999') || ' Gs. ha sido registrado exitosamente.',
      '/portal-cliente/pagos'
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_pago_factura
  AFTER UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION notificar_pago_factura();

-- Notificar cuando un reclamo cambia de estado
CREATE OR REPLACE FUNCTION notificar_cambio_estado_reclamo()
RETURNS TRIGGER AS $$
DECLARE
  v_mensaje TEXT;
BEGIN
  IF NEW.estado != OLD.estado THEN
    CASE NEW.estado
      WHEN 'en_proceso' THEN
        v_mensaje := 'Tu reclamo está siendo atendido.';
      WHEN 'resuelto' THEN
        v_mensaje := 'Tu reclamo ha sido resuelto.';
      WHEN 'cerrado' THEN
        v_mensaje := 'Tu reclamo ha sido cerrado.';
      ELSE
        v_mensaje := 'El estado de tu reclamo ha cambiado.';
    END CASE;

    PERFORM crear_notificacion_cliente(
      NEW.cliente_id,
      'reclamo',
      'Actualización de Reclamo',
      v_mensaje || ' ' || NEW.titulo,
      '/portal-cliente/reclamos/' || NEW.id::text
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notificar_cambio_estado_reclamo
  AFTER UPDATE ON reclamos
  FOR EACH ROW
  EXECUTE FUNCTION notificar_cambio_estado_reclamo();

-- ========================================
-- COMENTARIOS
-- ========================================

COMMENT ON TABLE tipos_reclamos IS 'Tipos predefinidos de reclamos que pueden hacer los clientes';
COMMENT ON TABLE reclamos IS 'Reclamos y solicitudes realizadas por los clientes';
COMMENT ON TABLE comentarios_reclamos IS 'Comentarios y seguimiento de reclamos';
COMMENT ON TABLE notificaciones_clientes IS 'Notificaciones para los clientes del portal';
COMMENT ON TABLE sesiones_clientes IS 'Sesiones activas de clientes en el portal';

COMMENT ON COLUMN usuarios.codigo_pin IS 'Código PIN de 6 dígitos para autenticación en portal del cliente';
COMMENT ON COLUMN reclamos.fotos IS 'Array de URLs de fotos adjuntas al reclamo';
COMMENT ON COLUMN reclamos.estado IS 'Estado del reclamo: pendiente, en_proceso, resuelto, cerrado';
COMMENT ON COLUMN reclamos.prioridad IS 'Prioridad del reclamo: baja, media, alta, urgente';

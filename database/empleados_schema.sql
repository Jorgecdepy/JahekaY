-- ========================================
-- SISTEMA DE EMPLEADOS Y PERMISOS
-- ========================================
-- Este schema maneja empleados, roles, permisos y asignaciones

-- Tabla de roles del sistema
CREATE TABLE IF NOT EXISTS roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(50) NOT NULL UNIQUE,
  descripcion TEXT,
  permisos JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabla de empleados
CREATE TABLE IF NOT EXISTS empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(200) NOT NULL,
  email VARCHAR(200) UNIQUE NOT NULL,
  telefono VARCHAR(20),
  direccion TEXT,
  rol_id UUID REFERENCES roles(id) ON DELETE SET NULL,
  usuario_supabase_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  activo BOOLEAN DEFAULT true,
  fecha_contratacion DATE,
  salario DECIMAL(15, 2),
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tabla de asignaciones (empleado -> clientes)
CREATE TABLE IF NOT EXISTS asignaciones_empleados (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empleado_id UUID REFERENCES empleados(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  tipo_asignacion VARCHAR(50) DEFAULT 'lectura', -- lectura, cobro, mantenimiento
  zona VARCHAR(100),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  UNIQUE(empleado_id, cliente_id, tipo_asignacion)
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_empleados_rol ON empleados(rol_id);
CREATE INDEX IF NOT EXISTS idx_empleados_activo ON empleados(activo);
CREATE INDEX IF NOT EXISTS idx_empleados_email ON empleados(email);
CREATE INDEX IF NOT EXISTS idx_asignaciones_empleado ON asignaciones_empleados(empleado_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_cliente ON asignaciones_empleados(cliente_id);
CREATE INDEX IF NOT EXISTS idx_asignaciones_zona ON asignaciones_empleados(zona);

-- ========================================
-- ROLES PREDEFINIDOS
-- ========================================

INSERT INTO roles (nombre, descripcion, permisos) VALUES
('Administrador', 'Acceso completo al sistema',
  '{
    "dashboard": true,
    "clientes": {"ver": true, "crear": true, "editar": true, "eliminar": true},
    "lecturas": {"ver": true, "crear": true, "editar": true, "eliminar": true},
    "facturas": {"ver": true, "crear": true, "editar": true, "eliminar": true, "anular": true},
    "pagos": {"ver": true, "registrar": true, "anular": true},
    "caja": {"ver": true, "crear": true, "editar": true, "eliminar": true, "cerrar": true},
    "reportes": {"ver": true, "generar": true, "exportar": true},
    "configuracion": {"ver": true, "editar": true},
    "empleados": {"ver": true, "crear": true, "editar": true, "eliminar": true, "asignar": true},
    "tarifas": {"ver": true, "crear": true, "editar": true, "eliminar": true}
  }'
),
('Supervisor', 'Supervisión y gestión operativa',
  '{
    "dashboard": true,
    "clientes": {"ver": true, "crear": true, "editar": true, "eliminar": false},
    "lecturas": {"ver": true, "crear": true, "editar": true, "eliminar": false},
    "facturas": {"ver": true, "crear": true, "editar": true, "eliminar": false, "anular": false},
    "pagos": {"ver": true, "registrar": true, "anular": false},
    "caja": {"ver": true, "crear": true, "editar": false, "eliminar": false, "cerrar": true},
    "reportes": {"ver": true, "generar": true, "exportar": true},
    "configuracion": {"ver": true, "editar": false},
    "empleados": {"ver": true, "crear": false, "editar": false, "eliminar": false, "asignar": true},
    "tarifas": {"ver": true, "crear": false, "editar": false, "eliminar": false}
  }'
),
('Lectorista', 'Registro de lecturas de medidores',
  '{
    "dashboard": true,
    "clientes": {"ver": true, "crear": false, "editar": false, "eliminar": false},
    "lecturas": {"ver": true, "crear": true, "editar": true, "eliminar": false},
    "facturas": {"ver": true, "crear": false, "editar": false, "eliminar": false, "anular": false},
    "pagos": {"ver": false, "registrar": false, "anular": false},
    "caja": {"ver": false, "crear": false, "editar": false, "eliminar": false, "cerrar": false},
    "reportes": {"ver": true, "generar": false, "exportar": false},
    "configuracion": {"ver": false, "editar": false},
    "empleados": {"ver": false, "crear": false, "editar": false, "eliminar": false, "asignar": false},
    "tarifas": {"ver": true, "crear": false, "editar": false, "eliminar": false}
  }'
),
('Cajero', 'Gestión de pagos y caja',
  '{
    "dashboard": true,
    "clientes": {"ver": true, "crear": false, "editar": false, "eliminar": false},
    "lecturas": {"ver": true, "crear": false, "editar": false, "eliminar": false},
    "facturas": {"ver": true, "crear": false, "editar": false, "eliminar": false, "anular": false},
    "pagos": {"ver": true, "registrar": true, "anular": false},
    "caja": {"ver": true, "crear": true, "editar": true, "eliminar": false, "cerrar": false},
    "reportes": {"ver": true, "generar": true, "exportar": false},
    "configuracion": {"ver": false, "editar": false},
    "empleados": {"ver": false, "crear": false, "editar": false, "eliminar": false, "asignar": false},
    "tarifas": {"ver": true, "crear": false, "editar": false, "eliminar": false}
  }'
),
('Operador', 'Operaciones generales del sistema',
  '{
    "dashboard": true,
    "clientes": {"ver": true, "crear": true, "editar": true, "eliminar": false},
    "lecturas": {"ver": true, "crear": true, "editar": true, "eliminar": false},
    "facturas": {"ver": true, "crear": true, "editar": false, "eliminar": false, "anular": false},
    "pagos": {"ver": true, "registrar": true, "anular": false},
    "caja": {"ver": true, "crear": true, "editar": false, "eliminar": false, "cerrar": false},
    "reportes": {"ver": true, "generar": true, "exportar": false},
    "configuracion": {"ver": false, "editar": false},
    "empleados": {"ver": false, "crear": false, "editar": false, "eliminar": false, "asignar": false},
    "tarifas": {"ver": true, "crear": false, "editar": false, "eliminar": false}
  }'
)
ON CONFLICT (nombre) DO NOTHING;

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

-- Habilitar RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE empleados ENABLE ROW LEVEL SECURITY;
ALTER TABLE asignaciones_empleados ENABLE ROW LEVEL SECURITY;

-- Políticas para roles (solo lectura para todos los autenticados)
CREATE POLICY "Usuarios autenticados pueden ver roles"
  ON roles FOR SELECT
  TO authenticated
  USING (true);

-- Políticas para empleados
CREATE POLICY "Usuarios autenticados pueden ver empleados"
  ON empleados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear empleados"
  ON empleados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar empleados"
  ON empleados FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar empleados"
  ON empleados FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para asignaciones
CREATE POLICY "Usuarios autenticados pueden ver asignaciones"
  ON asignaciones_empleados FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear asignaciones"
  ON asignaciones_empleados FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar asignaciones"
  ON asignaciones_empleados FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar asignaciones"
  ON asignaciones_empleados FOR DELETE
  TO authenticated
  USING (true);

-- ========================================
-- TRIGGERS PARA ACTUALIZAR updated_at
-- ========================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roles_updated_at
  BEFORE UPDATE ON roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_empleados_updated_at
  BEFORE UPDATE ON empleados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_asignaciones_empleados_updated_at
  BEFORE UPDATE ON asignaciones_empleados
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista de empleados con su rol
CREATE OR REPLACE VIEW vista_empleados_roles AS
SELECT
  e.id,
  e.nombre_completo,
  e.email,
  e.telefono,
  e.direccion,
  e.activo,
  e.fecha_contratacion,
  e.salario,
  r.id as rol_id,
  r.nombre as rol_nombre,
  r.descripcion as rol_descripcion,
  r.permisos as permisos,
  (SELECT COUNT(*) FROM asignaciones_empleados WHERE empleado_id = e.id AND activo = true) as total_asignaciones,
  e.created_at,
  e.updated_at
FROM empleados e
LEFT JOIN roles r ON e.rol_id = r.id;

-- Vista de asignaciones con detalles
CREATE OR REPLACE VIEW vista_asignaciones_detalle AS
SELECT
  a.id,
  a.tipo_asignacion,
  a.zona,
  a.activo,
  e.id as empleado_id,
  e.nombre_completo as empleado_nombre,
  e.email as empleado_email,
  u.id as cliente_id,
  u.nombre_completo as cliente_nombre,
  u.numero_medidor,
  u.direccion as cliente_direccion,
  a.created_at,
  a.updated_at
FROM asignaciones_empleados a
JOIN empleados e ON a.empleado_id = e.id
JOIN usuarios u ON a.cliente_id = u.id;

-- ========================================
-- FUNCIÓN PARA OBTENER PERMISOS DE EMPLEADO
-- ========================================

CREATE OR REPLACE FUNCTION obtener_permisos_empleado(p_email VARCHAR)
RETURNS JSONB AS $$
DECLARE
  v_permisos JSONB;
BEGIN
  SELECT r.permisos INTO v_permisos
  FROM empleados e
  JOIN roles r ON e.rol_id = r.id
  WHERE e.email = p_email AND e.activo = true;

  RETURN COALESCE(v_permisos, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- FUNCIÓN PARA ASIGNAR CLIENTES A EMPLEADO
-- ========================================

CREATE OR REPLACE FUNCTION asignar_clientes_empleado(
  p_empleado_id UUID,
  p_cliente_ids UUID[],
  p_tipo_asignacion VARCHAR DEFAULT 'lectura',
  p_zona VARCHAR DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_asignados INT := 0;
  v_cliente_id UUID;
BEGIN
  -- Desactivar asignaciones anteriores del mismo tipo
  UPDATE asignaciones_empleados
  SET activo = false
  WHERE empleado_id = p_empleado_id
    AND tipo_asignacion = p_tipo_asignacion;

  -- Crear nuevas asignaciones
  FOREACH v_cliente_id IN ARRAY p_cliente_ids
  LOOP
    INSERT INTO asignaciones_empleados (
      empleado_id,
      cliente_id,
      tipo_asignacion,
      zona,
      activo
    ) VALUES (
      p_empleado_id,
      v_cliente_id,
      p_tipo_asignacion,
      p_zona,
      true
    )
    ON CONFLICT (empleado_id, cliente_id, tipo_asignacion)
    DO UPDATE SET activo = true, zona = p_zona;

    v_asignados := v_asignados + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'exito', true,
    'asignados', v_asignados,
    'mensaje', format('Se asignaron %s clientes exitosamente', v_asignados)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON TABLE roles IS 'Roles del sistema con sus permisos';
COMMENT ON TABLE empleados IS 'Empleados de la empresa con sus datos y rol asignado';
COMMENT ON TABLE asignaciones_empleados IS 'Asignaciones de clientes a empleados por zona o tipo de trabajo';

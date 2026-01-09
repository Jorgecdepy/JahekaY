-- ========================================
-- SCHEMA BASE DEL SISTEMA JAHEKAY
-- ========================================
-- Este es el schema fundamental que debe ejecutarse PRIMERO
-- Crea todas las tablas base necesarias para el sistema

-- ========================================
-- TABLA DE USUARIOS (CLIENTES)
-- ========================================

CREATE TABLE IF NOT EXISTS usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_completo VARCHAR(200) NOT NULL,
  numero_medidor VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(200),
  telefono VARCHAR(20),
  direccion TEXT,
  activo BOOLEAN DEFAULT true,
  codigo_pin VARCHAR(6), -- Para portal del cliente
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para usuarios
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_medidor ON usuarios(numero_medidor);
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_pin ON usuarios(codigo_pin);

-- ========================================
-- TABLA DE TARIFAS
-- ========================================

CREATE TABLE IF NOT EXISTS tarifas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rango_desde INT NOT NULL,
  rango_hasta INT, -- NULL significa infinito
  precio_por_m3 DECIMAL(10, 2) NOT NULL,
  cargo_fijo_mensual DECIMAL(10, 2) NOT NULL,
  fecha_inicio DATE NOT NULL,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para tarifas
CREATE INDEX IF NOT EXISTS idx_tarifas_activo ON tarifas(activo);
CREATE INDEX IF NOT EXISTS idx_tarifas_rango ON tarifas(rango_desde, rango_hasta);

-- ========================================
-- TABLA DE LECTURAS
-- ========================================

CREATE TABLE IF NOT EXISTS lecturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha_lectura DATE NOT NULL,
  lectura_anterior INT NOT NULL DEFAULT 0,
  lectura_actual INT NOT NULL,
  consumo_m3 INT NOT NULL,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para lecturas
CREATE INDEX IF NOT EXISTS idx_lecturas_cliente ON lecturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_lecturas_fecha ON lecturas(fecha_lectura DESC);

-- ========================================
-- TABLA DE FACTURAS
-- ========================================

CREATE TABLE IF NOT EXISTS facturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
  lectura_id UUID REFERENCES lecturas(id) ON DELETE SET NULL,
  numero_factura VARCHAR(50) UNIQUE,
  periodo VARCHAR(20) NOT NULL, -- Ej: "2024-01", "Enero 2024"
  fecha_emision DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  fecha_pago DATE,
  consumo_m3 INT NOT NULL,
  precio_unitario DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(12, 2) NOT NULL,
  cargo_fijo DECIMAL(10, 2) NOT NULL,
  total DECIMAL(12, 2) NOT NULL,
  estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, pagada, vencida
  metodo_pago VARCHAR(50), -- efectivo, transferencia, etc.
  notas TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índices para facturas
CREATE INDEX IF NOT EXISTS idx_facturas_cliente ON facturas(cliente_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);
CREATE INDEX IF NOT EXISTS idx_facturas_fecha_vencimiento ON facturas(fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_facturas_periodo ON facturas(periodo);

-- ========================================
-- TABLA DE CONFIGURACIÓN DEL SISTEMA
-- ========================================

CREATE TABLE IF NOT EXISTS configuracion_sistema (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clave VARCHAR(100) UNIQUE NOT NULL,
  valor TEXT,
  tipo VARCHAR(20) DEFAULT 'string', -- string, number, boolean, json
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Configuraciones iniciales
INSERT INTO configuracion_sistema (clave, valor, tipo, descripcion) VALUES
('facturacion_automatica_activa', 'false', 'boolean', 'Activar/desactivar generación automática de facturas'),
('facturacion_dia_mes', '1', 'number', 'Día del mes para generar facturas automáticamente'),
('facturacion_hora', '00:00', 'string', 'Hora del día para ejecutar facturación automática'),
('facturacion_dias_vencimiento', '15', 'number', 'Días de gracia desde emisión hasta vencimiento'),
('facturacion_notificar_admin', 'true', 'boolean', 'Enviar notificación al admin tras facturación'),
('facturacion_email_admin', '', 'string', 'Email del administrador para notificaciones')
ON CONFLICT (clave) DO NOTHING;

-- ========================================
-- TABLA DE HISTORIAL DE FACTURACIÓN AUTOMÁTICA
-- ========================================

CREATE TABLE IF NOT EXISTS historial_facturacion_automatica (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fecha_ejecucion TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
  periodo VARCHAR(20) NOT NULL,
  facturas_generadas INT DEFAULT 0,
  facturas_con_error INT DEFAULT 0,
  clientes_procesados INT DEFAULT 0,
  duracion_segundos INT,
  estado VARCHAR(20) DEFAULT 'procesando', -- procesando, completado, error, parcial
  detalles JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Índice para historial
CREATE INDEX IF NOT EXISTS idx_historial_fecha ON historial_facturacion_automatica(fecha_ejecucion DESC);

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

CREATE TRIGGER update_usuarios_updated_at
  BEFORE UPDATE ON usuarios
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tarifas_updated_at
  BEFORE UPDATE ON tarifas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lecturas_updated_at
  BEFORE UPDATE ON lecturas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_facturas_updated_at
  BEFORE UPDATE ON facturas
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_configuracion_sistema_updated_at
  BEFORE UPDATE ON configuracion_sistema
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- POLÍTICAS RLS (Row Level Security)
-- ========================================

ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE tarifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE lecturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE configuracion_sistema ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (permitir todo para usuarios autenticados)
CREATE POLICY "Usuarios autenticados pueden ver usuarios"
  ON usuarios FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden crear usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Usuarios autenticados pueden actualizar usuarios"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden eliminar usuarios"
  ON usuarios FOR DELETE
  TO authenticated
  USING (true);

-- Políticas para tarifas
CREATE POLICY "Usuarios autenticados pueden ver tarifas"
  ON tarifas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar tarifas"
  ON tarifas FOR ALL
  TO authenticated
  USING (true);

-- Políticas para lecturas
CREATE POLICY "Usuarios autenticados pueden ver lecturas"
  ON lecturas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar lecturas"
  ON lecturas FOR ALL
  TO authenticated
  USING (true);

-- Políticas para facturas
CREATE POLICY "Usuarios autenticados pueden ver facturas"
  ON facturas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden gestionar facturas"
  ON facturas FOR ALL
  TO authenticated
  USING (true);

-- Políticas para configuración
CREATE POLICY "Usuarios autenticados pueden ver configuración"
  ON configuracion_sistema FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Usuarios autenticados pueden actualizar configuración"
  ON configuracion_sistema FOR UPDATE
  TO authenticated
  USING (true);

-- ========================================
-- FUNCIONES ÚTILES
-- ========================================

-- Función para calcular total de factura
CREATE OR REPLACE FUNCTION calcular_total_factura(
  p_consumo_m3 INT,
  p_tarifa_id UUID
)
RETURNS JSONB AS $$
DECLARE
  v_tarifa tarifas%ROWTYPE;
  v_subtotal DECIMAL(12, 2);
  v_total DECIMAL(12, 2);
BEGIN
  -- Obtener tarifa
  SELECT * INTO v_tarifa
  FROM tarifas
  WHERE id = p_tarifa_id AND activo = true;

  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'error', true,
      'mensaje', 'Tarifa no encontrada o inactiva'
    );
  END IF;

  -- Calcular subtotal
  v_subtotal := p_consumo_m3 * v_tarifa.precio_por_m3;
  v_total := v_subtotal + v_tarifa.cargo_fijo_mensual;

  RETURN jsonb_build_object(
    'subtotal', v_subtotal,
    'cargo_fijo', v_tarifa.cargo_fijo_mensual,
    'total', v_total,
    'precio_unitario', v_tarifa.precio_por_m3
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- DATOS DE EJEMPLO (OPCIONAL - COMENTADO)
-- ========================================

-- Descomentar para insertar datos de prueba

/*
-- Tarifa de ejemplo
INSERT INTO tarifas (rango_desde, rango_hasta, precio_por_m3, cargo_fijo_mensual, fecha_inicio, activo)
VALUES (0, 10, 1000, 5000, '2024-01-01', true);

-- Cliente de ejemplo
INSERT INTO usuarios (nombre_completo, numero_medidor, email, telefono, direccion, codigo_pin, activo)
VALUES ('Cliente de Prueba', '001234', 'cliente@ejemplo.com', '0981123456', 'Calle Principal 123', '123456', true);
*/

-- ========================================
-- COMENTARIOS
-- ========================================

COMMENT ON TABLE usuarios IS 'Clientes del sistema de agua';
COMMENT ON TABLE tarifas IS 'Tarifas de cobro por consumo de agua';
COMMENT ON TABLE lecturas IS 'Lecturas de medidores de agua';
COMMENT ON TABLE facturas IS 'Facturas generadas para los clientes';
COMMENT ON TABLE configuracion_sistema IS 'Configuraciones globales del sistema';
COMMENT ON TABLE historial_facturacion_automatica IS 'Historial de ejecuciones de facturación automática';

COMMENT ON COLUMN usuarios.codigo_pin IS 'Código PIN de 6 dígitos para acceso al portal del cliente';
COMMENT ON COLUMN facturas.estado IS 'Estado de la factura: pendiente, pagada, vencida';

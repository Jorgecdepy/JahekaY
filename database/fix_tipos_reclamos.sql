-- ========================================
-- SCRIPT COMPLETO PARA TIPOS DE RECLAMOS
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

-- Índice
CREATE INDEX IF NOT EXISTS idx_tipos_reclamos_activo ON tipos_reclamos(activo);

-- 2. INSERTAR TIPOS DE RECLAMOS
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

-- 3. CREAR FUNCIÓN obtener_tipos_reclamos
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

-- Permisos
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO anon;
GRANT EXECUTE ON FUNCTION obtener_tipos_reclamos() TO authenticated;

-- 4. VERIFICAR QUE TODO FUNCIONA
SELECT * FROM tipos_reclamos WHERE activo = true ORDER BY nombre;

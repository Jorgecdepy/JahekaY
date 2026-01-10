-- Migración: Agregar columnas faltantes a la tabla usuarios
-- Fecha: 2026-01-10
-- Propósito: Agregar columnas necesarias para el sistema de acceso al portal

-- Agregar columna 'activo' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
    AND column_name = 'activo'
  ) THEN
    ALTER TABLE usuarios
    ADD COLUMN activo BOOLEAN DEFAULT true;

    RAISE NOTICE 'Columna activo agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna activo ya existe';
  END IF;
END $$;

-- Agregar columna 'codigo_pin' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
    AND column_name = 'codigo_pin'
  ) THEN
    ALTER TABLE usuarios
    ADD COLUMN codigo_pin VARCHAR(6);

    RAISE NOTICE 'Columna codigo_pin agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna codigo_pin ya existe';
  END IF;
END $$;

-- Agregar columna 'notas' si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
    AND column_name = 'notas'
  ) THEN
    ALTER TABLE usuarios
    ADD COLUMN notas TEXT;

    RAISE NOTICE 'Columna notas agregada exitosamente';
  ELSE
    RAISE NOTICE 'La columna notas ya existe';
  END IF;
END $$;

-- Crear índices si no existen
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);
CREATE INDEX IF NOT EXISTS idx_usuarios_codigo_pin ON usuarios(codigo_pin);

-- Actualizar todos los registros existentes para que estén activos por defecto
UPDATE usuarios SET activo = true WHERE activo IS NULL;

-- Verificar columnas de la tabla usuarios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

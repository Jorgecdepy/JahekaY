-- Migración: Agregar columna 'activo' a la tabla usuarios
-- Fecha: 2026-01-10
-- Propósito: Permitir activar/desactivar el acceso de clientes al portal

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

-- Crear índice para la columna activo si no existe
CREATE INDEX IF NOT EXISTS idx_usuarios_activo ON usuarios(activo);

-- Actualizar todos los registros existentes para que estén activos por defecto
UPDATE usuarios SET activo = true WHERE activo IS NULL;

-- Verificar columnas de la tabla usuarios
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'usuarios'
ORDER BY ordinal_position;

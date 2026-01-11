-- ========================================
-- FUNCIÓN PARA CREAR EMPLEADOS CON CREDENCIALES
-- ========================================
-- Esta función maneja la creación completa de un empleado
-- incluyendo su usuario de autenticación

CREATE OR REPLACE FUNCTION crear_empleado_con_credenciales(
  p_email VARCHAR,
  p_password VARCHAR,
  p_nombre_completo VARCHAR,
  p_telefono VARCHAR DEFAULT NULL,
  p_direccion TEXT DEFAULT NULL,
  p_rol_id UUID DEFAULT NULL,
  p_fecha_contratacion DATE DEFAULT NULL,
  p_salario DECIMAL(15, 2) DEFAULT NULL,
  p_notas TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID;
  v_empleado_id UUID;
  v_empleado JSONB;
BEGIN
  -- Validar campos requeridos
  IF p_email IS NULL OR p_password IS NULL OR p_nombre_completo IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Faltan campos requeridos: email, password, nombre_completo'
    );
  END IF;

  -- Validar longitud de contraseña
  IF LENGTH(p_password) < 6 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'La contraseña debe tener al menos 6 caracteres'
    );
  END IF;

  -- Verificar si el email ya existe
  IF EXISTS (SELECT 1 FROM empleados WHERE email = p_email) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Este email ya está registrado en el sistema'
    );
  END IF;

  -- Crear el empleado en la tabla (el usuario de auth se crea externamente)
  INSERT INTO empleados (
    nombre_completo,
    email,
    telefono,
    direccion,
    rol_id,
    fecha_contratacion,
    salario,
    notas,
    activo
  ) VALUES (
    p_nombre_completo,
    p_email,
    p_telefono,
    p_direccion,
    p_rol_id,
    p_fecha_contratacion,
    p_salario,
    p_notas,
    true
  )
  RETURNING id INTO v_empleado_id;

  -- Obtener datos completos del empleado creado
  SELECT jsonb_build_object(
    'id', e.id,
    'nombre_completo', e.nombre_completo,
    'email', e.email,
    'telefono', e.telefono,
    'direccion', e.direccion,
    'rol_id', e.rol_id,
    'rol_nombre', r.nombre,
    'fecha_contratacion', e.fecha_contratacion,
    'salario', e.salario,
    'activo', e.activo,
    'created_at', e.created_at
  ) INTO v_empleado
  FROM empleados e
  LEFT JOIN roles r ON e.rol_id = r.id
  WHERE e.id = v_empleado_id;

  RETURN jsonb_build_object(
    'success', true,
    'empleado', v_empleado,
    'message', 'Empleado creado exitosamente'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION crear_empleado_con_credenciales IS 'Crea un empleado en la base de datos. El usuario de auth debe crearse externamente.';

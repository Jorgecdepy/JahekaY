# Despliegue de Función: Crear Empleados

## Problema
Cuando intentas crear un empleado, Supabase requiere confirmación de email por defecto. Esto impide que los empleados puedan iniciar sesión inmediatamente.

## Solución
Hemos creado una Edge Function que usa el Admin API de Supabase para crear empleados sin requerir confirmación de email.

## Pasos para Desplegar

### Opción 1: Usar el Dashboard de Supabase (Más Simple)

1. **Desactivar confirmación de email (solo para desarrollo)**:
   - Ve a tu proyecto en [https://supabase.com/dashboard](https://supabase.com/dashboard)
   - Navega a **Authentication** → **Providers** → **Email**
   - Desactiva "Confirm email" (Enable email confirmations)
   - Guarda cambios

2. **Reverter el código del frontend** a usar `auth.signUp()` directamente

### Opción 2: Desplegar la Edge Function (Recomendado para Producción)

#### 1. Instalar Supabase CLI

**Linux/Mac:**
```bash
# Usando Homebrew
brew install supabase/tap/supabase

# O usando npm (como dependencia local)
npm install supabase --save-dev
```

**Windows:**
```bash
# Usando Scoop
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

#### 2. Login a Supabase

```bash
supabase login
```

#### 3. Vincular tu proyecto

```bash
supabase link --project-ref tu-project-id
```

Puedes obtener tu `project-id` desde el Dashboard de Supabase en Project Settings.

#### 4. Desplegar la función

```bash
supabase functions deploy crear-empleado
```

#### 5. Verificar que la función esté desplegada

```bash
supabase functions list
```

### Opción 3: Desplegar manualmente desde el Dashboard

1. Ve a **Edge Functions** en el Dashboard de Supabase
2. Click en **"New Function"**
3. Nombre: `crear-empleado`
4. Copia y pega el contenido de `/supabase/functions/crear-empleado/index.ts`
5. Click en **Deploy**

## Probar la Funcionalidad

Una vez desplegada la función:

1. Abre tu aplicación en `http://localhost:5173`
2. Inicia sesión como administrador
3. Ve a **Dashboard** → **Configuración**
4. Click en **"Nuevo Empleado"**
5. Completa el formulario:
   - Nombre: Juan Pérez
   - Email: juan@test.com
   - (La contraseña se genera automáticamente)
   - Rol: Selecciona un rol
6. Click en **"Crear Empleado"**
7. Deberías ver un modal con las credenciales generadas

## Solución Rápida (Sin Edge Functions)

Si no puedes desplegar Edge Functions, usa esta solución temporal:

### Modificar el código frontend:

En `src/pages/Configuracion.jsx`, reemplaza la sección de creación de empleado con:

```javascript
// Crear nuevo empleado con credenciales de acceso
const { data: authData, error: authError } = await supabase.auth.admin.signUp({
  email: formDataEmpleado.email,
  password: formDataEmpleado.password,
  email_confirm: true, // Auto-confirmar email
  user_metadata: {
    nombre_completo: formDataEmpleado.nombre_completo,
    tipo: 'empleado'
  }
})
```

**NOTA:** Esto requiere que uses la **Service Role Key** en lugar de la Anon Key, lo cual **NO es seguro en el frontend**. Solo úsalo en desarrollo.

## Verificación

Para verificar que todo funciona:

1. Crear un empleado desde la interfaz
2. Ver el modal con credenciales
3. Cerrar sesión
4. Ir a `/empleado/login`
5. Iniciar sesión con las credenciales del empleado creado
6. Deberías entrar al dashboard del empleado

## Troubleshooting

### Error: "Email not confirmed"
- **Causa:** Supabase aún requiere confirmación de email
- **Solución:** Usa la Opción 1 (desactivar confirmación) o despliega la Edge Function (Opción 2)

### Error: "Already registered"
- **Causa:** El email ya está en uso
- **Solución:** Usa un email diferente o elimina el usuario existente desde Authentication → Users

### Error: "Invalid API key"
- **Causa:** La Edge Function no está desplegada o las credenciales son incorrectas
- **Solución:** Despliega la función siguiendo los pasos de la Opción 2

### Error: "Function not found"
- **Causa:** La Edge Function no está desplegada
- **Solución:** Ejecuta `supabase functions deploy crear-empleado`

## Próximos Pasos

Una vez que la creación de empleados funcione:

1. Probar el login del empleado
2. Verificar que los permisos del rol funcionen correctamente
3. Asignar clientes al empleado
4. Probar las funcionalidades según el rol asignado

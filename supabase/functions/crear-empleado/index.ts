import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Manejar peticiones OPTIONS para CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Crear cliente de Supabase con privilegios de admin
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Obtener datos del empleado desde el body
    const {
      email,
      password,
      nombre_completo,
      telefono,
      direccion,
      rol_id,
      fecha_contratacion,
      salario,
      notas
    } = await req.json()

    // Validar campos requeridos
    if (!email || !password || !nombre_completo || !rol_id) {
      return new Response(
        JSON.stringify({
          error: 'Faltan campos requeridos: email, password, nombre_completo, rol_id'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      )
    }

    console.log('Creando usuario en Auth...', email)

    // 1. Crear usuario en Auth con Admin API (sin confirmación de email)
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Confirmar email automáticamente
      user_metadata: {
        nombre_completo,
        tipo: 'empleado'
      }
    })

    if (authError) {
      console.error('Error al crear usuario en Auth:', authError)
      throw authError
    }

    if (!authData.user) {
      throw new Error('No se pudo crear el usuario de autenticación')
    }

    console.log('Usuario creado en Auth:', authData.user.id)

    // 2. Crear registro en la tabla empleados
    const empleadoData = {
      nombre_completo,
      email,
      telefono: telefono || null,
      direccion: direccion || null,
      rol_id,
      fecha_contratacion: fecha_contratacion || null,
      salario: salario ? parseFloat(salario) : null,
      notas: notas || null,
      activo: true,
      usuario_supabase_id: authData.user.id
    }

    console.log('Insertando empleado en BD:', empleadoData)

    const { data: empleadoInsertado, error: empleadoError } = await supabaseAdmin
      .from('empleados')
      .insert([empleadoData])
      .select()
      .single()

    if (empleadoError) {
      console.error('Error al insertar empleado:', empleadoError)

      // Si falla la inserción del empleado, eliminar el usuario de Auth
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      throw empleadoError
    }

    console.log('Empleado creado exitosamente:', empleadoInsertado)

    // 3. Retornar datos del empleado creado
    return new Response(
      JSON.stringify({
        success: true,
        empleado: empleadoInsertado,
        credenciales: {
          nombre: nombre_completo,
          email,
          password
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error en crear-empleado function:', error)

    return new Response(
      JSON.stringify({
        error: error.message || 'Error al crear empleado',
        details: error.toString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

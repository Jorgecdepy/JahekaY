// ================================================================
// SUPABASE EDGE FUNCTION: Facturación Automática
// Ejecuta la generación automática de facturas mensualmente
// ================================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    // Verificar método HTTP
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Método no permitido. Usa POST.' }),
        {
          status: 405,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Crear cliente de Supabase con service role
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    console.log('Iniciando proceso de facturación automática...')

    // Verificar si debe ejecutarse la facturación
    const { data: debeEjecutar, error: errorVerificacion } = await supabaseClient
      .rpc('debe_ejecutar_facturacion_automatica')

    if (errorVerificacion) {
      throw new Error(`Error al verificar ejecución: ${errorVerificacion.message}`)
    }

    if (!debeEjecutar) {
      console.log('No es necesario ejecutar la facturación en este momento')
      return new Response(
        JSON.stringify({
          success: false,
          mensaje: 'La facturación automática no debe ejecutarse en este momento',
          razones: [
            'No es el día configurado',
            'Ya se ejecutó hoy',
            'La facturación automática está desactivada'
          ]
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        }
      )
    }

    // Ejecutar la facturación automática
    console.log('Ejecutando facturación automática...')
    const { data: resultado, error: errorFacturacion } = await supabaseClient
      .rpc('generar_facturas_automaticas')

    if (errorFacturacion) {
      throw new Error(`Error al generar facturas: ${errorFacturacion.message}`)
    }

    console.log('Facturación completada:', resultado)

    // Enviar notificación (opcional - implementar según necesidad)
    if (resultado.success) {
      const { data: configEmail } = await supabaseClient
        .from('configuracion_sistema')
        .select('valor')
        .eq('clave', 'facturacion_notificar_admin')
        .single()

      if (configEmail?.valor === 'true') {
        console.log('Notificación pendiente de implementar')
        // TODO: Implementar envío de email con resumen de facturación
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        mensaje: 'Facturación automática ejecutada exitosamente',
        resultado: resultado
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error en facturación automática:', error)

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        stack: error.stack
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})

/* ================================================================
   CÓMO USAR ESTA EDGE FUNCTION:

   1. Desplegar la función:
      supabase functions deploy facturacion-automatica

   2. Configurar un cron job en Supabase Dashboard:
      - Ve a Database > Cron Jobs (requiere pg_cron extension)
      - Crea un nuevo job:
        SELECT cron.schedule(
          'facturacion-automatica-diaria',
          '0 0 * * *',  -- Ejecutar todos los días a medianoche
          $$
          SELECT net.http_post(
            url:='https://tu-proyecto.supabase.co/functions/v1/facturacion-automatica',
            headers:='{"Content-Type": "application/json", "Authorization": "Bearer TU_ANON_KEY"}'::jsonb
          );
          $$
        );

   3. Alternativamente, usar un servicio externo de cron:
      - cron-job.org
      - EasyCron
      - GitHub Actions con schedule

      Configurar para hacer POST a:
      https://tu-proyecto.supabase.co/functions/v1/facturacion-automatica

      Headers:
      Authorization: Bearer TU_ANON_KEY
      Content-Type: application/json

   4. Para probar manualmente:
      curl -X POST https://tu-proyecto.supabase.co/functions/v1/facturacion-automatica \
        -H "Authorization: Bearer TU_ANON_KEY" \
        -H "Content-Type: application/json"
================================================================ */

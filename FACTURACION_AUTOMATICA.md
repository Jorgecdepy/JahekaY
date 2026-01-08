# 📅 Sistema de Facturación Automática - JahekaY

## 📋 Descripción

Sistema completo de facturación automática que genera facturas mensualmente en una fecha y hora configurada. El sistema:

- ✅ Genera facturas automáticamente para todos los clientes activos
- ✅ Usa las lecturas del mes actual
- ✅ Aplica las tarifas vigentes
- ✅ Registra un historial detallado de cada ejecución
- ✅ Permite configurar día y hora de facturación
- ✅ Soporta ejecución manual y automática
- ✅ Maneja errores y genera reportes

---

## 🚀 Instalación y Configuración

### Paso 1: Configurar Base de Datos

Ejecuta el script SQL en Supabase:

```bash
# En Supabase Dashboard > SQL Editor, ejecuta:
database/facturacion_automatica_schema.sql
```

Esto creará:
- Tabla `configuracion_sistema` - Configuraciones del sistema
- Tabla `historial_facturacion_automatica` - Historial de ejecuciones
- Función `generar_facturas_automaticas()` - Genera las facturas
- Función `debe_ejecutar_facturacion_automatica()` - Verifica si debe ejecutarse

### Paso 2: Configurar en la Interfaz

1. **Accede a Configuración**
   - Dashboard → Configuración (botón en sidebar)

2. **Activa la Facturación Automática**
   - ☑️ Marcar "Activar facturación automática"

3. **Configura los Parámetros**
   - **Día del mes**: Ej: Día 1 (primer día del mes)
   - **Hora**: Ej: 00:00 (medianoche)
   - **Días de vencimiento**: Ej: 15 días

4. **Guarda la Configuración**
   - Click en "Guardar Configuración"

### Paso 3: Configurar Ejecución Automática

Tienes 3 opciones para automatizar la ejecución:

#### Opción A: Supabase Edge Functions + pg_cron (Recomendado)

**1. Instalar Supabase CLI:**
```bash
npm install -g supabase
```

**2. Inicializar proyecto (si aún no lo hiciste):**
```bash
supabase init
```

**3. Desplegar la Edge Function:**
```bash
supabase functions deploy facturacion-automatica
```

**4. Configurar pg_cron en Supabase:**

Ve a Supabase Dashboard → SQL Editor y ejecuta:

```sql
-- Habilitar extensión pg_cron
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Habilitar extensión http para hacer peticiones
CREATE EXTENSION IF NOT EXISTS http;

-- Crear trabajo cron que se ejecute diariamente
SELECT cron.schedule(
  'facturacion-automatica-diaria',
  '0 0 * * *',  -- Ejecutar todos los días a medianoche UTC
  $$
  SELECT
    net.http_post(
      url := 'https://TU-PROYECTO.supabase.co/functions/v1/facturacion-automatica',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer TU_ANON_KEY'
      )
    );
  $$
);
```

**Importante:** Reemplaza:
- `TU-PROYECTO` con tu proyecto real de Supabase
- `TU_ANON_KEY` con tu clave anónima de Supabase (Dashboard → Settings → API)

**5. Verificar que el cron está activo:**
```sql
SELECT * FROM cron.job;
```

#### Opción B: GitHub Actions (Gratis)

Crea el archivo `.github/workflows/facturacion-automatica.yml`:

```yaml
name: Facturación Automática

on:
  schedule:
    # Ejecutar todos los días a las 00:00 UTC
    - cron: '0 0 * * *'
  workflow_dispatch: # Permite ejecución manual

jobs:
  facturar:
    runs-on: ubuntu-latest
    steps:
      - name: Ejecutar facturación automática
        run: |
          curl -X POST \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json" \
            https://TU-PROYECTO.supabase.co/functions/v1/facturacion-automatica
```

Configura los secrets en GitHub:
- Settings → Secrets → New repository secret
- Nombre: `SUPABASE_ANON_KEY`
- Valor: Tu clave anónima de Supabase

#### Opción C: Servicio Externo de Cron

Usa servicios como:
- [cron-job.org](https://cron-job.org) (Gratis, fácil)
- [EasyCron](https://www.easycron.com)
- [Render Cron Jobs](https://render.com/docs/cronjobs)

**Configuración:**
- **URL:** `https://TU-PROYECTO.supabase.co/functions/v1/facturacion-automatica`
- **Método:** POST
- **Headers:**
  ```
  Authorization: Bearer TU_ANON_KEY
  Content-Type: application/json
  ```
- **Frecuencia:** Diaria a las 00:00

---

## 🎯 Uso del Sistema

### Flujo Automático

1. **Preparación Mensual**
   - Asegúrate de que todos los clientes tengan lecturas del mes actual
   - Verifica que las tarifas estén actualizadas y activas

2. **Ejecución Automática**
   - El sistema ejecuta automáticamente el día configurado
   - Genera facturas para todos los clientes con lecturas
   - Registra el resultado en el historial

3. **Revisión Post-Ejecución**
   - Ve a Configuración → Historial de Facturaciones
   - Revisa facturas generadas y errores
   - Ve a Facturas para ver las facturas creadas

### Ejecución Manual

Si necesitas generar facturas manualmente:

1. Ve a **Configuración**
2. Click en **"Generar Facturas Ahora"**
3. Confirma la acción
4. Espera el resultado

**Nota:** La ejecución manual NO requiere que esté activada la facturación automática.

---

## 📊 Cómo Funciona

### Lógica de Generación

1. **Verificación Inicial**
   - ¿Está activada la facturación automática?
   - ¿Es el día configurado del mes?
   - ¿Ya se ejecutó hoy?

2. **Proceso de Facturación**
   ```
   Para cada cliente activo:
     ├─ Buscar lectura del mes actual
     ├─ Si hay lectura:
     │  ├─ Calcular consumo
     │  ├─ Aplicar tarifa vigente
     │  ├─ Generar factura pendiente
     │  └─ ✅ Éxito
     └─ Si no hay lectura:
        └─ ⚠️ Registrar error "sin lectura"
   ```

3. **Cálculo de Monto**
   ```
   Total = Cargo Fijo + (Consumo m³ × Precio por m³)
   ```

4. **Fechas**
   - **Emisión:** Fecha actual
   - **Vencimiento:** Emisión + días configurados

### Estados del Historial

- **✅ Completado:** Todas las facturas generadas sin errores
- **⚠️ Parcial:** Algunas facturas con error (ej: sin lectura)
- **❌ Error:** No se pudo generar ninguna factura
- **🔄 Procesando:** Ejecución en curso

---

## 🔧 Configuraciones Disponibles

| Configuración | Tipo | Descripción | Ejemplo |
|--------------|------|-------------|---------|
| `facturacion_automatica_activa` | Boolean | Activa/desactiva facturación automática | `true` |
| `facturacion_dia_mes` | Number | Día del mes (1-31) | `1` |
| `facturacion_hora` | String | Hora de ejecución (HH:mm) | `00:00` |
| `facturacion_dias_vencimiento` | Number | Días para vencimiento | `15` |
| `facturacion_notificar_admin` | Boolean | Enviar notificación | `true` |
| `facturacion_email_admin` | String | Email del admin | `admin@ejemplo.com` |

---

## 🐛 Solución de Problemas

### No se están generando facturas automáticamente

**Diagnóstico:**
```sql
-- Ver configuración actual
SELECT * FROM configuracion_sistema WHERE categoria = 'facturacion';

-- Ver último historial
SELECT * FROM historial_facturacion_automatica ORDER BY fecha_ejecucion DESC LIMIT 5;

-- Verificar si debe ejecutarse
SELECT debe_ejecutar_facturacion_automatica();
```

**Soluciones:**
1. ✅ Verifica que `facturacion_automatica_activa` = 'true'
2. ✅ Verifica que el cron job esté configurado
3. ✅ Revisa los logs de la Edge Function en Supabase
4. ✅ Ejecuta manualmente para ver errores específicos

### Facturas con errores "sin lectura"

**Causa:** Clientes sin lectura del mes actual

**Solución:**
1. Ve a Lecturas
2. Registra las lecturas faltantes del mes
3. Ejecuta manualmente la facturación de nuevo

### Tarifas incorrectas

**Diagnóstico:**
```sql
-- Ver tarifa activa
SELECT * FROM tarifas WHERE activo = true ORDER BY fecha_inicio DESC LIMIT 1;
```

**Solución:**
1. Ve a Tarifas
2. Verifica que haya una tarifa activa
3. Ajusta precios si es necesario

### Error de permisos (RLS)

**Diagnóstico:**
```sql
-- Verificar políticas RLS
SELECT * FROM pg_policies WHERE tablename IN ('configuracion_sistema', 'historial_facturacion_automatica');
```

**Solución:**
- Las Edge Functions usan `service_role` que bypasea RLS
- Para usuarios normales, las políticas ya están configuradas

---

## 📈 Monitoreo y Reportes

### Ver Historial de Facturaciones

**En la Interfaz:**
- Configuración → Historial de Facturaciones

**En SQL:**
```sql
SELECT
  fecha_ejecucion,
  periodo,
  facturas_generadas,
  facturas_con_error,
  clientes_procesados,
  estado,
  duracion_segundos
FROM historial_facturacion_automatica
ORDER BY fecha_ejecucion DESC
LIMIT 10;
```

### Ver Detalles de Una Ejecución

```sql
SELECT
  detalles
FROM historial_facturacion_automatica
WHERE id = 'TU_HISTORIAL_ID';
```

El campo `detalles` es un JSON con información de cada cliente procesado.

### Estadísticas Generales

```sql
-- Total de facturas generadas automáticamente
SELECT
  COUNT(*) as total_ejecuciones,
  SUM(facturas_generadas) as total_facturas,
  SUM(facturas_con_error) as total_errores,
  AVG(duracion_segundos) as duracion_promedio
FROM historial_facturacion_automatica
WHERE estado IN ('completado', 'parcial');
```

---

## 🔒 Seguridad

### Consideraciones de Seguridad

1. **API Keys**
   - Usa `SUPABASE_ANON_KEY` para llamadas externas
   - Nunca expongas `SUPABASE_SERVICE_ROLE_KEY` públicamente
   - Guarda keys en variables de entorno o secrets

2. **Row Level Security (RLS)**
   - Las tablas tienen RLS habilitado
   - Solo usuarios autenticados pueden ver/modificar

3. **Validaciones**
   - La función SQL valida que haya tarifa activa
   - Verifica que los clientes estén activos
   - No permite facturación duplicada del mismo día

---

## 🎓 Mejoras Futuras Sugeridas

1. **Notificaciones**
   - Enviar email al admin después de facturar
   - Notificar clientes por email/SMS
   - Webhooks a sistemas externos

2. **Reportes Avanzados**
   - Dashboard con gráficos de facturación
   - Exportar historial a Excel/PDF
   - Análisis de tendencias

3. **Configuraciones Adicionales**
   - Facturación por zonas
   - Horarios diferentes por cliente
   - Períodos de gracia personalizados

4. **Integración con Caja**
   - Registrar automáticamente pagos en caja
   - Generar recordatorios de vencimiento

---

## ✅ Checklist de Verificación

Antes de activar la facturación automática, verifica:

- [ ] Script SQL `facturacion_automatica_schema.sql` ejecutado
- [ ] Tablas creadas correctamente
- [ ] Funciones SQL disponibles
- [ ] Página de Configuración accesible
- [ ] Hay tarifas activas configuradas
- [ ] Clientes tienen lecturas del mes
- [ ] Edge Function desplegada (si usas Supabase)
- [ ] Cron job configurado
- [ ] Configuración guardada en la interfaz
- [ ] Ejecución manual probada exitosamente

---

## 📞 Soporte

### Logs de Depuración

**Ver logs de Edge Function:**
1. Supabase Dashboard → Functions
2. Click en `facturacion-automatica`
3. Pestaña "Logs"

**Probar Edge Function manualmente:**
```bash
curl -X POST \
  -H "Authorization: Bearer TU_ANON_KEY" \
  -H "Content-Type: application/json" \
  https://TU-PROYECTO.supabase.co/functions/v1/facturacion-automatica
```

### Consultas SQL Útiles

```sql
-- Limpiar historial viejo (opcional)
DELETE FROM historial_facturacion_automatica
WHERE fecha_ejecucion < NOW() - INTERVAL '3 months';

-- Simular ejecución sin generar facturas (testing)
SELECT debe_ejecutar_facturacion_automatica();

-- Ver configuración actual
SELECT * FROM configuracion_sistema WHERE categoria = 'facturacion';
```

---

**¡Sistema de Facturación Automática listo! 🎉**

Ahora tu sistema generará facturas automáticamente cada mes sin intervención manual.

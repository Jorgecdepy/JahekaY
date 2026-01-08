# 📦 Sistema de Caja Diaria - Instrucciones de Instalación

## 📋 Descripción

Se ha implementado un sistema completo de gestión de caja diaria que permite:

- ✅ Registrar ingresos y gastos de manera fácil e intuitiva
- ✅ Clasificar transacciones por categorías
- ✅ Generar arqueos automáticos diarios
- ✅ Descargar informes en formato PDF
- ✅ Integración con el sistema de facturas existente

---

## 🚀 Pasos de Instalación

### 1. Configurar Base de Datos en Supabase

#### Opción A: Usando el Editor SQL de Supabase (Recomendado)

1. Accede a tu proyecto en [Supabase](https://supabase.com)
2. Ve a la sección **SQL Editor** en el menú lateral
3. Crea una nueva consulta
4. Copia y pega el contenido completo del archivo `database/caja_diaria_schema.sql`
5. Haz clic en **Run** para ejecutar el script

#### Opción B: Usando la Terminal con psql

```bash
# Conectarse a tu base de datos Supabase
psql postgresql://usuario:password@tu-proyecto.supabase.co:5432/postgres

# Ejecutar el script
\i database/caja_diaria_schema.sql
```

### 2. Verificar las Tablas Creadas

Después de ejecutar el script, verifica que se hayan creado las siguientes tablas:

- `categorias_transaccion` - Categorías de ingresos y gastos
- `caja_diaria` - Estado diario de la caja
- `transacciones_caja` - Detalle de transacciones

Puedes verificarlas en Supabase:
- Ve a **Table Editor**
- Deberías ver las 3 nuevas tablas listadas

### 3. Verificar Datos Iniciales

El script automáticamente crea categorías predeterminadas:

**Ingresos:**
- Pago de Factura
- Reconexión
- Multas
- Otros Ingresos

**Gastos:**
- Mantenimiento
- Materiales
- Servicios
- Salarios
- Administrativos
- Otros Gastos

### 4. Configurar Arqueo Automático (Opcional pero Recomendado)

Para que el sistema cierre automáticamente la caja del día anterior y abra una nueva cada día:

#### Opción A: Usando Supabase Edge Functions (Recomendado)

1. Instala Supabase CLI si no lo tienes:
```bash
npm install -g supabase
```

2. Crea una Edge Function:
```bash
supabase functions new arqueo-automatico
```

3. Copia este código en `supabase/functions/arqueo-automatico/index.ts`:

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Llamar a la función de arqueo automático
    const { error } = await supabaseClient.rpc('generar_arqueo_automatico')

    if (error) throw error

    return new Response(
      JSON.stringify({ message: 'Arqueo ejecutado exitosamente' }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
```

4. Despliega la función:
```bash
supabase functions deploy arqueo-automatico
```

5. Configura un cron job en Supabase Dashboard:
   - Ve a **Database** > **Cron Jobs**
   - Crea un nuevo job que ejecute la función cada día a las 00:00

#### Opción B: Usando un Servicio Externo (alternativa)

Puedes usar servicios como [cron-job.org](https://cron-job.org) o [EasyCron](https://www.easycron.com) para hacer llamadas HTTP a tu función edge.

---

## 🎨 Características Implementadas

### Interfaz de Usuario

1. **Página Principal de Caja Diaria**
   - Resumen visual de caja (Monto inicial, Ingresos, Gastos, Monto final)
   - Botones rápidos para agregar Ingresos/Gastos
   - Listado de transacciones del día
   - Búsqueda y filtros

2. **Formulario de Transacción**
   - Formulario intuitivo y rápido
   - Autocompletado al seleccionar factura pendiente
   - Selección de categoría
   - Múltiples métodos de pago
   - Validaciones en tiempo real

3. **Generación de PDF**
   - Descarga de arqueo diario en PDF
   - Formato profesional con detalles de todas las transacciones
   - Separación clara entre ingresos y gastos

4. **Integración con Facturas**
   - Al registrar un pago de factura, automáticamente:
     - Se marca la factura como pagada
     - Se registra la fecha de pago
     - Se autocompleta la descripción y monto

### Base de Datos

1. **Triggers Automáticos**
   - Los totales de caja se actualizan automáticamente
   - No necesitas calcular manualmente

2. **Validaciones a Nivel BD**
   - Estados válidos (abierta/cerrada)
   - Tipos válidos (ingreso/gasto)
   - Montos positivos

3. **Relaciones**
   - Transacciones vinculadas a clientes
   - Transacciones vinculadas a facturas
   - Categorías asignables

---

## 📱 Uso del Sistema

### Flujo Diario Típico

1. **Al inicio del día:**
   - El sistema automáticamente abre una nueva caja
   - El monto inicial es el monto final del día anterior

2. **Durante el día:**
   - Registra ingresos (pagos de clientes, otros ingresos)
   - Registra gastos (compras, servicios, salarios)
   - Todas las transacciones quedan registradas con fecha/hora

3. **Al final del día:**
   - Haz clic en "Cerrar Caja"
   - Descarga el arqueo en PDF para archivo
   - La caja queda cerrada (no se pueden agregar más transacciones)

4. **Al día siguiente:**
   - Nueva caja se abre automáticamente
   - El ciclo se repite

### Navegación

- **Desde el Dashboard:** Haz clic en la card "Caja Diaria"
- **Desde el Sidebar:** Haz clic en "Caja Diaria" (nuevo botón agregado)

---

## 🔧 Personalización

### Agregar Nuevas Categorías

1. Ve a Supabase Table Editor
2. Abre la tabla `categorias_transaccion`
3. Inserta nuevas filas con:
   - `nombre`: Nombre de la categoría
   - `tipo`: 'ingreso' o 'gasto'
   - `color`: Color en formato hex (ej: #3b82f6)
   - `activo`: true

### Modificar Hora de Arqueo Automático

Si configuraste edge functions con cron:
1. Ve a Supabase Dashboard > Database > Cron Jobs
2. Edita el horario del job de arqueo
3. Guarda los cambios

---

## 🐛 Solución de Problemas

### La caja no se abre automáticamente

**Solución:** Ejecuta manualmente la función:
```sql
SELECT generar_arqueo_automatico();
```

### No se actualizan los totales

**Solución:** Verifica que los triggers estén creados:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'trigger_actualizar_totales_caja';
```

### Error al generar PDF

**Solución:** Verifica que jsPDF esté instalado:
```bash
npm install jspdf
```

### No aparecen las categorías

**Solución:** Verifica los datos iniciales:
```sql
SELECT * FROM categorias_transaccion WHERE activo = true;
```

---

## 📊 Estructura de Archivos Creados

```
JahekaY/
├── database/
│   └── caja_diaria_schema.sql          # Schema SQL completo
├── src/
│   ├── pages/
│   │   ├── CajaDiaria.jsx              # Página principal
│   │   ├── CajaDiaria.css              # Estilos de la página
│   │   └── Dashboard.jsx               # Actualizado con navegación
│   └── components/
│       ├── FormularioTransaccion.jsx   # Formulario de ingresos/gastos
│       └── FormularioTransaccion.css   # Estilos del formulario
├── INSTRUCCIONES_CAJA_DIARIA.md        # Este archivo
└── package.json                         # Actualizado con jsPDF
```

---

## ✅ Checklist de Verificación

Antes de usar el sistema, verifica:

- [ ] Script SQL ejecutado en Supabase
- [ ] Tablas creadas correctamente
- [ ] Categorías iniciales cargadas
- [ ] jsPDF instalado (`npm install jspdf`)
- [ ] Aplicación reiniciada (`npm run dev`)
- [ ] Navegación visible en Dashboard
- [ ] Página de Caja Diaria accesible
- [ ] Formulario de transacción funcional
- [ ] Generación de PDF operativa
- [ ] (Opcional) Arqueo automático configurado

---

## 🎯 Próximos Pasos Recomendados

1. **Personalizar categorías** según tus necesidades específicas
2. **Configurar arqueo automático** para evitar operación manual
3. **Agregar usuarios adicionales** con permisos específicos
4. **Implementar respaldos** de la base de datos
5. **Configurar notificaciones** cuando la caja alcance ciertos montos

---

## 📞 Soporte

Si encuentras algún problema:
1. Revisa la consola del navegador (F12) para ver errores
2. Verifica los logs de Supabase
3. Asegúrate de que las políticas RLS estén correctamente configuradas

---

**¡Sistema de Caja Diaria instalado correctamente! 🎉**

El sistema está listo para gestionar todas tus transacciones diarias de manera profesional y organizada.

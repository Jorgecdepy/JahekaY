# 📊 Panel de Reportes - Sistema JahekaY

## 📋 Descripción

Panel completo de generación de reportes con múltiples tipos de informes, filtros personalizables y exportación a PDF. Permite analizar todos los aspectos del sistema: ingresos, facturas, consumo, caja y más.

---

## 🎯 Tipos de Reportes Disponibles

### 1. 💰 Ingresos Mensuales
**Descripción:** Reporte detallado de todos los ingresos del período seleccionado.

**Incluye:**
- Total de ingresos del período
- Cantidad de facturas pagadas
- Promedio por factura
- Listado detallado de cada pago con cliente y fecha

**Ideal para:**
- Analizar ingresos de un mes específico
- Comparar períodos
- Revisar facturas cobradas

---

### 2. 📊 Ingresos Anuales
**Descripción:** Resumen consolidado de ingresos por año, desglosado por mes.

**Incluye:**
- Total anual de ingresos
- Promedio mensual
- Ingresos por cada mes del año
- Cantidad de facturas por mes

**Ideal para:**
- Análisis anual de rendimiento
- Identificar meses con mayores ingresos
- Planificación financiera

---

### 3. 📄 Facturas por Estado
**Descripción:** Análisis completo de facturas según su estado actual.

**Incluye:**
- Facturas pagadas (cantidad y monto total)
- Facturas pendientes (cantidad y monto total)
- Facturas vencidas (cantidad y monto total)
- Detalle de facturas en cada estado

**Ideal para:**
- Gestión de cobros
- Identificar facturas pendientes
- Análisis de morosidad

---

### 4. ⚠️ Clientes Morosos
**Descripción:** Listado de clientes con facturas vencidas y deudas pendientes.

**Incluye:**
- Cantidad de clientes con deudas
- Total adeudado general
- Deuda por cliente con detalles
- Información de contacto de cada cliente

**Ideal para:**
- Gestión de cobros
- Identificar clientes a contactar
- Análisis de cartera vencida

---

### 5. 💧 Consumo de Agua
**Descripción:** Análisis estadístico del consumo de agua por clientes.

**Incluye:**
- Consumo total del período (m³)
- Promedio de consumo
- Consumo máximo y mínimo
- Listado de consumos por cliente

**Ideal para:**
- Identificar consumos anómalos
- Análisis de patrones de consumo
- Detección de fugas

---

### 6. 💵 Movimientos de Caja
**Descripción:** Reporte completo de ingresos y gastos de caja diaria.

**Incluye:**
- Total de ingresos del período
- Total de gastos del período
- Balance (ingresos - gastos)
- Detalle de cada transacción

**Ideal para:**
- Análisis de flujo de efectivo
- Control de gastos
- Reconciliación de caja

---

### 7. 📖 Lecturas del Período
**Descripción:** Registro completo de lecturas realizadas en el rango de fechas.

**Incluye:**
- Total de lecturas realizadas
- Detalle de cada lectura
- Consumo por cliente
- Fechas de lectura

**Ideal para:**
- Verificar lecturas realizadas
- Auditoría de consumos
- Control de operaciones

---

## 🚀 Cómo Usar el Panel de Reportes

### Paso 1: Acceder al Panel

**Opción A:** Desde el Sidebar
- Click en "Reportes" en el menú lateral

**Opción B:** Desde el Dashboard
- Click en la tarjeta "Reportes" en Acciones Rápidas

### Paso 2: Seleccionar Tipo de Reporte

1. En la sección "Selecciona el Tipo de Reporte"
2. Click en la tarjeta del reporte que deseas generar
3. La tarjeta seleccionada se destacará con color

### Paso 3: Configurar Filtros

1. **Fecha Desde:** Selecciona la fecha de inicio del período
2. **Fecha Hasta:** Selecciona la fecha final del período

**Nota:** Por defecto viene configurado:
- Desde: Primer día del mes actual
- Hasta: Día actual

### Paso 4: Generar Reporte

1. Click en el botón "Generar Reporte"
2. Espera mientras se procesa (verás un spinner)
3. El reporte se mostrará en pantalla

### Paso 5: Visualizar Resultados

Una vez generado, verás:
- **Título del reporte:** Tipo de reporte seleccionado
- **Período:** Rango de fechas seleccionado
- **Resumen Visual:** Estadísticas principales en tarjetas
- **Botón "Descargar PDF":** Para exportar

### Paso 6: Exportar a PDF

1. Revisa los datos en la vista previa
2. Click en "Descargar PDF"
3. El archivo se descargará automáticamente
4. El PDF incluirá:
   - Encabezado del sistema
   - Título y período
   - Resumen ejecutivo
   - Datos detallados
   - Fecha y hora de generación

---

## 📊 Vista Previa de Estadísticas

Cada tipo de reporte muestra estadísticas específicas:

### Ingresos Mensuales
```
┌─────────────────────────────┐
│ Total Ingresos    │ ₲ 5,000,000 │
│ Facturas Pagadas  │      42      │
│ Promedio          │ ₲ 119,048    │
└─────────────────────────────┘
```

### Ingresos Anuales
```
┌─────────────────────────────┐
│ Total Anual       │ ₲ 60,000,000 │
│ Promedio Mensual  │ ₲ 5,000,000  │
│ Total Facturas    │     500      │
└─────────────────────────────┘
```

### Facturas por Estado
```
┌─────────────────────────────────────┐
│ Pagadas      │  320  │ ₲ 45,000,000 │
│ Pendientes   │   80  │ ₲ 12,000,000 │
│ Vencidas     │   25  │ ₲ 3,500,000  │
└─────────────────────────────────────┘
```

### Clientes Morosos
```
┌─────────────────────────────┐
│ Clientes con Deuda │   25    │
│ Total Adeudado     │ ₲ 3,500,000 │
│ Facturas Vencidas  │   45    │
└─────────────────────────────┘
```

### Consumo de Agua
```
┌─────────────────────────────┐
│ Consumo Total │  1,250 m³   │
│ Promedio      │    15 m³    │
│ Máximo        │    85 m³    │
│ Mínimo        │     2 m³    │
└─────────────────────────────┘
```

### Movimientos de Caja
```
┌─────────────────────────────┐
│ Ingresos     │ ₲ 5,000,000  │
│ Gastos       │ ₲ 1,200,000  │
│ Balance      │ ₲ 3,800,000  │
└─────────────────────────────┘
```

---

## 💡 Casos de Uso Recomendados

### Fin de Mes
1. **Generar "Ingresos Mensuales"** para ver ingresos del mes
2. **Generar "Movimientos de Caja"** para revisar flujo de efectivo
3. **Generar "Facturas por Estado"** para revisar pendientes

### Análisis de Morosidad
1. **Generar "Clientes Morosos"** para identificar deudas
2. **Generar "Facturas por Estado"** para ver vencidas
3. Usar información para gestión de cobros

### Auditoría Mensual
1. **Generar "Lecturas del Período"** para verificar registros
2. **Generar "Consumo de Agua"** para detectar anomalías
3. **Generar "Ingresos Mensuales"** para verificar cobros

### Planificación Anual
1. **Generar "Ingresos Anuales"** para ver tendencias
2. Identificar meses con mejores resultados
3. Planificar estrategias para meses bajos

---

## 🎨 Características de la Interfaz

### Selector de Reportes
- ✅ Cards visuales con iconos grandes
- ✅ Descripción de cada tipo
- ✅ Selección clara con resaltado
- ✅ Responsive en todos los dispositivos

### Filtros
- ✅ Selectores de fecha intuitivos
- ✅ Valores predeterminados inteligentes
- ✅ Validación automática

### Vista Previa
- ✅ Estadísticas en tarjetas coloridas
- ✅ Valores destacados según contexto
- ✅ Animaciones suaves al cargar
- ✅ Diseño profesional

### Exportación PDF
- ✅ Formato profesional con encabezado
- ✅ Resumen ejecutivo completo
- ✅ Datos detallados organizados
- ✅ Footer con fecha de generación
- ✅ Paginación automática

---

## 🔧 Personalización de Reportes

### Modificar Rango de Fechas

Para reportes específicos:

**Últimos 7 días:**
- Desde: Hace 7 días
- Hasta: Hoy

**Mes anterior:**
- Desde: Primer día del mes pasado
- Hasta: Último día del mes pasado

**Trimestre:**
- Desde: Hace 3 meses
- Hasta: Hoy

**Personalizado:**
- Selecciona cualquier rango según necesites

### Filtros por Tipo de Reporte

Algunos reportes tienen filtros automáticos:

**Ingresos Mensuales:**
- Solo facturas pagadas
- Filtradas por fecha de pago

**Clientes Morosos:**
- Solo facturas vencidas
- Ordenadas por antigüedad

**Consumo de Agua:**
- Ordenado por mayor consumo
- Ideal para identificar anomalías

---

## 📈 Interpretación de Resultados

### Valores en Verde (Positivos)
- Ingresos altos
- Facturas pagadas
- Balance positivo

### Valores en Rojo (Atención)
- Gastos altos
- Facturas vencidas
- Clientes morosos
- Balance negativo

### Valores en Amarillo (Advertencia)
- Facturas pendientes
- Situaciones que requieren seguimiento

---

## 🐛 Solución de Problemas

### No se generan datos

**Problema:** El reporte está vacío o muestra ceros.

**Soluciones:**
1. Verifica que el rango de fechas sea correcto
2. Asegúrate de que haya datos en ese período
3. Revisa que las facturas estén en el estado correcto

### Error al generar PDF

**Problema:** El PDF no se descarga.

**Soluciones:**
1. Verifica que los datos se hayan cargado correctamente
2. Revisa la consola del navegador (F12) por errores
3. Intenta con un rango de fechas más corto

### Datos inconsistentes

**Problema:** Los números no coinciden con lo esperado.

**Soluciones:**
1. Verifica el rango de fechas seleccionado
2. Revisa que las facturas tengan las fechas correctas
3. Confirma que los estados de facturas sean correctos

---

## 💾 Almacenamiento de Reportes

### PDFs Descargados

Los PDFs se descargan con nombre:
```
reporte_[tipo]_[timestamp].pdf
```

Ejemplo:
```
reporte_ingresos_mensuales_1704067200000.pdf
```

**Recomendaciones:**
- Organiza por carpetas mensuales
- Renombra con formato: `YYYY-MM-TipoReporte.pdf`
- Mantén respaldos en la nube

---

## ✅ Checklist de Uso Mensual

Para un control efectivo, genera estos reportes cada mes:

- [ ] **Ingresos Mensuales** (primeros días del mes)
- [ ] **Movimientos de Caja** (para conciliar)
- [ ] **Facturas por Estado** (para gestión de cobros)
- [ ] **Clientes Morosos** (si hay vencidas)
- [ ] **Consumo de Agua** (para análisis de patrones)
- [ ] **Lecturas del Período** (para auditoría)

---

## 🎯 Mejores Prácticas

1. **Genera reportes regularmente**
   - Al menos una vez al mes
   - Guarda los PDFs para histórico

2. **Usa rangos de fechas consistentes**
   - Del 1 al último día del mes
   - Facilita la comparación

3. **Analiza tendencias**
   - Compara meses anteriores
   - Identifica patrones

4. **Actúa sobre los datos**
   - Usa "Clientes Morosos" para cobros
   - Usa "Consumo" para detectar problemas

5. **Archiva los reportes**
   - Mantén histórico organizado
   - Útil para auditorías

---

## 📞 Notas Adicionales

### Rendimiento

Los reportes pueden tardar según la cantidad de datos:
- **Pocos datos (< 100 registros):** 1-2 segundos
- **Datos medios (100-500):** 2-5 segundos
- **Muchos datos (> 500):** 5-10 segundos

Si el reporte tarda mucho:
- Reduce el rango de fechas
- Genera reportes por períodos más cortos

### Precisión de Datos

Los reportes se generan en tiempo real desde la base de datos:
- ✅ Siempre actualizados
- ✅ Reflejan el estado actual
- ✅ No hay cache

---

**¡Sistema de Reportes listo para usar! 📊✨**

Genera informes profesionales y toma decisiones basadas en datos.

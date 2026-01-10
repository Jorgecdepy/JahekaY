# Sistema de Gestión de Reclamos - Tablero Kanban

## Descripción

Sistema completo de gestión de reclamos con interfaz Kanban (arrastrar y soltar) para administradores. Los reclamos se organizan en 4 columnas según su estado:

1. **Pendiente** ⏳ - Reclamos recién creados
2. **Asignado** 👤 - Reclamos asignados a un empleado
3. **Atendiendo** 🔧 - Reclamos en proceso de resolución
4. **Solucionado** ✅ - Reclamos completados

## Instalación

### 1. Ejecutar Scripts SQL

Debes ejecutar los siguientes scripts en **Supabase SQL Editor** en este orden:

#### Script 1: Sistema base de reclamos (si no existe)
```sql
-- Ejecutar: database/fix_tipos_reclamos.sql
```
Este script crea:
- Tabla `tipos_reclamos`
- Tabla `reclamos`
- Tabla `comentarios_reclamos`
- Funciones RPC para portal del cliente

#### Script 2: Funciones de gestión admin
```sql
-- Ejecutar: database/gestion_reclamos_admin.sql
```
Este script crea:
- `obtener_reclamos_admin()` - Obtiene todos los reclamos con información completa
- `actualizar_estado_reclamo()` - Actualiza el estado de un reclamo
- `asignar_reclamo()` - Asigna un reclamo a un empleado
- `agregar_comentario_admin()` - Agrega comentarios como administrador
- `obtener_comentarios_admin()` - Obtiene todos los comentarios de un reclamo

### 2. Dependencias de Frontend

Las dependencias ya están instaladas en el proyecto:
```bash
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

## Estructura de Archivos

```
src/pages/
├── Reclamos.jsx          # Componente principal con tablero Kanban
└── Reclamos.css          # Estilos del tablero

database/
├── fix_tipos_reclamos.sql           # Script base (cliente)
└── gestion_reclamos_admin.sql       # Script admin (nuevo)
```

## Uso

### Acceso al Sistema

1. Inicia sesión como administrador o empleado con permisos de 'reclamos'
2. En el menú lateral, haz clic en "Reclamos"
3. Verás el tablero Kanban con 4 columnas

### Gestión de Reclamos

#### Cambiar Estado (Drag & Drop)
1. Haz clic y mantén presionado sobre una tarjeta de reclamo
2. Arrastra la tarjeta a la columna del nuevo estado
3. Suelta para actualizar el estado automáticamente

#### Filtros
- **Por Tipo**: Filtra por tipo de reclamo (Falta de Agua, Tubería Rota, etc.)
- **Por Prioridad**: Filtra por urgente, alta, media o baja

#### Información en las Tarjetas
- Tipo de reclamo con emoji
- Badge de prioridad (color coded)
- Título y descripción
- Cliente y ubicación
- Empleado asignado (si existe)
- Fecha de creación
- Número de comentarios

### Estados del Reclamo

| Estado | Descripción | Color |
|--------|-------------|-------|
| `pendiente` | Reclamo recién creado, esperando asignación | Naranja |
| `asignado` | Reclamo asignado a un empleado | Azul |
| `en_proceso` | Reclamo siendo atendido activamente | Morado |
| `resuelto` | Reclamo completado y cerrado | Verde |

## Permisos

Para acceder al módulo de reclamos, el empleado debe tener:
- Módulo: `reclamos`
- Permisos en la tabla `empleados` o rol con acceso

## Base de Datos

### Tabla: reclamos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| id | UUID | ID único |
| cliente_id | UUID | Cliente que creó el reclamo |
| tipo_reclamo_id | UUID | Tipo de reclamo |
| titulo | VARCHAR | Título del reclamo |
| descripcion | TEXT | Descripción detallada |
| estado | VARCHAR | Estado actual (pendiente, asignado, en_proceso, resuelto) |
| prioridad | VARCHAR | Prioridad (urgente, alta, media, baja) |
| ubicacion | TEXT | Ubicación del problema |
| fotos | JSONB | URLs de fotos adjuntas |
| asignado_a | UUID | ID del empleado asignado |
| fecha_resolucion | TIMESTAMP | Fecha de resolución |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Última actualización |

## Tecnologías Utilizadas

- **React 19** - Framework frontend
- **@dnd-kit** - Librería de drag and drop
- **Supabase** - Backend y base de datos PostgreSQL
- **CSS Variables** - Estilos consistentes con el sistema

## Características

✅ Drag & Drop intuitivo entre columnas
✅ Actualización optimista del UI
✅ Filtros por tipo y prioridad
✅ Diseño responsive (móvil y desktop)
✅ Badges de prioridad con colores
✅ Iconos por tipo de reclamo
✅ Contador de comentarios
✅ Información del empleado asignado

## Responsive

El tablero se adapta automáticamente:
- **Desktop (>1400px)**: 4 columnas
- **Tablet (768px-1400px)**: 2 columnas
- **Móvil (<768px)**: 1 columna

## Próximas Mejoras (Opcional)

- [ ] Modal de detalle del reclamo
- [ ] Asignación de empleados desde el tablero
- [ ] Filtro por rango de fechas
- [ ] Notificaciones push cuando cambia el estado
- [ ] Historial de cambios de estado
- [ ] Exportar reporte de reclamos

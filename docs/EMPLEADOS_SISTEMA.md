# 👥 Sistema de Gestión de Empleados - JahekaY

Sistema completo de administración de empleados con roles, permisos y asignaciones integrado en el panel de Configuración.

## 📋 Contenido

- [Instalación](#instalación)
- [Roles Predefinidos](#roles-predefinidos)
- [Gestión de Empleados](#gestión-de-empleados)
- [Asignaciones de Clientes](#asignaciones-de-clientes)
- [Permisos por Rol](#permisos-por-rol)
- [Uso del Sistema](#uso-del-sistema)

---

## 🚀 Instalación

### 1. Ejecutar Schema SQL en Supabase

Ejecuta el archivo `database/empleados_schema.sql` en tu base de datos Supabase:

```bash
# Opción 1: Desde el SQL Editor de Supabase
# - Ir a SQL Editor en Supabase Dashboard
# - Copiar y pegar el contenido de empleados_schema.sql
# - Ejecutar

# Opción 2: Desde CLI de Supabase (si tienes instalado)
supabase db push
```

### 2. Verificar Tablas Creadas

El schema crea las siguientes tablas:

- ✅ `roles` - Roles del sistema con permisos
- ✅ `empleados` - Información de empleados
- ✅ `asignaciones_empleados` - Asignación de clientes a empleados
- ✅ `vista_empleados_roles` - Vista combinada
- ✅ `vista_asignaciones_detalle` - Vista de asignaciones

### 3. Roles Iniciales

El sistema crea automáticamente 5 roles predefinidos:

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| **Administrador** | Acceso completo al sistema | Total |
| **Supervisor** | Supervisión y gestión operativa | Alto |
| **Lectorista** | Registro de lecturas de medidores | Medio |
| **Cajero** | Gestión de pagos y caja | Medio |
| **Operador** | Operaciones generales del sistema | Básico |

---

## 🎭 Roles Predefinidos

### 1. **Administrador**
- **Acceso Completo** al sistema
- Puede crear, editar y eliminar todo
- Gestiona empleados y asignaciones
- Accede a configuración del sistema
- Puede anular facturas y pagos

### 2. **Supervisor**
- **Supervisión Operativa**
- Puede ver y gestionar la operación
- Asignar clientes a empleados
- Generar reportes completos
- No puede eliminar ni anular

### 3. **Lectorista**
- **Registro de Lecturas**
- Solo puede registrar lecturas
- Ver información de clientes asignados
- Ver tarifas (solo lectura)
- Acceso limitado a dashboard

### 4. **Cajero**
- **Gestión de Pagos y Caja**
- Registrar pagos de facturas
- Gestionar caja diaria
- Ver facturas y clientes
- Generar reportes de caja

### 5. **Operador**
- **Operaciones Generales**
- Crear y editar clientes
- Registrar lecturas
- Generar facturas
- Registrar pagos

---

## 👤 Gestión de Empleados

### Acceder al Panel de Empleados

1. Ir a **Configuración** en el menú principal
2. Desplazarse hasta la sección **"Gestión de Empleados"**
3. Verás 3 cards con estadísticas:
   - Total Empleados
   - Empleados Activos
   - Total Roles

### Crear Nuevo Empleado

1. Clic en **"Nuevo Empleado"**
2. Completar el formulario:
   - **Nombre Completo*** (requerido)
   - **Email*** (requerido, único)
   - **Teléfono** (opcional)
   - **Dirección** (opcional)
   - **Rol*** (requerido) - Selecciona de la lista
   - **Fecha de Contratación** (opcional)
   - **Salario (Gs.)** (opcional)
   - **Notas** (opcional)
3. Clic en **"Crear Empleado"**

> **Nota**: Al seleccionar un rol, se muestra su descripción automáticamente

### Editar Empleado

1. En la tabla de empleados, clic en el ícono de **editar** (lápiz)
2. Modificar los campos necesarios
3. Clic en **"Actualizar Empleado"**

### Activar/Desactivar Empleado

1. En la tabla, clic en el ícono de **activar/desactivar**
2. Los empleados desactivados aparecen con opacidad reducida
3. No se eliminan, solo se desactivan (conservan historial)

---

## 📍 Asignaciones de Clientes

### ¿Qué son las Asignaciones?

Las asignaciones permiten vincular empleados con clientes específicos para:
- **Lecturas**: Qué empleado toma lecturas de qué clientes
- **Cobro**: Qué empleado cobra a qué clientes
- **Mantenimiento**: Qué empleado da soporte a qué clientes

### Asignar Clientes a un Empleado

1. En la tabla de empleados, clic en el ícono de **asignar** (personas con +)
2. Se abre el modal con lista de todos los clientes activos
3. Opciones rápidas:
   - **"Seleccionar todos"** - Asigna todos los clientes
   - **"Limpiar selección"** - Deselecciona todos
4. Marcar checkboxes de clientes a asignar
5. Ver contador: **"X cliente(s) seleccionado(s)"**
6. Clic en **"Guardar Asignaciones"**

### Ver Asignaciones

- En la columna **"Asignaciones"** de la tabla
- Muestra badge con número de clientes asignados
- Ejemplo: **"5 clientes"**

---

## 🔐 Permisos por Rol

Los permisos se definen en formato JSONB por módulo:

### Estructura de Permisos

```json
{
  "dashboard": true,
  "clientes": {
    "ver": true,
    "crear": true,
    "editar": true,
    "eliminar": false
  },
  "lecturas": {
    "ver": true,
    "crear": true,
    "editar": true,
    "eliminar": false
  },
  "facturas": {
    "ver": true,
    "crear": true,
    "editar": false,
    "eliminar": false,
    "anular": false
  },
  "pagos": {
    "ver": true,
    "registrar": true,
    "anular": false
  },
  "caja": {
    "ver": true,
    "crear": true,
    "editar": false,
    "eliminar": false,
    "cerrar": false
  },
  "reportes": {
    "ver": true,
    "generar": true,
    "exportar": false
  },
  "configuracion": {
    "ver": false,
    "editar": false
  },
  "empleados": {
    "ver": false,
    "crear": false,
    "editar": false,
    "eliminar": false,
    "asignar": false
  },
  "tarifas": {
    "ver": true,
    "crear": false,
    "editar": false,
    "eliminar": false
  }
}
```

### Módulos Disponibles

| Módulo | Acciones |
|--------|----------|
| **dashboard** | `true/false` |
| **clientes** | ver, crear, editar, eliminar |
| **lecturas** | ver, crear, editar, eliminar |
| **facturas** | ver, crear, editar, eliminar, anular |
| **pagos** | ver, registrar, anular |
| **caja** | ver, crear, editar, eliminar, cerrar |
| **reportes** | ver, generar, exportar |
| **configuracion** | ver, editar |
| **empleados** | ver, crear, editar, eliminar, asignar |
| **tarifas** | ver, crear, editar, eliminar |

---

## 💡 Uso del Sistema

### Flujo Típico

1. **Administrador crea empleados**
   - Define nombre, email y rol
   - Asigna salario y fecha de contratación

2. **Asigna clientes a empleados**
   - Lectoristas reciben asignación de clientes por zona
   - Cada empleado sabe qué clientes atender

3. **Empleados trabajan con sus asignaciones**
   - Ven solo sus clientes asignados
   - Registran lecturas, cobros, etc.

4. **Supervisor monitorea**
   - Ve el trabajo de todos
   - Puede reasignar clientes
   - Genera reportes

### Casos de Uso

#### Caso 1: Nuevo Lectorista
```
1. Admin crea empleado "Juan Pérez"
2. Asigna rol "Lectorista"
3. Asigna 50 clientes de Zona Norte
4. Juan solo ve esos 50 clientes
5. Registra lecturas solo de sus asignados
```

#### Caso 2: Cajero de Turno
```
1. Admin crea empleado "María López"
2. Asigna rol "Cajero"
3. María puede:
   - Ver todas las facturas
   - Registrar pagos
   - Gestionar caja diaria
4. No puede:
   - Eliminar facturas
   - Anular pagos
   - Cambiar configuración
```

#### Caso 3: Supervisor de Operaciones
```
1. Admin crea empleado "Pedro Gómez"
2. Asigna rol "Supervisor"
3. Pedro puede:
   - Ver todo el sistema
   - Asignar clientes a lectoristas
   - Generar reportes completos
   - Supervisar caja
4. No puede:
   - Eliminar registros críticos
   - Anular facturas
   - Modificar configuración del sistema
```

---

## 📊 Tabla de Empleados

### Columnas de la Tabla

| Columna | Descripción |
|---------|-------------|
| **Nombre** | Nombre completo del empleado |
| **Email** | Email único del empleado |
| **Rol** | Badge con el rol asignado |
| **Teléfono** | Número de contacto |
| **Fecha Contratación** | Fecha de inicio |
| **Asignaciones** | Cantidad de clientes asignados |
| **Estado** | Activo/Inactivo |
| **Acciones** | Botones de acción |

### Acciones Disponibles

| Ícono | Acción | Descripción |
|-------|--------|-------------|
| 👥+ | Asignar | Asignar clientes al empleado |
| ✏️ | Editar | Editar información del empleado |
| ✓/✗ | Activar/Desactivar | Cambiar estado del empleado |

---

## 🎨 Características Visuales

### Cards de Resumen
- **Total Empleados**: Contador total con ícono de usuarios
- **Empleados Activos**: Solo activos con ícono de reloj
- **Total Roles**: Cantidad de roles disponibles con ícono de verificación

### Badges de Estado
- 🟢 **ACTIVO**: Verde - Empleado trabajando
- ⚫ **INACTIVO**: Gris - Empleado desactivado
- 🔵 **ROL**: Azul - Muestra el rol asignado

### Modal de Asignaciones
- Lista scrollable con scrollbar personalizado
- Checkboxes con hover effect
- Información completa de cada cliente:
  - Nombre en negrita
  - Número de medidor
  - Dirección completa

---

## 🔧 Funciones SQL Disponibles

### `obtener_permisos_empleado(email)`

Obtiene los permisos de un empleado por su email:

```sql
SELECT obtener_permisos_empleado('juan@ejemplo.com');
```

Retorna objeto JSONB con todos los permisos.

### `asignar_clientes_empleado(...)`

Asigna múltiples clientes a un empleado:

```sql
SELECT asignar_clientes_empleado(
  'uuid-del-empleado',
  ARRAY['uuid-cliente-1', 'uuid-cliente-2'],
  'lectura',
  'Zona Norte'
);
```

---

## 📝 Notas Importantes

### Seguridad
- ✅ Row Level Security (RLS) habilitado en todas las tablas
- ✅ Solo usuarios autenticados pueden acceder
- ✅ Políticas de acceso por tabla

### Integración con Supabase Auth
- Campo `usuario_supabase_id` para vincular con `auth.users`
- Permite futura autenticación por empleado
- Base para sistema de login por rol

### Escalabilidad
- Sistema preparado para miles de empleados
- Índices en campos clave para rendimiento
- Vistas optimizadas para consultas rápidas

### Futuras Mejoras
- [ ] Login individual por empleado
- [ ] Restricción de acceso según permisos
- [ ] Auditoría de acciones por empleado
- [ ] Asignaciones por zona geográfica
- [ ] Historial de cambios de rol
- [ ] Reportes de productividad por empleado

---

## 🆘 Soporte

Si necesitas ayuda:
1. Verifica que el schema SQL se ejecutó correctamente
2. Revisa la consola del navegador para errores
3. Comprueba que las tablas existen en Supabase
4. Verifica que RLS está habilitado

---

## 📄 Licencia

Este sistema es parte del proyecto JahekaY © 2026

---
name: recovery-mode-implementation
description: Guía obligatoria y estándar para implementar la integración de Modo Papelera / Recuperación (Soft-Delete) con visualización simultánea de registros activos y eliminados en cualquier lista o DataGrid del sistema.
---

# Guía Maestra de Implementación de Modo Papelera (Recovery Mode)

Esta skill documenta la arquitectura, el funcionamiento global y la guía paso a paso para integrar el **Modo Papelera / Recuperación (`RecoveryContext`)** con **visualización simultánea de filas activas e inactivas** en cualquier listado o tabla `GenericDataGrid` de la aplicación.

---

## 1. Arquitectura Global y Visibilidad Simultánea

El Modo Papelera permite inspeccionar en una misma tabla tanto los elementos **activos** como los **eliminados**, aplicando controles de permisos y estilos visuales distintivos por cada fila.

### Componentes Clave:
1. **`RecoveryContext` (`@repo/recovery`)**:
   - `isRecoveryMode`: Booleano del conmutador de papelera.
   - `recoveryVisibility`: Asignado a `'all'` o `'deleted'` (por defecto `'all'`, obtiene registros vivos y eliminados simultáneamente).
   - `canUseRecovery`: `true` si el usuario es `superadmin` o cuenta con el permiso/scope `admin:recovery:read`.
2. **Pie de Página (`CustomFooter.tsx`)**:
   - Renderiza el conmutador DevExtreme `<Switch />` para `isRecoveryMode` y `recoveryVisibility` (`all` / `deleted`) cuando `canUseRecovery` es `true`.
   - Al cambiar cualquier switch, actualiza `localStorage` y dispara eventos reactivos (`recovery-mode-changed`, `recovery-visibility-changed`) además de actualizar el estado del contexto.
3. **Helper Centralizado de API (`api.helper.ts`)**:
   - `getOperationalHeaders(token, companyId)` inyecta automáticamente las cabeceras HTTP salientes leyendo `localStorage`:
     - `X-Recovery-Mode: true` (si `isRecoveryMode` está activo)
     - `X-Recovery-Visibility: all | deleted`
     - `X-Company-Id: <companyId>`
4. **Endpoint de Restauración Común (`common.service.ts`)**:
   - Expone `commonService.restore(schema, table, id, token)` que ejecuta `POST /api/v1/admin/recovery/{schema}/{table}/{id}/restore`.

---

## 2. REGLAS OBLIGATORIAS DE IMPLEMENTACIÓN (Checklist Estándar)

### Paso 1: Tipos y Mappers (`*.types.ts` y `*.mapper.ts`)
Asegurar que las interfaces frontend y backend incluyan los campos opcionales de auditoría de borrado:

- **Backend Type (`IBEntidad`)**:
  ```typescript
  deleted_at?: string;
  deleted_by_name?: string;
  ```
- **Frontend Type (`IFEntidad`)**:
  ```typescript
  deletedAt?: string;
  deletedByName?: string;
  ```
- **Mapper (`mapEntidad`)**:
  ```typescript
  deletedAt: entidad.deleted_at,
  deletedByName: entidad.deleted_by_name,
  ```

### Paso 2: Servicio API (`@repo/erp-services/**/*.service.ts`)
Toda función de lectura (`getAll`) y mutación (`create`, `update`, `delete`) **DEBE OBLIGATORIAMENTE** usar `apiFetch` de `@repo/erp-api-client`, que inyecta cabeceras de `RecoveryMode`, `RecoveryVisibility` y `CompanyId`:

```typescript
import { apiFetch, API_URL } from "@repo/erp-api-client";

export const miEntidadService = {
    async getAll(token: string, companyId?: string): Promise<IFListV2<IFEntidad>> {
        const url = companyId
            ? `${API_URL}?company_id=${encodeURIComponent(companyId)}`
            : API_URL;

        return apiFetch(
            url,
            { method: "GET" },
            "No se pudieron obtener los registros",
            { token, companyId }
        );
    }
};
```

### Paso 2.1: Exclusión Obligatoria de RecoveryMode en Selectores y Desplegables
**REGLA DE ORO PARA SELECTORES Y DROPDOWNS (`SelectBox`, `Lookup`, Filtros de Entidad Padre, Modales)**:
- Toda llamada a servicio o fetch destinado a poblar un selector desplegable (ej. `fetchCountries`, `fetchStates`, `fetchCurrencies`, etc.) **DEBE OBLIGATORIAMENTE** ejecutarse con `recoveryMode` deshabilitado (`{ recoveryMode: false }`).
- Los selectores permiten elegir únicamente elementos vigentes y no eliminados. Sus consultas fetch no deben reaccionar al estado de `isRecoveryMode`.
- **Implementación**: pasar `recoveryOptions` en el contexto de `apiFetch`:
  ```typescript
  await apiFetch(url, { method: "GET" }, "…", {
      token,
      companyId,
      recoveryOptions: { recoveryMode: false },
  });
  ```
  O pasar un parámetro explícito al servicio (ej. `ignoreRecovery: true` / `disableRecovery: true`).

### Paso 3: Suscripción y Refetch Reactivo OBLIGATORIO (`*Client.tsx` / `*List.tsx`)
Todo componente cliente que renderice una tabla o grilla **DEBE OBLIGATORIAMENTE**:

1. Desestructurar `isRecoveryMode` y `recoveryVisibility` de `useRecovery()`:
   ```typescript
   import { useRecovery } from "@repo/recovery";
   const { isRecoveryMode, recoveryVisibility } = useRecovery();
   ```

2. **REGLA DE ORO DE REFETCH REACTIVO**: Escuchar explícitamente los cambios de `[isRecoveryMode, recoveryVisibility]` en un `useEffect` para invalidar y refrescar la grilla al tocar los conmutadores del `CustomFooter`:
   ```typescript
   useEffect(() => {
       setRefreshVersion(prev => prev + 1);
       if (gridRef.current?.instance?.refresh) {
           gridRef.current.instance.refresh();
       } else if (gridRef.current?.refresh) {
           gridRef.current.refresh();
       }
   }, [isRecoveryMode, recoveryVisibility]);
   ```

3. **REGLA DE ORO DE DEPENDENCIAS DE DATOSOURCE**: Incluir obligatoriamente `isRecoveryMode` y `recoveryVisibility` en el arreglo de dependencias del `useMemo` del `dataSource` / `CustomStore`:
   ```typescript
   const dataSource = useMemo(() => {
       return new CustomStore({ ... });
   }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);
   ```

### Paso 4: Columnas Dinámicas de Auditoría
Cuando `isRecoveryMode` esté activo, agregar condicionalmente al final del listado de columnas:

```typescript
const columns: IGenericDataGridColumn[] = useMemo(() => {
    const cols: IGenericDataGridColumn[] = [
        // ... columnas base de la entidad ...
    ];

    if (isRecoveryMode) {
        cols.push(
            {
                dataField: 'deletedAt',
                caption: 'Fecha Eliminación',
                dataType: 'datetime',
                format: 'dd/MM/yyyy HH:mm',
                width: 160,
            },
            {
                dataField: 'deletedByName',
                caption: 'Eliminado Por',
                width: 150,
            }
        );
    }

    return cols;
}, [isRecoveryMode]);
```

### Paso 5: Acciones Fila por Fila (`actions`) y Visibilidad de Botones según `isRecoveryMode`
Las acciones de la grilla varían estrictamente dependiendo de si el **Modo Recuperación (`isRecoveryMode`)** está activo o inactivo:

1. **Modo Recuperación Activo (`isRecoveryMode === true`)**:
   - **Acciones Disponibles**: Únicamente **Ver** (`eyeopen`) y **Recuperar / Restaurar** (`revert`).
   - **Acciones Bloqueadas / Ocultas**: **Editar** (`edit`), **Eliminar** (`trash`) y **Alta / Crear** (`allowAdding: false`). No se permite crear nuevos registros ni modificar/eliminar registros existentes dentro de la papelera.
   - **Visibilidad Restaurar**: `visible: () => isRecoveryMode && canRestore` (`canRestore` = SA o scope `admin:recovery:restore`; ≠ purge).

2. **Modo Normal (`isRecoveryMode === false`)**:
   - **Acciones Disponibles**: **Ver** (`eyeopen`), **Editar** (`edit`), **Eliminar** (`trash`) y **Alta / Crear** (`allowAdding: canModify`).
   - **Acciones Ocultas**: **Restaurar** (`revert`).
   - **Visibilidad Editar**: `visible: (e: any) => !isRecoveryMode && canModify`.
   - **Visibilidad Eliminar**: `visible: (e: any) => !isRecoveryMode && canModify`.

Ejemplo de configuración canónica:
```typescript
const actions = useMemo(() => [
    {
        icon: "eyeopen",
        hint: "Ver Detalle",
        onClick: (data: any) => handleViewDetail(data),
        visible: true,
    },
    {
        icon: "edit",
        hint: "Editar",
        onClick: (data: any) => handleEdit(data),
        visible: (e: any) => !isRecoveryMode && canModify,
    },
    {
        icon: "trash",
        hint: "Eliminar",
        onClick: (data: any) => handleRowRemoved(data),
        visible: (e: any) => !isRecoveryMode && canModify,
    },
    {
        icon: "revert",
        hint: "Restaurar",
        onClick: (data: any) => handleRestore(data),
        visible: (e: any) => isRecoveryMode && isSuperAdmin,
    }
], [isRecoveryMode, canModify, isSuperAdmin, token, currentCompany?.id]);
```

Propiedad `editing` de `GenericDataGrid` (desactiva edición directa y condiciona el botón de Alta al estado de `isRecoveryMode`):
```typescript
editing={{
    allowAdding: isRecoveryMode ? false : canModify,
    allowUpdating: false,
    allowDeleting: false,
    useIcons: true,
    onAdd: () => handleOpenCreationModal(),
}}
```

### Paso 6: Estilo Visual Distintivo (Filtro Blanco / `dx-row-deleted`)
- `GenericDataGrid` detecta automáticamente filas con `deletedAt` o `deleted_at` y les aplica la clase CSS `.dx-row-deleted` **únicamente cuando `recoveryVisibility === 'all'`** (vista donde conviven registros activos e inactivos simultáneamente).
- Si `recoveryVisibility === 'deleted'`, las filas eliminadas se renderizan con su estilo normal al ser la vista exclusiva de papelera.
- **Efecto visual**: Aplica opacidad reducida (`0.55`), capa traslúcida ("filtro blanco" `rgba(255,255,255,0.18)` / `0.75`) y tipografía en cursiva (`font-style: italic`).

### Paso 7: Indicador en Modales de Detalle (`detail.tsx`)
En los modales de detalle, si la entidad tiene `deletedAt` / `deleted_at`, mostrar a la derecha del título una etiqueta sutil indicando `"Borrado"`:

```tsx
const isDeleted = Boolean(
    entity?.deletedAt ||
    (entity as any)?.deleted_at ||
    fullEntity?.deletedAt ||
    (fullEntity as any)?.deleted_at
);

const renderTitle = () => (
    <div className="w-full flex items-center justify-between gap-x-1">
        <span className="font-semibold text-base">Detalle del Registro</span>
        {isDeleted && (
            <span className="py-0.5 text-xs text-main/50">
                Borrado
            </span>
        )}
    </div>
);
```

---

## 3. Resumen de Oro

- **Acciones estrictas según `isRecoveryMode`**:
  - Si `isRecoveryMode === true`: Disponibles únicamente **Ver** y **Restaurar**. Se ocultan **Editar**, **Eliminar** y **Crear nuevos registros** (`allowAdding: false`).
  - Si `isRecoveryMode === false`: Disponibles **Ver**, **Editar**, **Eliminar** y **Crear** (`allowAdding: canModify`). Se oculta **Restaurar**.
- **Refetch Obligatorio en Conmutadores**: `useEffect` con `[isRecoveryMode, recoveryVisibility]` forzando `gridRef.current.instance.refresh()` y `setRefreshVersion`.
- **Inclusión en DataSource**: `isRecoveryMode` y `recoveryVisibility` siempre en el arreglo de dependencias del `useMemo` del `dataSource`.
- **Uso de `getOperationalHeaders`**: Las llamadas al servicio siempre usan `getOperationalHeaders(token, companyId)` para leer los valores activos en `localStorage`.
- **Seguridad en Backend**: El backend valida el token JWT (`admin:recovery:read` / `superadmin`), denegando con HTTP 403 ante cualquier intento de manipulación no autorizada.

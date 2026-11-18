import { TUserRole } from "@repo/api-contracts/erp";

export interface IOperationalRoleOption {
    id: TUserRole | string;
    name: string;
    label: string;
}

const PLATFORM_PRIVILEGED_ROLES = new Set(['superadmin', 'dbadmin']);

export const OPERATIONAL_ROLES: IOperationalRoleOption[] = [
    { id: 'user', name: 'Usuario (User)', label: 'Usuario (user) - Operativo básico' },
    { id: 'salesman', name: 'Vendedor (Salesman)', label: 'Vendedor (salesman) - Ventas y clientes' },
    { id: 'driver', name: 'Conductor (Driver)', label: 'Conductor (driver) - Logística y entregas' },
    { id: 'accountant', name: 'Contador (Accountant)', label: 'Contador (accountant) - Contabilidad y finanzas' },
    { id: 'admin', name: 'Administrador (Admin)', label: 'Administrador (admin) - Acceso amplio a operaciones' },
    { id: 'dbadmin', name: 'DB Admin', label: 'DB Admin (dbadmin) - Recuperación y lectura' },
    { id: 'superadmin', name: 'Superadmin', label: 'Super Admin (superadmin) - Control total' },
];

/** Fallback local: oculta roles de plataforma salvo que el actor sea superadmin. */
export function getDefaultRoleOptions(isSuperAdmin: boolean): IOperationalRoleOption[] {
    if (isSuperAdmin) return OPERATIONAL_ROLES;
    return OPERATIONAL_ROLES.filter((role) => !PLATFORM_PRIVILEGED_ROLES.has(String(role.id)));
}

export const DEFAULT_ROLE_OPTIONS = getDefaultRoleOptions(false);

/** Mensajes UX para gates de elevación/democión de roles/scopes privilegiados. */
export function mapUsersAbmError(error: unknown, fallback = 'Error al actualizar usuario'): string {
    const err = error as {
        message?: string;
        code?: string;
        rawDetails?: { detail?: unknown };
    } | null;
    const detail = String(
        err?.rawDetails?.detail ?? err?.code ?? err?.message ?? ''
    );

    if (detail.includes('privileged_role_forbidden')) {
        return 'No podés asignar roles de plataforma (superadmin/dbadmin).';
    }
    if (detail.includes('privileged_scope_forbidden')) {
        return 'No podés asignar scopes de plataforma.';
    }
    if (detail.includes('privileged_role_demotion_forbidden')) {
        return 'No podés quitar un rol de plataforma a este usuario.';
    }
    if (detail.includes('privileged_scope_demotion_forbidden')) {
        return 'No podés quitar un scope de plataforma a este usuario.';
    }

    return err?.message || fallback;
}

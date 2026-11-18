'use client';

import { useEffect, useMemo, useState } from 'react';

import { usersService } from "@repo/erp-services/users.service";
import { IFUser, IFRole, TUserRole } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { Popup, Position } from "devextreme-react/popup";
import { SelectBox } from "devextreme-react/select-box";
import notify from "devextreme/ui/notify";
import PermissionsSelector from "../../system/keysManager/components/permissionsSelector";
import {
    getDefaultRoleOptions,
    mapUsersAbmError,
} from "@/app/lib/constants/users.constants";

interface UserPermissionsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    user: IFUser | null;
    onSuccess?: () => void;
}

export default function UserPermissionsModal({ isOpen, onClose, onHidden, user, onSuccess }: UserPermissionsModalProps) {
    const { token, currentCompany, isSuperAdmin } = useAuth();
    const [selectedRole, setSelectedRole] = useState<string>('user');
    const [rolesOptions, setRolesOptions] = useState<{ id: string; label: string }[]>(
        () => getDefaultRoleOptions(false).map((r) => ({ id: String(r.id), label: r.label })),
    );

    // Initial role based on active company's role assignment
    useEffect(() => {
        if (isOpen && user) {
            const currentRoleAssignment = user.roleAssignments?.find(
                (ra: any) => ra.companyId === currentCompany?.id
            );
            const initialRole = currentRoleAssignment?.roles?.[0] || user.roles?.[0] || 'user';
            setSelectedRole(initialRole);
        }
    }, [isOpen, user, currentCompany?.id]);

    // Load available roles from backend options, fall back to default list (sin SA/dbadmin si no es SA)
    useEffect(() => {
        if (isOpen && token) {
            const fallback = getDefaultRoleOptions(isSuperAdmin).map((r) => ({
                id: String(r.id),
                label: r.label,
            }));
            setRolesOptions(fallback);

            usersService.getRolesOptions(token)
                .then(res => {
                    if (res?.items && res.items.length > 0) {
                        const formatted = res.items.map(item => {
                            const code = (item.code || item.id) as TUserRole;
                            const defaultMatch = fallback.find(d => d.id === code)
                                || getDefaultRoleOptions(true).find(d => d.id === code);
                            return {
                                id: code,
                                label: defaultMatch ? defaultMatch.label : (item.label || code),
                            };
                        });
                        setRolesOptions(formatted);
                    }
                })
                .catch(err => {
                    console.warn('No se pudieron obtener roles desde /roles/options, usando catálogo local:', err);
                });
        }
    }, [isOpen, token, isSuperAdmin]);

    const handleSave = async (newPermissions: string[], active: boolean) => {
        if (!user || !token) return;

        try {
            // Keep role assignments for other companies untouched
            const otherCompanyAssignments = (user.roleAssignments || []).filter(
                (ra: any) => ra.companyId !== currentCompany?.id
            );

            const updatedRoleAssignments = [
                ...otherCompanyAssignments,
                {
                    companyId: currentCompany?.id || '',
                    level: 'company',
                    roles: [selectedRole],
                },
            ];

            // Convert selected granular technical scopes into scope_grants with effect: allow
            const scopeGrants = newPermissions.map(scope => ({
                companyId: currentCompany?.id || '',
                scope,
                effect: 'allow' as const,
            }));

            await usersService.update(user.id, {
                roleAssignments: updatedRoleAssignments,
                scopeGrants: scopeGrants,
            }, token);

            notify('Permisos y rol actualizados correctamente', 'success', 3000);
            onSuccess?.();
            onClose();
        } catch (error: any) {
            console.error('Error al actualizar permisos:', error);
            notify(mapUsersAbmError(error, 'Error al actualizar permisos'), 'error', 3000);
        }
    };

    const pseudoRole = useMemo<IFRole | null>(() => {
        if (!user) return null;
        return {
            id: user.id,
            name: user.name,
            scopes: [selectedRole],
            active: user.active,
            keyPrefix: '',
            createdAt: '',
            lastUsedAt: '',
        };
    }, [user, selectedRole]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            onShown={(e) => {
                e.component.repaint();
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={`Configuración de Permisos — ${user?.name || ''}`}
            width={900}
            height={'85vh'}
        >
            <Position at="center" my="center" of="window" />
            {user ? (
                <div className="w-full h-full overflow-hidden flex flex-col pt-2 rounded-dx gap-2">
                    {/* Functional Role Selection Section */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-primary-500/10 border border-main/10 rounded-dx">
                        <div className="flex flex-col">
                            <span className="text-sm font-bold text-main">
                                Rol Funcional en {currentCompany?.name || 'la empresa actual'}
                            </span>
                            <span className="text-xs text-main/60">
                                Define el acceso operativo a la API en el backend. Las casillas inferiores se enviarán como excepciones individuales (scope grants allow/deny).
                            </span>
                        </div>
                        <div className="w-full sm:w-80 shrink-0">
                            <SelectBox
                                items={rolesOptions}
                                value={selectedRole}
                                valueExpr="id"
                                displayExpr="label"
                                onValueChanged={(e) => setSelectedRole(e.value)}
                                stylingMode="filled"
                                placeholder="Seleccione un rol..."
                            />
                        </div>
                    </div>

                    {/* Granular Scope Selector */}
                    <div className="flex-1 overflow-hidden min-h-0">
                        <PermissionsSelector
                            isReadOnly={false}
                            selectedRoles={pseudoRole}
                            onSave={handleSave}
                            onCancel={onClose}
                            hideTitle={true}
                        />
                    </div>
                </div>
            ) : null}
        </Popup>
    );
}

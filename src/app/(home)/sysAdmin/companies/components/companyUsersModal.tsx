'use client';

import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { Popup, Position, ToolbarItem } from 'devextreme-react/popup';
import { Button } from '@repo/devextreme';
import SelectBox from 'devextreme-react/select-box';
import notify from 'devextreme/ui/notify';
import { IFCompany, IFUser, IFRoleAssignment, IFOptionItem } from '@repo/api-contracts/erp';
import { usersService } from '@repo/erp-services/users.service';
import { useAuth } from '@/contexts/AuthContext';
import { OPERATIONAL_ROLES } from '@/app/lib/constants/users.constants';

const DEFAULT_ROLE = 'user';

interface CompanyUsersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    company: IFCompany | null;
    onSuccess?: () => void;
}

interface UserRowItemProps {
    user: IFUser;
    companyId: string;
    actionLoading: boolean;
    onUpdateRole: (user: IFUser, newRole: string) => void;
    onRemoveUser: (user: IFUser) => void;
}

const UserRowItem = React.memo(function UserRowItem({
    user,
    companyId,
    actionLoading,
    onUpdateRole,
    onRemoveUser,
}: UserRowItemProps) {
    const userAssignment = user.roleAssignments?.find(
        (ra) => ra.companyId === companyId
    );
    const currentRole = userAssignment?.roles?.[0] || DEFAULT_ROLE;

    const handleRoleChanged = useCallback(
        (e: any) => {
            if (e.event && e.value) {
                onUpdateRole(user, e.value);
            }
        },
        [user, onUpdateRole]
    );

    const handleRemove = useCallback(() => {
        onRemoveUser(user);
    }, [user, onRemoveUser]);

    return (
        <div className="flex flex-col md:flex-row md:items-center justify-between p-3 rounded-dx bg-primary-900/30 border border-primary-500/10 hover:border-focus-300/30 transition-colors gap-3">
            <div className="flex items-center gap-3 min-w-[200px]">
                <div className="w-8 h-8 rounded-full bg-focus-500/10 text-focus-300 flex items-center justify-center font-bold text-xs shrink-0 border border-focus-500/20">
                    {user.name ? user.name[0].toUpperCase() : 'U'}
                </div>
                <div className="flex flex-col min-w-0">
                    <span className="text-sm font-semibold text-main truncate">
                        {user.name}
                    </span>
                    <span className="text-xs text-main/60 truncate">
                        @{user.login}
                    </span>
                </div>
            </div>

            {/* Role selector for this company */}
            <div className="flex-1 max-w-[340px]">
                <SelectBox
                    dataSource={OPERATIONAL_ROLES}
                    valueExpr="id"
                    displayExpr="name"
                    value={currentRole}
                    onValueChanged={handleRoleChanged}
                    searchEnabled={true}
                    stylingMode="filled"
                    disabled={actionLoading}
                />
            </div>

            {/* Remove action */}
            <div className="shrink-0 flex items-center justify-end">
                <Button
                    icon="trash"
                    hint="Desasignar de la empresa"
                    stylingMode="text"
                    className="!text-main/50 hover:!text-danger"
                    disabled={actionLoading}
                    onClick={handleRemove}
                />
            </div>
        </div>
    );
});

interface AddUserSectionProps {
    availableUsers: IFOptionItem[];
    selectedUserId: string;
    onUserIdChange: (id: string) => void;
    selectedRole: string;
    onRoleChange: (role: string) => void;
    onAssign: () => void;
    disabled: boolean;
    loading: boolean;
}

const AddUserSection = React.memo(function AddUserSection({
    availableUsers,
    selectedUserId,
    onUserIdChange,
    selectedRole,
    onRoleChange,
    onAssign,
    disabled,
    loading,
}: AddUserSectionProps) {
    const displayUserExpr = useCallback(
        (u: IFOptionItem) => {
            if (!u) return '';
            const loginSuffix = u.meta?.login ? ` (@${u.meta.login})` : '';
            return `${u.label}${loginSuffix}`;
        },
        []
    );

    return (
        <div className="p-3.5 rounded-dx bg-main/5 border border-main/10 flex flex-col gap-3">
            <span className="text-xs font-semibold text-main uppercase tracking-wider">
                Asignar Nuevo Usuario a la Empresa
            </span>

            <div className="grid grid-cols-12 gap-3 items-end">
                <div className="col-span-12 md:col-span-5 flex flex-col gap-1">
                    <label className="text-xs text-main/70">Usuario</label>
                    <SelectBox
                        dataSource={availableUsers}
                        valueExpr="id"
                        displayExpr={displayUserExpr}
                        value={selectedUserId}
                        onValueChanged={(e) => onUserIdChange(e.value)}
                        placeholder="Seleccionar usuario..."
                        searchEnabled={true}
                        searchExpr={['label', 'meta.login']}
                        stylingMode="filled"
                        disabled={disabled || loading || availableUsers.length === 0}
                    />
                </div>

                <div className="col-span-12 md:col-span-5 flex flex-col gap-1">
                    <label className="text-xs text-main/70">Rol Operativo</label>
                    <SelectBox
                        dataSource={OPERATIONAL_ROLES}
                        valueExpr="id"
                        displayExpr="name"
                        value={selectedRole}
                        onValueChanged={(e) => {
                            if (e.value) onRoleChange(e.value);
                        }}
                        placeholder="Seleccionar rol..."
                        searchEnabled={true}
                        stylingMode="filled"
                        disabled={disabled || loading}
                    />
                </div>

                <div className="col-span-12 md:col-span-2">
                    <Button
                        text="Asignar"
                        icon="plus"
                        type="default"
                        stylingMode="contained"
                        onClick={onAssign}
                        disabled={!selectedUserId || disabled || loading}
                        className="w-full !bg-focus-300 !text-variant shadow-sm"
                    />
                </div>
            </div>
        </div>
    );
});

function CompanyUsersModal({
    isOpen,
    onClose,
    onHidden,
    company,
    onSuccess,
}: CompanyUsersModalProps) {
    const { token } = useAuth();
    const [assignedUsers, setAssignedUsers] = useState<IFUser[]>([]);
    const [userOptions, setUserOptions] = useState<IFOptionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // New assignment form state
    const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState<string>('');
    const [selectedRoleToAdd, setSelectedRoleToAdd] = useState<string>(DEFAULT_ROLE);

    const fetchUsers = useCallback(async () => {
        if (!token || !company?.id) return;
        setLoading(true);
        try {
            const [companyUsers, userOptionsRes] = await Promise.all([
                usersService.getAll(token, company.id),
                usersService.getUserOptions({ limit: 200 }, token),
            ]);
            setAssignedUsers(companyUsers || []);
            setUserOptions(userOptionsRes?.items || []);
        } catch (error: any) {
            console.error('Error fetching users:', error);
            notify('Error al cargar la lista de usuarios', 'error', 3000);
        } finally {
            setLoading(false);
        }
    }, [token, company?.id]);

    useEffect(() => {
        if (isOpen && company?.id) {
            fetchUsers();
            setSelectedUserIdToAdd('');
            setSelectedRoleToAdd(DEFAULT_ROLE);
        }
    }, [isOpen, company?.id, fetchUsers]);

    const handleHidden = useCallback(() => {
        setAssignedUsers([]);
        setUserOptions([]);
        setSelectedUserIdToAdd('');
        setSelectedRoleToAdd(DEFAULT_ROLE);
        setLoading(false);
        setActionLoading(false);
        onHidden?.();
    }, [onHidden]);

    const availableUsers = useMemo(() => {
        if (!company?.id) return [];
        const assignedIds = new Set(assignedUsers.map((u) => u.id));
        return userOptions.filter((u) => !assignedIds.has(u.id));
    }, [userOptions, assignedUsers, company?.id]);

    const handleAssignUser = async () => {
        if (!company?.id || !selectedUserIdToAdd || !token) {
            notify('Seleccione un usuario para asignar', 'warning', 2500);
            return;
        }

        if (!selectedRoleToAdd) {
            notify('Seleccione un rol para el usuario', 'warning', 2500);
            return;
        }

        setActionLoading(true);
        try {
            const targetUser = await usersService.getById(selectedUserIdToAdd, token);
            if (!targetUser) {
                notify('No se pudo encontrar el usuario seleccionado', 'error', 3000);
                return;
            }

            const currentCompanyIds = targetUser.companyIds || [];
            const nextCompanyIds = Array.from(new Set([...currentCompanyIds, company.id]));

            const currentRoleAssignments = targetUser.roleAssignments || [];
            const otherAssignments = currentRoleAssignments.filter(ra => ra.companyId !== company.id);

            const newAssignment: IFRoleAssignment = {
                companyId: company.id,
                level: 'company',
                roles: [selectedRoleToAdd],
            };

            await usersService.update(
                targetUser.id,
                {
                    companyIds: nextCompanyIds,
                    roleAssignments: [...otherAssignments, newAssignment],
                },
                token
            );

            notify(`Usuario ${targetUser.name} asignado correctamente`, 'success', 3000);
            setSelectedUserIdToAdd('');
            setSelectedRoleToAdd(DEFAULT_ROLE);
            await fetchUsers();
            onSuccess?.();
        } catch (error: any) {
            console.error('Error assigning user:', error);
            const msg = error instanceof Error && error.message ? error.message : 'Error al asignar usuario';
            notify(msg, 'error', 3000);
        } finally {
            setActionLoading(false);
        }
    };

    const handleUpdateUserRole = useCallback(async (user: IFUser, newRole: string) => {
        if (!company?.id || !token) return;

        if (!newRole) {
            notify('Debe seleccionar un rol', 'warning', 2500);
            return;
        }

        setActionLoading(true);
        try {
            const currentAssignments = user.roleAssignments || [];
            const otherAssignments = currentAssignments.filter(ra => ra.companyId !== company.id);

            const updatedAssignment: IFRoleAssignment = {
                companyId: company.id,
                level: 'company',
                roles: [newRole],
            };

            await usersService.update(
                user.id,
                {
                    companyIds: user.companyIds,
                    roleAssignments: [...otherAssignments, updatedAssignment],
                },
                token
            );

            notify('Rol actualizado correctamente', 'success', 3000);
            await fetchUsers();
            onSuccess?.();
        } catch (error: any) {
            console.error('Error updating user role:', error);
            const msg = error instanceof Error && error.message ? error.message : 'Error al actualizar el rol';
            notify(msg, 'error', 3000);
        } finally {
            setActionLoading(false);
        }
    }, [company?.id, token, fetchUsers, onSuccess]);

    const handleRemoveUser = useCallback(async (user: IFUser) => {
        if (!company?.id || !token) return;

        setActionLoading(true);
        try {
            const nextCompanyIds = (user.companyIds || []).filter(id => id !== company.id);
            const nextAssignments = (user.roleAssignments || []).filter(ra => ra.companyId !== company.id);

            await usersService.update(
                user.id,
                {
                    companyIds: nextCompanyIds,
                    roleAssignments: nextAssignments,
                },
                token
            );

            notify(`Usuario ${user.name} desasignado de la empresa`, 'success', 3000);
            await fetchUsers();
            onSuccess?.();
        } catch (error: any) {
            console.error('Error removing user:', error);
            const msg = error instanceof Error && error.message ? error.message : 'Error al desasignar usuario';
            notify(msg, 'error', 3000);
        } finally {
            setActionLoading(false);
        }
    }, [company?.id, token, fetchUsers, onSuccess]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={company ? `Usuarios Asignados — ${company.name}` : 'Asignación de Usuarios'}
            width={780}
            height="85vh"
            animation={{
                show: { type: 'fade', duration: 150, from: 0, to: 1 },
                hide: { type: 'fade', duration: 150, from: 1, to: 0 },
            }}
        >
            <Position at="center" my="center" of="window" />

            <div className="w-full h-full flex flex-col p-4 gap-4 overflow-hidden">
                {/* Header info */}
                <div className="flex items-center justify-between p-3 rounded-dx bg-primary-900/40 border border-primary-500/10">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-focus-100 flex items-center justify-center text-focus-500 font-bold border border-focus-300">
                            <i className="dx-icon-group text-sm" />
                        </div>
                        <div>
                            <h4 className="text-sm font-semibold text-main">Miembros de la empresa</h4>
                            <p className="text-xs text-main/60">
                                {assignedUsers.length} usuario{assignedUsers.length === 1 ? '' : 's'} asignado{assignedUsers.length === 1 ? '' : 's'}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Add User Section (Memoized to prevent list re-renders) */}
                <AddUserSection
                    availableUsers={availableUsers}
                    selectedUserId={selectedUserIdToAdd}
                    onUserIdChange={setSelectedUserIdToAdd}
                    selectedRole={selectedRoleToAdd}
                    onRoleChange={setSelectedRoleToAdd}
                    onAssign={handleAssignUser}
                    disabled={actionLoading}
                    loading={loading}
                />

                {/* Assigned Users List */}
                <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1">
                    <span className="text-xs font-semibold text-main/80 uppercase tracking-wider mb-1">
                        Usuarios Actuales
                    </span>

                    {loading ? (
                        <div className="flex items-center justify-center p-8 text-main/50 text-sm">
                            <i className="dx-icon-loadpanel animate-spin mr-2" /> Cargando usuarios...
                        </div>
                    ) : assignedUsers.length === 0 ? (
                        <div className="p-8 text-center text-main/40 text-sm border border-dashed border-main/15 rounded-dx">
                            No hay usuarios asignados a esta empresa todavía.
                        </div>
                    ) : (
                        assignedUsers.map((user) => (
                            <UserRowItem
                                key={user.id}
                                user={user}
                                companyId={company?.id || ''}
                                actionLoading={actionLoading}
                                onUpdateRole={handleUpdateUserRole}
                                onRemoveUser={handleRemoveUser}
                            />
                        ))
                    )}
                </div>
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cerrar"
                    onClick={onClose}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
        </Popup>
    );
}

export default React.memo(CompanyUsersModal);

'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { roleService } from '@repo/erp-services/userContext/roles.service';
import { TFRoles } from "@repo/api-contracts/erp";
import { useAuth } from '@/contexts/AuthContext';
import Box, { Item } from 'devextreme-react/box';
import notify from 'devextreme/ui/notify';
import { useEffect, useMemo, useState } from 'react';
import SectionHeader from '../../components/section/sectionHeader';
import RoleCreationModal from './components/actions/creation';
import PermissionsSelector from '@repo/domain-ui/users/components/permissionsSelector';
import RoleList from './components/roleList';

const KeysManagerPage = () => {
    const { token, currentCompany, permissions, isSuperAdmin } = useAuth();
    const [keys, setKeys] = useState<TFRoles>([]);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    const getAllKeys = () => {
        if (token && currentCompany) {
            roleService.getAll(token, currentCompany.id).then((res) => {
                setKeys(res);
            }).catch((error: any) => {
                console.error("Error al obtener claves:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al obtener las claves";
                notify(errorMessage, 'error', 3000);
            });
        }
    }

    useEffect(() => {
        getAllKeys();
    }, [token, currentCompany?.id])

    const selectedRole = useMemo(
        () => keys.find((key) => key.id === selectedRoleId) ?? null,
        [keys, selectedRoleId]
    );

    const handleSelectRole = (id: string) => {
        if (isEditing) return;
        setSelectedRoleId(id);
    };

    const handleEditRole = (id: string) => {
        setSelectedRoleId(id);
        setIsEditing(true);
    };

    const handleDelete = (id: string) => {
        if (token && currentCompany && id) {
            roleService.delete(id, token, currentCompany.id).then((res) => {
                notify(res?.message || 'Clave eliminada con éxito', 'success', 3000);
                getAllKeys();
                if (selectedRoleId === id) {
                    setSelectedRoleId(null);
                    setIsEditing(false);
                }
            }).catch((error: any) => {
                console.error("Error al eliminar la clave:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la clave";
                notify(errorMessage, 'error', 3000);
            });
        }
    }

    const handleCancel = () => {
        setIsEditing(false);
    };

    const handleSave = (newPermissions: string[], active: boolean) => {
        if (token && currentCompany) {
            roleService.update(selectedRoleId!, { scopes: newPermissions, active }, token, currentCompany.id).then((res) => {
                notify(res?.message || 'Clave actualizada con éxito', 'success', 3000);
                getAllKeys();
            }).catch((error: any) => {
                console.error("Error al actualizar la clave:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar la clave";
                notify(errorMessage, 'error', 3000);
            });
        }
        setIsEditing(false);
    };

    const handleNewKey = (payload: { name: string; scopes?: string[]; expiresInDays?: number | null }) => {
        if (token && currentCompany) {
            roleService.create(
                {
                    name: payload.name,
                    scopes: payload.scopes || [],
                    expiresInDays: payload.expiresInDays,
                },
                token,
                currentCompany.id
            ).then((res) => {
                const { key, ...role } = res;
                setKeys((prevKeys) => [...prevKeys, role]);
                if (key) {
                    // Secreto one-shot: copiar al portapapeles si se puede
                    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
                        navigator.clipboard.writeText(key).catch(() => undefined);
                    }
                    notify(
                        `Clave creada. Secreto (solo una vez, copiado si el browser lo permite): ${key}`,
                        'success',
                        10000
                    );
                } else {
                    notify('Clave creada con éxito', 'success', 3000);
                }
            }).catch((error: any) => {
                console.error("Error al crear la clave:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear la clave";
                notify(errorMessage, 'error', 3000);
            });
        }
    };

    const canModify = useMemo((): boolean => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyKeysManager, permissions) : false;
    }, [permissions])

    return (
        <div className="flex flex-col w-full h-full gap-y-2 overflow-hidden">
            <SectionHeader title="Gestión de Claves" />

            <div className="flex-1 min-h-0">
                <Box direction="row" width="100%" height="100%">
                    <Item ratio={1} baseSize={0}>
                        <div className="bg-primary-900 rounded-dx border border-main/10 h-full overflow-auto shadow-lg relative">

                            <div className="flex justify-between items-center sticky top-0 bg-primary-500 z-10 p-4 border-b border-main/10">
                                <h2 className="text-lg font-semibold">Claves Registradas</h2>
                                {canModify ? <i
                                    className={`dx-icon-plus !text-focus-300 !text-xl cursor-pointer ${isEditing ? 'opacity-50 pointer-events-none' : ''}`}
                                    onClick={() => setIsModalVisible(true)}
                                ></i> : null}
                            </div>
                            <div className='p-2'>
                                <RoleList
                                    canModify={canModify}
                                    roles={keys}
                                    selectedRoleId={selectedRoleId}
                                    selectedRoleName={selectedRole?.name || ''}
                                    onSelectRole={handleSelectRole}
                                    onEditRole={handleEditRole}
                                    isEditing={isEditing}
                                    onDelete={handleDelete}
                                />
                            </div>
                        </div>
                    </Item>

                    <Item ratio={0} baseSize={12} />

                    <Item ratio={2} baseSize={0}>
                        <div className="bg-primary-900 rounded-dx border border-main/10 h-full overflow-auto shadow-lg relative">
                            {selectedRoleId ? (
                                <PermissionsSelector
                                    key={selectedRoleId}
                                    selectedRoles={selectedRole}
                                    isReadOnly={!isEditing}
                                    onCancel={handleCancel}
                                    onSave={handleSave}
                                    showExtractColumn={Boolean(isSuperAdmin)}
                                />
                            ) : (
                                <div key="no-selection" className="h-full w-full flex flex-col items-center justify-center p-8 text-center animate-fade-in transition-all">
                                    <div className="w-24 h-24 bg-focus-500/5 rounded-full flex items-center justify-center mb-6 border border-focus-500/10 shadow-sm relative">
                                        <i className="dx-icon-key !text-5xl !text-focus-500/70 absolute"></i>
                                        <div className="w-full h-full rounded-full border-2 border-focus-500/10"></div>
                                    </div>
                                    <h3 className="text-xl font-semibold mb-2 text-main">Ninguna Clave Seleccionada</h3>
                                    <p className="text-main/60 max-w-sm mx-auto leading-relaxed">
                                        Selecciona una clave del panel izquierdo para gestionar sus permisos de acceso o crea una nueva.
                                    </p>
                                </div>
                            )}
                        </div>
                    </Item>
                </Box>
            </div>

            <RoleCreationModal
                visible={isModalVisible}
                onHiding={() => setIsModalVisible(false)}
                onSave={(payload) => handleNewKey(payload)}
            />
        </div>
    );
};

export default KeysManagerPage;
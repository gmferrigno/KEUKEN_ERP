'use client';
import { useRecovery } from "@repo/recovery";
import { hasScope } from '@repo/access';
import { usersService } from '@repo/erp-services/users.service';
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from '@/contexts/AuthContext';
import { createGridPrinter } from '@/lib/printer/gridPrinter';
import { createGridStateStorage } from '@/lib/storage/gridStateStorage';
import { Popup, Position } from 'devextreme-react/popup';
import CustomStore from 'devextreme/data/custom_store';
import notify from 'devextreme/ui/notify';
import { useMemo, useRef, useState } from 'react';
import { mapUsersAbmError } from '@/app/lib/constants/users.constants';
import UserModal from './components/userModal';
import UserPermissionsModal from './components/userPermissionsModal';

const { customLoad, customSave } = createGridStateStorage({ gridId: 'users-grid' });
const { onPrint } = createGridPrinter({ gridId: 'users-grid', title: 'Usuarios', printerTemplate: 'grid' });

// Hoisted outside component — never changes between renders
const USERS_COLUMNS: IGenericDataGridColumn[] = [
    {
        dataField: 'id',
        caption: 'ID',
        allowEditing: false,
        visible: false,
        width: 200,
    },
    {
        dataField: 'name',
        caption: 'Nombre',
        allowSorting: true,
        validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
    },
    {
        dataField: 'login',
        caption: 'Email (Login)',
        visible: true,
    },
    {
        dataField: 'phoneE164',
        caption: 'Teléfono',
        visible: true,
        width: 160,
    },
    {
        dataField: 'activationPending',
        caption: 'Activación',
        visible: true,
        width: 140,
        calculateCellValue: (row: { activationPending?: boolean }) =>
            row.activationPending ? 'Pendiente' : 'OK',
    },
];

export default function UsersClient() {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [selectedUser, setSelectedUser] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'view' | 'create'>('view');

    const [selectedUserForPermissions, setSelectedUserForPermissions] = useState<any>(null);
    const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);

    const { token, currentCompany, isSuperAdmin, effectiveScopes } = useAuth();
    const companyId = currentCompany?.id ?? '0';
    const canEditPhone =
        isSuperAdmin || hasScope(effectiveScopes, 'users:abm:write');

    const [refreshVersion, setRefreshVersion] = useState(0);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'virtualId',
            load: async () => {
                try {
                    const response = await usersService.getAll(token, companyId);
                    const itemsWithId = response.map((item: any) => ({
                        ...item,
                        virtualId: `${item.id}`
                    }));

                    return {
                        data: itemsWithId,
                        totalCount: response.length
                    };
                } catch (error: any) {
                    console.error('Error loading users:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar los usuarios';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, companyId, token]);

    return (
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                    recoveryVisibility={recoveryVisibility}
                    ref={gridRef}
                    gridId="users-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    columns={USERS_COLUMNS}
                    columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                    allowColumnReordering={true}
                    remoteOperations={true}
                    allowColumnResizing={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={{ enabled: false }}
                    sorting={{ mode: 'multiple' }}
                    filterRow={true}
                    headerFilter={true}
                    filterPanel={false}
                    grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                    groupPanel={false}
                    searchPanel={{ visible: true, width: 300, placeholder: 'Buscar usuarios...', highlightSearchText: true }}
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: true,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedUser({});
                            setModalMode('create');
                            setIsModalOpen(true);
                        }
                    }}
                    export={{ enabled: true, fileName: 'Usuarios', allowExportSelectedData: true, formats: ['xlsx'] }}
                    columnChooser={true}
                    columnFixing={true}
                    summary={{
                        totalItems: [
                            { column: 'id', summaryType: 'count', displayFormat: 'Total: {0} usuarios' },
                        ],
                    }}
                    actions={[
                        {
                            icon: 'user',
                            hint: 'Ver / Editar',
                            onClick: (data) => {
                                setSelectedUser(data);
                                setModalMode('view');
                                setIsModalOpen(true);
                            }
                        },
                        {
                            icon: 'key',
                            hint: 'Editar Permisos',
                            onClick: (data) => {
                                setSelectedUserForPermissions(data);
                                setIsPermissionsModalOpen(true);
                            }
                        }
                    ]}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'users-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard', showScrollbar: 'always' }}
                    print={{ enabled: true, onPrint }}
                />
            </div>

            <Popup
                visible={isModalOpen}
                onHiding={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedUser(null);
                }}
                onShown={(e) => {
                    e.component.repaint();
                }}
                dragEnabled={false}
                hideOnOutsideClick={true}
                showCloseButton={true}
                showTitle={true}
                title={modalMode === 'create' ? "Crear Usuario" : "Detalle de Usuario"}
                width={modalMode === 'create' ? 550 : 500}
                height="auto"
            >
                <Position at="center" my="center" of="window" />
                {selectedUser ? (
                    <UserModal
                        selectedUser={selectedUser}
                        mode={modalMode}
                        canEditPhone={canEditPhone}
                        onSave={async (values) => {
                            if (modalMode === 'create') {
                                try {
                                    const selectedRole = values.role || (values.roles && values.roles[0]) || "user";
                                    const payload = {
                                        name: values.name,
                                        login: values.login,
                                        phoneE164: values.phoneE164?.trim() || null,
                                        roles: [selectedRole],
                                        roleAssignments: [
                                            {
                                                companyId: companyId,
                                                level: 'company',
                                                roles: [selectedRole],
                                            }
                                        ],
                                        companyIds: [companyId],
                                    };
                                    await usersService.create(payload, token);
                                    notify(
                                        'Usuario invitado. Se envió el mail de activación.',
                                        'success',
                                        3500
                                    );
                                    setRefreshVersion(v => v + 1);
                                    setIsModalOpen(false);
                                } catch (error: any) {
                                    console.error('Error creating user:', error);
                                    notify(mapUsersAbmError(error, 'Error al crear usuario'), 'error', 3000);
                                }
                                return;
                            }

                            if (modalMode === 'view' && selectedUser?.id) {
                                try {
                                    await usersService.update(
                                        selectedUser.id,
                                        {
                                            phoneE164:
                                                values.phoneE164?.trim() || null,
                                        },
                                        token
                                    );
                                    notify('Teléfono actualizado', 'success', 3000);
                                    setSelectedUser({
                                        ...selectedUser,
                                        phoneE164: values.phoneE164?.trim() || null,
                                    });
                                    setRefreshVersion((v) => v + 1);
                                } catch (error: any) {
                                    notify(
                                        mapUsersAbmError(
                                            error,
                                            'No se pudo actualizar el teléfono'
                                        ),
                                        'error',
                                        3500
                                    );
                                }
                            }
                        }}
                        onCancel={() => setIsModalOpen(false)}
                        onEditPermissions={() => {
                            setIsModalOpen(false);
                            setSelectedUserForPermissions(selectedUser);
                            setIsPermissionsModalOpen(true);
                        }}
                        onResendActivation={async () => {
                            try {
                                await usersService.resendActivation(selectedUser.id, token);
                                notify('Activación reenviada', 'success', 3000);
                            } catch (error: any) {
                                notify(
                                    mapUsersAbmError(error, 'No se pudo reenviar la activación'),
                                    'error',
                                    3500
                                );
                            }
                        }}
                    />
                ) : null}
            </Popup>

            <UserPermissionsModal
                isOpen={isPermissionsModalOpen}
                onClose={() => {
                    setIsPermissionsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedUserForPermissions(null);
                }}
                user={selectedUserForPermissions}
                onSuccess={() => setRefreshVersion(v => v + 1)}
            />
        </div>
    );
}

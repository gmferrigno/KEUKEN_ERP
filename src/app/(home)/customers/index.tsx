'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import { canDo } from "@repo/access";
import { customersService } from "@repo/erp-services/partners/customers.service";
import { confirmDelete, GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import CustomerModal from "./components/actions/customerModal";
import CustomerCreationWizard from "./components/actions/customerCreationWizard";
import CustomerDetailModal from "./components/actions/customerDetailModal";
import { ClusterManagerModal } from "@/app/(home)/audiences/components";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'customers-grid' });

const remoteOpsConfig = { paging: true, filtering: false, sorting: false };
const pagingConfig = { enabled: true, pageSize: 50, pageSizes: [20, 50, 100] };
const searchPanelConfig = {
    visible: true,
    width: 350,
    placeholder: 'Buscar clientes...',
    highlightSearchText: true
};
const exportConfig = {
    enabled: true,
    fileName: 'Clientes',
    allowExportSelectedData: true,
};
const stateStoringConfig = {
    enabled: true,
    type: 'custom' as const,
    storageKey: 'customers-grid',
    customLoad,
    customSave,
};

const selectionConfig = {
    mode: 'multiple' as const,
    selectAllMode: 'page' as const,
    showCheckBoxesMode: 'always' as const,
};

const CustomersClient = () => {
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [isClusterManagerOpen, setIsClusterManagerOpen] = useState(false);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [refreshVersion, setRefreshVersion] = useState(0);

    // Refetch reactivo cuando cambia el switch de RecoveryMode o RecoveryVisibility
    useEffect(() => {
        setRefreshVersion(prev => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, [isRecoveryMode, recoveryVisibility]);

    const handleToolbarPreparing = useCallback((e: any) => {
        if (!isRecoveryMode) {
            e.toolbarOptions.items.unshift({
                location: 'before',
                widget: 'dxButton',
                options: {
                    icon: 'group',
                    text: selectedRowKeys.length > 0 ? `Clúster (${selectedRowKeys.length})` : 'Clúster',
                    hint: selectedRowKeys.length > 0
                        ? `Agrupar ${selectedRowKeys.length} clientes en un clúster`
                        : 'Seleccione clientes para agrupar',
                    type: 'default',
                    stylingMode: 'contained',
                    disabled: selectedRowKeys.length === 0,
                    onClick: () => {
                        setIsClusterManagerOpen(true);
                    }
                }
            });
        }
    }, [isRecoveryMode, selectedRowKeys]);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['partners'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', ['partners'], permissions) : false;
    }, [permissions]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                if (!currentCompany?.id || !token) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const response = await customersService.getAll(token, take, skip, currentCompany.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error) {
                    console.error('Error loading customers:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar clientes';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: any) => {
        if (!token) return;
        const row = data?.data || data;
        const confirmed = await confirmDelete({
            title: "Eliminar Cliente",
            itemLabel: "el cliente",
            itemName: row?.name || row?.code,
        });
        if (!confirmed) return;

        try {
            const targetId = row?.id || data?.id || data;
            await customersService.delete(targetId, token, currentCompany?.id);
            notify("Cliente eliminado exitosamente", "success", 3000);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
        } catch (error) {
            console.error("Error deleting customer:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar cliente";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        if (!currentCompany?.id) {
            notify("No hay una empresa activa seleccionada", "error", 3000);
            return;
        }
        try {
            await commonService.restore(RECOVERY_ENTITIES.CUSTOMER.schema, RECOVERY_ENTITIES.CUSTOMER.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Cliente restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar cliente:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "eyeopen",
            hint: "Ver Detalle",
            onClick: (data: any) => {
                setSelectedCustomerId(data.id);
                setIsDetailModalOpen(true);
            },
            visible: canView,
        },
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedCustomerId(data.id);
                setIsModalOpen(true);
            },
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
            visible: (e: any) => isRecoveryMode && canRestore,
        }
    ], [canModify, canView, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'code',
                caption: 'Código',
                allowEditing: false,
                width: 100,
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowEditing: false,
            },
            {
                dataField: 'email',
                caption: 'Email',
                allowEditing: false,
            },
            {
                dataField: 'taxId',
                caption: 'ID Fiscal (CUIT/RUT)',
                allowEditing: false,
                width: 150,
            },
            {
                dataField: 'countryIsoCode',
                caption: 'País',
                allowEditing: false,
                width: 80,
            },
            {
                dataField: 'stateName',
                caption: 'Provincia/Estado',
                allowEditing: false,
                width: 150,
            },
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

    const editingConfig = useMemo(() => ({
        mode: 'row' as const,
        allowAdding: isRecoveryMode ? false : canModify,
        allowUpdating: false,
        allowDeleting: false,
        useIcons: true,
        onAdd: () => {
            setSelectedCustomerId(null);
            setIsModalOpen(true);
        }
    }), [canModify, isRecoveryMode]);

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose text-[200px]! text-focus-500/20!" />
                <p className="text-2xl font-bold text-main/60">No tienes permiso para acceder a esta página</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                        ref={gridRef}
                        gridId="customers-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={remoteOpsConfig}
                        columns={columns}
                        actions={actions}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={pagingConfig}
                        selection={selectionConfig}
                        onSelectionChanged={(e) => setSelectedRowKeys(e.selectedRowKeys || [])}
                        onToolbarPreparing={handleToolbarPreparing}
                        filterRow={true}
                        headerFilter={true}
                        searchPanel={searchPanelConfig}
                        editing={editingConfig}
                        export={exportConfig}
                        stateStoring={stateStoringConfig}
                    />
                </div>
            </div>

            {selectedCustomerId ? (
                <CustomerModal
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedCustomerId(null);
                    }}
                    onSuccess={() => {
                        setRefreshVersion(prev => prev + 1);
                    }}
                    customerId={selectedCustomerId}
                />
            ) : (
                <CustomerCreationWizard
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setSelectedCustomerId(null);
                    }}
                    onSuccess={() => {
                        setRefreshVersion(prev => prev + 1);
                    }}
                />
            )}

            <CustomerDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedCustomerId(null);
                }}
                customerId={selectedCustomerId}
            />

            <ClusterManagerModal
                isOpen={isClusterManagerOpen}
                onClose={() => setIsClusterManagerOpen(false)}
                selectedIds={selectedRowKeys}
                entityType="customer"
                existingClusterOnly={true}
                onSuccess={() => {
                    if (gridRef.current?.clearSelection) {
                        gridRef.current.clearSelection();
                    } else if (gridRef.current?.instance?.()?.clearSelection) {
                        gridRef.current.instance().clearSelection();
                    }
                    setSelectedRowKeys([]);
                }}
            />
        </div>
    );
};

export default CustomersClient;

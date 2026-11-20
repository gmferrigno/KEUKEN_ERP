'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useMemo, useRef, useState, useEffect } from "react";

import { commonService } from "@repo/erp-services/common.service";
import { providerService } from "@repo/erp-services/location_services/provider.service";
import { IFListBasicParams } from "@repo/api-contracts/erp";
import { IFProvider } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import ProviderCreationModal from "./actions/creation";
import ProviderDetailModal from "./actions/detail";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'providers-grid' });

const ProvidersClient = () => {
    const { token, currentCompany, permissions, loading, isSuperAdmin } = useAuth();
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProvider, setSelectedProvider] = useState<IFProvider | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailProvider, setDetailProvider] = useState<IFProvider | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['providers'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyProviders, permissions) : false;
    }, [permissions]);

    const handleOpenModal = (provider: IFProvider | null = null) => {
        setSelectedProvider(provider);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedProvider(null);
    };

    const handleOpenDetailModal = (provider: IFProvider) => {
        setDetailProvider(provider);
        setIsDetailModalOpen(true);
    };

    const handleCloseDetailModal = () => {
        setIsDetailModalOpen(false);
        setDetailProvider(null);
    };

    const handleSuccess = () => {
        setRefreshVersion(prev => prev + 1);
        if (typeof gridRef.current?.instance?.refresh === 'function') {
            gridRef.current.instance.refresh();
        } else if (typeof gridRef.current?.refresh === 'function') {
            gridRef.current.refresh();
        }
    };

    // Refetch reactivo cuando cambia el switch de RecoveryMode o RecoveryVisibility
    useEffect(() => {
        handleSuccess();
    }, [isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: IFProvider) => {
        try {
            const res = await providerService.delete(data.id, token, currentCompany?.id);
            notify(res.message || "Proveedor eliminado exitosamente", "success", 3000);
            handleSuccess();
        } catch (error: any) {
            console.error("Error al eliminar proveedor:", error);
            notify(error.message || "Error al eliminar el proveedor", "error", 3000);
        }
    };

    const handleRestore = async (data: IFProvider) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.SUPPLIERS.schema, RECOVERY_ENTITIES.SUPPLIERS.table, data.id, token);
            notify("Proveedor restaurado exitosamente", "success", 3000);
            handleSuccess();
        } catch (error: any) {
            console.error("Error al restaurar proveedor:", error);
            notify(error.message || "Error al restaurar el proveedor", "error", 3000);
        }
    };

    const gridActions = useMemo(() => [
        {
            icon: "eyeopen",
            hint: "Ver Detalle",
            onClick: (data: IFProvider) => handleOpenDetailModal(data),
            visible: canView,
        },
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: IFProvider) => handleOpenModal(data),
            visible: (e: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "trash",
            hint: "Eliminar",
            onClick: (data: IFProvider) => handleRowRemoved(data),
            visible: (e: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "revert",
            hint: "Restaurar",
            onClick: (data: IFProvider) => handleRestore(data),
            visible: (e: any) => isRecoveryMode && isSuperAdmin,
        }
    ], [canModify, canView, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                const searchParams: IFListBasicParams = {
                    limit: loadOptions.take || 20,
                    offset: loadOptions.skip || 0,
                };

                try {
                    const response = await providerService.getAll(token, currentCompany?.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading providers:', error);
                    const errorMessage = error instanceof Error && error.message 
                        ? error.message 
                        : 'Error al cargar los proveedores';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, currentCompany?.id, token, isRecoveryMode, recoveryVisibility]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                visible: false,
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'code',
                caption: 'Código',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El código es obligatorio' }],
            },
            {
                dataField: 'taxId',
                caption: 'CUIT / Tax ID',
                allowSorting: true,
            },
            {
                dataField: 'email',
                caption: 'Email',
                allowSorting: true,
            },
            {
                dataField: 'countryIsoCode',
                caption: 'País (ISO)',
                width: 80,
            },
            {
                dataField: 'stateName',
                caption: 'Provincia/Estado',
            },
            {
                dataField: 'minDaysToExpiryOrder',
                caption: 'Días Venc. (Ord.)',
                dataType: 'number',
            }
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

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose !text-[200px] !text-focus-500/20" />
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
                        gridId="providers-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={true}
                        columns={columns}
                        columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        onRowDblClick={(e) => handleOpenDetailModal(e.data)}
                        actions={gridActions}
                        paging={{ enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                        sorting={{ mode: 'multiple' }}
                        filterRow={true}
                        headerFilter={true}
                        filterPanel={true}
                        grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                        groupPanel={true}
                        selection={{ mode: 'none' }}
                        searchPanel={{
                            visible: true,
                            width: 350,
                            placeholder: 'Buscar proveedores...',
                            highlightSearchText: true
                        }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => handleOpenModal(),
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Proveedores',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'providers-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>

            <ProviderCreationModal
                isOpen={isModalOpen}
                onClose={handleCloseModal}
                onSuccess={handleSuccess}
                initialData={selectedProvider}
            />

            <ProviderDetailModal
                isOpen={isDetailModalOpen}
                onClose={handleCloseDetailModal}
                provider={detailProvider}
            />
        </div>
    );
};

export default ProvidersClient;

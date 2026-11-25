'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { deliveryRoutes } from "@/app/lib/utils/prittier";
import { routesService } from "@repo/erp-services/routes.service";
import { vehiclesService } from "@repo/erp-services/vehicles.service";
import { IFVehicle } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import "devextreme-react/select-box";
import { useEffect, useMemo, useRef, useState } from "react";
import RouteCreationModal from "./components/actions/routeCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'delivery-routes-grid' });

const statusLookupDataSource = Object.entries(deliveryRoutes).map(([id, name]) => ({ id, name }));

const RoutesClient = () => {
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const { token, currentCompany, permissions, loading, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedRoute, setSelectedRoute] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [vehicles, setVehicles] = useState<IFVehicle[]>([]);

    const modelLookupDataSource = useMemo(() => {
        const uniqueModels = Array.from(new Set(vehicles.map(v => v.modelName).filter(Boolean)));
        return uniqueModels.map(model => ({ id: model, name: model }));
    }, [vehicles]);

    const canView = useMemo((): boolean => {
        return permissions ? canDo('view', ['delivery'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo((): boolean => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyDelivery, permissions) : false;
    }, [permissions, isSuperAdmin]);

    // Refetch reactivo cuando cambia el switch de RecoveryMode o RecoveryVisibility
    useEffect(() => {
        setRefreshVersion(prev => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, [isRecoveryMode, recoveryVisibility]);

    useEffect(() => {
        const fetchVehicles = async () => {
            if (!token) return;
            try {
                const response = await vehiclesService.getAll(token, 1000, 0, currentCompany?.id);
                setVehicles(response.items);
            } catch (error) {
                console.error("Error fetching vehicles:", error);
                notify("Error al cargar los vehículos", "error", 3000);
            }
        };
        fetchVehicles();
    }, [token, currentCompany?.id]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                try {
                    const response = await routesService.getAll(
                        token,
                        1000,
                        0,
                        currentCompany?.id
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading routes:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar las rutas';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await routesService.delete(data.id, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ruta eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting route:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la ruta";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.ROUTE.schema, RECOVERY_ENTITIES.ROUTE.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ruta restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar ruta:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedRoute(data);
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
    ], [canModify, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'name',
                caption: 'Nombre de la Ruta',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'driverName',
                caption: 'Chofer',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El Chofer es obligatorio' }],
            },
            {
                dataField: 'vehicleId',
                caption: 'Patente',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El Vehículo es obligatorio' }],
                calculateCellValue: (rowData) => {
                    const vehicle = vehicles.find(v => v.id === rowData.vehicleId);
                    return vehicle ? vehicle.licensePlate : '';
                }
            },
            {
                dataField: 'vehicleModel',
                caption: 'Modelo',
                allowSorting: true,
                allowFiltering: true,
                allowHeaderFiltering: true,
                allowSearch: true,
                calculateCellValue: (rowData) => {
                    const vehicle = vehicles.find(v => v.id === rowData.vehicleId);
                    return vehicle ? vehicle.modelName : '';
                },
                lookup: {
                    dataSource: modelLookupDataSource,
                    valueExpr: 'id',
                    displayExpr: 'name'
                }
            },
            {
                dataField: 'status',
                caption: 'Estado',
                allowSorting: true,
                width: 120,
                lookup: {
                    dataSource: statusLookupDataSource,
                    valueExpr: 'id',
                    displayExpr: 'name'
                }
            },
            {
                dataField: 'createdAt',
                caption: 'Creado',
                dataType: 'datetime',
                format: 'dd/MM/yyyy HH:mm',
                allowEditing: false,
                width: 150,
            },
            {
                dataField: 'startedAt',
                caption: 'Iniciado',
                dataType: 'datetime',
                format: 'dd/MM/yyyy HH:mm',
                allowEditing: false,
                width: 150,
            },
            {
                dataField: 'completedAt',
                caption: 'Completado',
                dataType: 'datetime',
                format: 'dd/MM/yyyy HH:mm',
                allowEditing: false,
                width: 150,
                customizeText: (cellInfo: any) => {
                    return cellInfo.value ? cellInfo.valueText : 'Sin completar';
                }
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
    }, [vehicles, modelLookupDataSource, isRecoveryMode]);

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
                        gridId="delivery-routes-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={false}
                        columns={columns}
                        actions={actions}
                        columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={{ enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                        sorting={{ mode: 'multiple' }}
                        filterRow={true}
                        headerFilter={true}
                        filterPanel={true}
                        grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                        groupPanel={true}
                        searchPanel={{
                            visible: true,
                            width: 350,
                            placeholder: 'Buscar rutas...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron rutas de reparto"
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedRoute(null);
                                setIsModalOpen(true);
                            },
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Rutas_de_Reparto',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'delivery-routes-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>
            <RouteCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedRoute(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedRoute}
            />
        </div>
    );
};

export default RoutesClient;

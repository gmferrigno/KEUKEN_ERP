'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import { vehiclesService } from "@repo/erp-services/vehicles.service";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import VehicleCreationModal from "./components/actions/vehicleCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'delivery-vehicles-grid' });

const VehiclesClient = () => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const { token, currentCompany, permissions, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedVehicle, setSelectedVehicle] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canModify = useMemo(() => {
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

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                try {
                    const response = await vehiclesService.getAll(
                        token,
                        loadOptions.take || 20,
                        loadOptions.skip || 0,
                        currentCompany?.id
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading vehicles:', error);
                    notify(error?.message || 'Error al cargar los vehículos', 'error', 3000);
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
            await vehiclesService.delete(data.id, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Vehículo eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting vehicle:", error);
            notify(error?.message || "Error al eliminar el vehículo", "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.VEHICLE.schema, RECOVERY_ENTITIES.VEHICLE.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Vehículo restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar vehículo:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedVehicle(data);
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
            visible: (e: any) => isRecoveryMode && isSuperAdmin,
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
                dataField: 'licensePlate',
                caption: 'Patente / Matrícula',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'La patente es obligatoria' }],
                width: 150,
            },
            {
                dataField: 'modelName',
                caption: 'Modelo',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El modelo es obligatorio' }],
            },
            {
                dataField: 'driverName',
                caption: 'Chofer',
                allowSorting: true,
                calculateDisplayValue: (rowData: any) => {
                    return rowData.driverName || 'Sin chofer';
                }
            },
            {
                dataField: 'capacityWeight',
                caption: 'Capacidad Peso (kg)',
                dataType: 'number',
                format: '#,##0.00',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'La capacidad de peso es obligatoria' }],
                width: 180,
            },
            {
                dataField: 'capacityVolume',
                caption: 'Capacidad Volumen (m³)',
                dataType: 'number',
                format: '#,##0.00',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'La capacidad de volumen es obligatoria' }],
                width: 180,
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

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                        ref={gridRef}
                        gridId="delivery-vehicles-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={true}
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
                            placeholder: 'Buscar vehículos...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron vehículos de reparto"
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedVehicle(null);
                                setIsModalOpen(true);
                            },
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Vehiculos_de_Reparto',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        summary={{
                            totalItems: [
                                {
                                    column: 'licensePlate',
                                    summaryType: 'count',
                                    displayFormat: 'Total: {0} vehículos'
                                },
                            ],
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'delivery-vehicles-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>
            <VehicleCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedVehicle(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedVehicle}
            />
        </div>
    );
};

export default VehiclesClient;

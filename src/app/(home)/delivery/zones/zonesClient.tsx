'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import { zonesService } from "@repo/erp-services/zones.service";
import { deliveryZones } from "@/app/lib/utils/prittier";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import ZoneCreationModal from "./components/actions/zoneCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'delivery-zones-grid' });

const zoneTypeLookupDataSource = Object.entries(deliveryZones).map(([id, name]) => ({ id, name }));

const ZonesClient = () => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const { token, currentCompany, permissions, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedZone, setSelectedZone] = useState<any>(null);
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
                    const response = await zonesService.getAll(
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
                    console.error('Error loading zones:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar las zonas';
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
            await zonesService.delete(data.id, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Zona eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting zone:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la zona";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.ZONE.schema, RECOVERY_ENTITIES.ZONE.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Zona restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar zona:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedZone(data);
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
                dataField: 'code',
                caption: 'Código',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El código es obligatorio' }],
                width: 150,
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'parentId',
                caption: 'Zona Padre (ID)',
                allowSorting: true,
                visible: false,
            },
            {
                dataField: 'zoneType',
                caption: 'Tipos de Zona',
                allowSorting: true,
                calculateCellValue: (rowData) => {
                    return Array.isArray(rowData.zoneType) ? rowData.zoneType[0] : rowData.zoneType;
                },
                lookup: {
                    dataSource: zoneTypeLookupDataSource,
                    valueExpr: 'id',
                    displayExpr: 'name'
                }
            },
            {
                dataField: 'polygons',
                caption: 'Geozonas',
                allowSorting: false,
                calculateCellValue: (rowData) => {
                    const count = Array.isArray(rowData.polygons) ? rowData.polygons.length : 0;
                    return `${count} geozona(s)`;
                },
                width: 150,
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
                        gridId="delivery-zones-grid"
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
                            placeholder: 'Buscar zonas...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron zonas de reparto"
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedZone(null);
                                setIsModalOpen(true);
                            },
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Zonas_de_Reparto',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'delivery-zones-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>
            <ZoneCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedZone(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedZone}
            />
        </div>
    );
};

export default ZonesClient;

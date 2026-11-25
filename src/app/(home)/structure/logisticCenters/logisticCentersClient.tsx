'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { commonService } from "@repo/erp-services/common.service";
import { logisticsCentersService } from "@repo/erp-services/userContext/logisticsCenters.service";
import { IFLogisticsCenter } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import LogisticCenterCreationModal from "./components/actions/logisticCenterCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'logistics-centers-grid' });

const LogisticCentersClient = () => {
    const { token, user, permissions, loading, includeInactive, currentCompany, isSuperAdmin } = useAuth();
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCenter, setSelectedCenter] = useState<IFLogisticsCenter | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);





    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['logisticsCenters'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyLogisticsCenters || ['logisticsCenters'], permissions) : false;
    }, [permissions, isSuperAdmin]);

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
            load: async () => {
                try {
                    const response = await logisticsCentersService.getAll(
                        {
                            company_id: currentCompany?.id,
                            include_inactive: includeInactive,
                            limit: 5000,
                        },
                        token
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading logistics centers:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar los centros logísticos';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, includeInactive, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await logisticsCentersService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Centro logístico eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting logistics center:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar el centro logístico";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.LOGISTICS_CENTERS.schema, RECOVERY_ENTITIES.LOGISTICS_CENTERS.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Centro logístico restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar el centro logístico:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al restaurar el centro logístico";
            notify(errorMessage, "error", 3000);
        }
    };

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
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'active',
                caption: 'Activo',
                width: 100,
                alignment: 'center',
                visible: includeInactive,
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                )
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
    }, [includeInactive, isRecoveryMode]);

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: async (data: any) => {
                try {
                    const detail = await logisticsCentersService.getById(data.id, token);
                    setSelectedCenter(detail);
                } catch {
                    setSelectedCenter(data);
                }
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
            visible: () => isRecoveryMode && canRestore,
        }
    ], [isRecoveryMode, canModify, canRestore, token]);

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
                        gridId="logistics-centers-grid"
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
                            placeholder: 'Buscar centros logísticos...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron centros logísticos"
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedCenter(null);
                                setIsModalOpen(true);
                            }
                        }}
                        export={{
                            enabled: true,
                            fileName: 'Centros Logísticos',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        summary={{
                            totalItems: [
                                {
                                    column: 'id',
                                    summaryType: 'count',
                                    displayFormat: 'Total: {0} centros logísticos'
                                },
                            ],
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'logistics-centers-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>
            <LogisticCenterCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedCenter(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedCenter}
            />
        </div>
    );
};

export default LogisticCentersClient;

'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import { canDo } from "@repo/access";
import { listTypesService } from "@repo/erp-services/priceLists/listTypes.service";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddNewListType from "./components/actions/addNewListType";
import { LIST_TYPE_OPERATION_OPTIONS } from "@/app/lib/constants/priceList.constants";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'listtypes-grid' });

const REMOTE_OPERATIONS = { paging: true, filtering: false, sorting: false };
const PAGING_CONFIG = { enabled: true, pageSize: 50, pageSizes: [20, 50, 100] };
const SEARCH_PANEL_CONFIG = {
    visible: true,
    width: 350,
    placeholder: 'Buscar tipos de listas...',
    highlightSearchText: true
};
const EXPORT_CONFIG = {
    enabled: true,
    fileName: 'TiposDeListas',
    allowExportSelectedData: true
};
const STATE_STORING_CONFIG = {
    enabled: true,
    type: 'custom' as const,
    storageKey: 'listtypes-grid',
    customLoad,
    customSave,
};

const ListTypesClient = () => {
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedListType, setSelectedListType] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
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
            load: async (loadOptions) => {
                if (!currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const response = await listTypesService.getAll(
                        token,
                        currentCompany.id,
                        take,
                        skip
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading list types:', error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : 'Error al cargar los tipos de listas';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = useCallback(async (e: any) => {
        try {
            const data = e.data || e;
            await listTypesService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Tipo de lista eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting list type:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al eliminar el tipo de lista";
            notify(errorMessage, "error", 3000);
        }
    }, [token]);

    const handleRestore = useCallback(async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.PRICE_LIST_TYPE.schema, RECOVERY_ENTITIES.PRICE_LIST_TYPE.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Tipo de lista restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar tipo de lista:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    }, [token]);

    const handleRowUpdated = useCallback(async (e: any) => {
        try {
            const updatedData = { ...e.oldData, ...e.newData };
            await listTypesService.update(updatedData.id, { active: updatedData.active }, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Estado actualizado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating list type:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al actualizar el tipo de lista";
            notify(errorMessage, "error", 3000);
            e.cancel = true;
            setRefreshVersion(prev => prev + 1);
        }
    }, [token]);

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
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowEditing: false,
            },
            {
                dataField: 'operation',
                caption: 'Operación',
                allowEditing: false,
                lookup: {
                    dataSource: LIST_TYPE_OPERATION_OPTIONS,
                    valueExpr: 'id',
                    displayExpr: 'name'
                }
            },
            {
                dataField: 'defaultMarginOverCostPct',
                caption: 'Margen por defecto (%)',
                dataType: 'number',
                allowEditing: false,
            },
            {
                dataField: 'discountPolicy.maxDiscountPctItem',
                caption: 'Descuento Máx. Item (%)',
                dataType: 'number',
                allowEditing: false,
            },
            {
                dataField: 'discountPolicy.maxDiscountPctOrder',
                caption: 'Descuento Máx. Orden (%)',
                dataType: 'number',
                allowEditing: false,
            },
            {
                dataField: 'active',
                caption: 'Activo',
                allowEditing: canModify,
                width: 100,
                alignment: 'center',
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
    }, [canModify, isRecoveryMode]);

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedListType(data);
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
    ], [canModify, isSuperAdmin, isRecoveryMode, handleRowRemoved, handleRestore]);

    const editingConfig = useMemo(() => ({
        mode: 'cell' as const,
        allowAdding: isRecoveryMode ? false : canModify,
        allowUpdating: false,
        allowDeleting: false,
        useIcons: true,
        onAdd: () => {
            setSelectedListType(null);
            setIsModalOpen(true);
        },
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
                        gridId="listtypes-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={REMOTE_OPERATIONS}
                        columns={columns}
                        actions={actions}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={PAGING_CONFIG}
                        filterRow={true}
                        headerFilter={true}
                        searchPanel={SEARCH_PANEL_CONFIG}
                        editing={editingConfig}
                        export={EXPORT_CONFIG}
                        onRowUpdated={handleRowUpdated}
                        stateStoring={STATE_STORING_CONFIG}
                    />
                </div>
            </div>

            <AddNewListType
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedListType(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedListType}
            />
        </div>
    );
};

export default ListTypesClient;

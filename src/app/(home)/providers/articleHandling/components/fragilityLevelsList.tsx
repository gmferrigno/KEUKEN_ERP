'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import { fragilityService } from "@repo/erp-services/product_services/fragility.service";
import { IFFragilityClass } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from 'react';
import FragilityModal from "./actions/fragilityModal";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'fragility-classes-grid' });

const FragilityLevelsList = () => {
    const { isRecoveryMode, recoveryVisibility, canUseRecovery } = useRecovery();
    const { currentCompany, token, isSuperAdmin, permissions, includeInactive } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedData, setSelectedData] = useState<IFFragilityClass | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? true : false;
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
                if (!currentCompany?.id || !token) return [];
                try {
                    const data = await fragilityService.getAll(currentCompany.id, token);
                    return data;
                } catch (error: any) {
                    console.error('Error loading fragility classes:', error);
                    notify(error?.message || 'Error al cargar los niveles de fragilidad', 'error', 3000);
                    return [];
                }
            }
        });
    }, [currentCompany?.id, token, refreshVersion, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: any) => {
        if (!currentCompany?.id || !token) return;
        try {
            await fragilityService.delete(currentCompany.id, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Nivel de fragilidad eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting fragility class:", error);
            notify(error?.message || "Error al eliminar el nivel de fragilidad", "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.FRAGILITY_CLASSES.schema, RECOVERY_ENTITIES.FRAGILITY_CLASSES.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Nivel de fragilidad restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar el nivel de fragilidad:", error);
            notify(error?.message || "Error al restaurar el nivel de fragilidad", "error", 3000);
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
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
            },
            {
                dataField: 'active',
                caption: 'Activo',
                allowSorting: true,
                visible: includeInactive,
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
    }, [includeInactive, isRecoveryMode]);

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedData(data);
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
            visible: (e: any) => isRecoveryMode && (isSuperAdmin || canUseRecovery || canModify),
        }
    ], [isRecoveryMode, canModify, isSuperAdmin, canUseRecovery]);

    return (
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                    ref={gridRef}
                    gridId="fragility-classes-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    columns={columns}
                    actions={actions}
                    allowColumnReordering={true}
                    allowColumnResizing={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={{ enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                    filterRow={true}
                    headerFilter={true}
                    searchPanel={{ visible: true, width: 250, placeholder: 'Buscar...' }}
                    editing={{
                        allowAdding: isRecoveryMode ? false : canModify,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedData(null);
                            setIsModalOpen(true);
                        }
                    }}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'fragility-classes-grid',
                        customLoad,
                        customSave,
                    }}
                />
            </div>
            <FragilityModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedData}
            />
        </div>
    );
};

export default FragilityLevelsList;

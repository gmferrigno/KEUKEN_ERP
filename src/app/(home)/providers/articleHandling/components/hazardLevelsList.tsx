'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import notify from "devextreme/ui/notify";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import { hazardService } from "@repo/erp-services/product_services/hazard.service";
import HazardModal from "./actions/hazardModal";

const HazardLevelsList = () => {
    const { isRecoveryMode, canRestore, recoveryVisibility } = useRecovery();
    const { currentCompany, token, permissions, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedData, setSelectedData] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.products, permissions) : false;
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
            load: async () => {
                if (!currentCompany?.id || !token) return [];
                try {
                    const data = await hazardService.getAll(currentCompany.id, token);
                    return data;
                } catch (error: any) {
                    console.error('Error loading hazard classes:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar los niveles de peligro';
                    notify(errorMessage, 'error', 3000);
                    return [];
                }
            }
        });
    }, [refreshVersion, currentCompany?.id, token, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: any) => {
        try {
            const targetData = data.data || data;
            await hazardService.delete(currentCompany?.id || "", targetData.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Nivel de peligro eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting hazard class:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar el nivel de peligro";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.HAZARD_CLASS.schema, RECOVERY_ENTITIES.HAZARD_CLASS.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Nivel de peligro restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar nivel de peligro:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al restaurar el registro";
            notify(errorMessage, "error", 3000);
        }
    };

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
            visible: (e: any) => isRecoveryMode && canRestore,
        }
    ], [canModify, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'code',
                caption: 'Código',
                allowSorting: true,
            },
            {
                dataField: 'unNumber',
                caption: 'Nº UN',
                allowSorting: true,
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
            },
            {
                dataField: 'adrClass',
                caption: 'Clase ADR',
                allowSorting: true,
            },
            {
                dataField: 'packingGroup',
                caption: 'Grupo Embalaje',
                allowSorting: true,
            },
            {
                dataField: 'active',
                caption: 'Activo',
                allowSorting: true,
                visible: false,
                width: 80,
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
    }, [isRecoveryMode]);

    return (
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                    ref={gridRef}
                    gridId="hazard-classes-grid"
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
                        },
                    }}
                />
            </div>
            <HazardModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onHidden={() => setSelectedData(null)}
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

export default HazardLevelsList;

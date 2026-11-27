'use client';

import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import { useEffect, useMemo, useRef, useState } from 'react';
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import notify from "devextreme/ui/notify";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import { segregationGroupsService } from "@repo/erp-services/product_services/segregationGroups.service";
import SegregationGroupsModal from "./actions/segregationGroupsModal";

const SegregationGroupsList = () => {
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
                    const data = await segregationGroupsService.getAll(currentCompany.id, token);
                    return data;
                } catch (error: any) {
                    console.error('Error loading segregation groups:', error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : 'Error al cargar los grupos de segregación';
                    notify(errorMessage, 'error', 3000);
                    return [];
                }
            }
        });
    }, [refreshVersion, currentCompany?.id, token, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: any) => {
        try {
            const targetData = data.data || data;
            await segregationGroupsService.delete(currentCompany?.id || "", targetData.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Grupo de segregación eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting segregation group:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al eliminar el grupo de segregación";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.SEGREGATION_GROUP.schema, RECOVERY_ENTITIES.SEGREGATION_GROUP.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Grupo de segregación restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar grupo de segregación:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
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
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
            },
            {
                dataField: 'description',
                caption: 'Descripción',
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
                    gridId="segregation-groups-grid"
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
            <SegregationGroupsModal
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

export default SegregationGroupsList;

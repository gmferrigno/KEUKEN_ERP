'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo, useGridColumns, type IAccessGridColumn } from "@repo/access";
import { commonService } from "@repo/erp-services/common.service";
import { escapeHtml, escapeHtmlValue, GenericDataGrid  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import BranchCreationModal from "./components/actions/branchCreation";
import { branchesService } from "@repo/erp-services/userContext/branches.service";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'branches-grid' });

const BranchesClient = () => {
    const { isRecoveryMode, recoveryVisibility, canUseRecovery, canRestore } = useRecovery();
    const { token, user, permissions, loading, includeInactive, currentCompany, isSuperAdmin: authIsSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBranch, setSelectedBranch] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const isSuperAdmin = useMemo(() => {
        return authIsSuperAdmin || canUseRecovery;
    }, [authIsSuperAdmin, canUseRecovery]);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['branches'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyBranches, permissions) : false;
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
                    const response = await branchesService.getAll(
                        {
                            company_id: currentCompany?.id,
                            include_inactive: includeInactive,
                            limit: 500,
                        },
                        token
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading branches:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar las sucursales';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            },
            update: async (key: string, values: any) => {
                try {
                    await branchesService.update(key, values, token);
                    notify("Sucursal actualizada exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error updating branch:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar la sucursal";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            },
            remove: async (key: string) => {
                try {
                    await branchesService.delete(key, token);
                    notify("Sucursal eliminada exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error deleting branch:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la sucursal";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id, includeInactive, isRecoveryMode, recoveryVisibility]);

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.oldData, ...e.newData };
            await branchesService.update(updatedData.id, updatedData, token);
            setRefreshVersion(prev => prev + 1);
        } catch (error: any) {
            console.error("Error updating branch:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar la sucursal";
            notify(errorMessage, "error", 3000);
            e.cancel = true;
        }
    };

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e.row?.data || e;
            if (!data?.id) return;
            await branchesService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            notify("Sucursal eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting branch:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la sucursal";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.BRANCHES.schema, RECOVERY_ENTITIES.BRANCHES.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Sucursal restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar la sucursal:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al restaurar la sucursal";
            notify(errorMessage, "error", 3000);
        }
    };

    const baseColumns: IAccessGridColumn[] = useMemo(() => {
        const cols: IAccessGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'code',
                caption: 'Código',
                width: 120,
                alignment: 'center',
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
                dataField: 'companyName',
                caption: 'Empresa',
                allowSorting: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const row = options.data;
                    if (!row?.companyName && !row?.companyCode) {
                        container.innerHTML = '<span class="text-main/40">-</span>';
                        return;
                    }
                    const codeTag = row.companyCode ? `<span class="text-xs text-main/50 font-mono">(${escapeHtmlValue(row.companyCode)})</span>` : '';
                    container.innerHTML = `<span>${escapeHtmlValue(row.companyName)} ${codeTag}</span>`;
                }
            },
            {
                dataField: 'establishmentName',
                caption: 'Establecimiento',
                allowSorting: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const row = options.data;
                    if (!row?.establishmentName && !row?.establishmentCode) {
                        container.innerHTML = '<span class="text-main/40">-</span>';
                        return;
                    }
                    const codeTag = row.establishmentCode ? `<span class="text-xs text-main/50 font-mono">(${escapeHtmlValue(row.establishmentCode)})</span>` : '';
                    container.innerHTML = `<span>${escapeHtmlValue(row.establishmentName)} ${codeTag}</span>`;
                }
            },
            {
                dataField: 'logisticsCenterName',
                caption: 'Centro Logístico',
                allowSorting: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const row = options.data;
                    if (!row?.logisticsCenterName && !row?.logisticsCenterCode) {
                        container.innerHTML = '<span class="text-main/40">-</span>';
                        return;
                    }
                    const codeTag = row.logisticsCenterCode ? `<span class="text-xs text-main/50 font-mono">(${escapeHtmlValue(row.logisticsCenterCode)})</span>` : '';
                    container.innerHTML = `<span>${escapeHtmlValue(row.logisticsCenterName)} ${codeTag}</span>`;
                }
            },
            {
                dataField: 'cashRegisterName',
                caption: 'Caja Registradora',
                allowSorting: true,
                capability: 'treasury.cashRegisters.lookup',
                cellTemplate: (container: HTMLElement, options: any) => {
                    const row = options.data;
                    if (!row?.cashRegisterName) {
                        container.innerHTML = '<span class="text-main/40">-</span>';
                        return;
                    }
                    const typeTag = row.cashRegisterType ? `<span class="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-main/10 text-main/70 ml-1.5">${escapeHtmlValue(row.cashRegisterType)}</span>` : '';
                    container.innerHTML = `<span>${escapeHtmlValue(row.cashRegisterName)} ${typeTag}</span>`;
                }
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

    const columns = useGridColumns(baseColumns);

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: async (data: any) => {
                try {
                    const detail = await branchesService.getById(data.id, token);
                    setSelectedBranch(detail);
                } catch {
                    setSelectedBranch(data);
                }
                setIsModalOpen(true);
            },
            visible: (data: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "trash",
            hint: "Eliminar",
            onClick: (data: any) => handleRowRemoved(data),
            visible: (data: any) => !isRecoveryMode && canModify,
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
                        gridId="branches-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={false}
                        columns={columns}
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
                            placeholder: 'Buscar sucursales...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron sucursales"
                        selection={{ mode: 'none' }}
                        editing={{
                            allowAdding: isRecoveryMode ? false : canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedBranch(null);
                                setIsModalOpen(true);
                            }
                        }}
                        actions={actions}
                        export={{
                            enabled: true,
                            fileName: 'Sucursales',
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
                                    displayFormat: 'Total: {0} sucursales'
                                },
                            ],
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'branches-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                        onRowUpdated={handleRowUpdated}
                        onRowRemoved={handleRowRemoved}
                    />
                </div>
            </div>
            <BranchCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedBranch(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                }}
                initialData={selectedBranch}
            />
        </div>
    );
};

export default BranchesClient;

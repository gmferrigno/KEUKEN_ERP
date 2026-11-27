'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GenericDataGrid, Button, SelectBox } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { ClusterEntityType } from "@repo/api-contracts/erp";
import { IClusterStrategy } from "../strategy/types";
import { getClusterStrategy } from "../strategy/strategyResolver";
import { ClusterSummaryCard } from "./clusterSummaryCard";
import { ClusterManagerModal } from "./clusterManagerModal";
import { DeleteMembersModal } from "./deleteMembersModal";
import { ExcludeMembersModal } from "./excludeMembersModal";
import { AddMembersModal } from "./addMembersModal";

export interface GenericMembersListProps {
    strategy?: IClusterStrategy;
    entityType?: ClusterEntityType;
}

const remoteOpsConfig = { paging: true, filtering: false, sorting: false };
const pagingConfig = { enabled: true, pageSize: 50, pageSizes: [20, 50, 100] };

export const GenericMembersList: React.FC<GenericMembersListProps> = ({
    strategy: propStrategy,
    entityType = 'customer',
}) => {
    const strategy = useMemo(() => propStrategy || getClusterStrategy(entityType), [propStrategy, entityType]);
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [clusters, setClusters] = useState<any[]>([]);
    const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
    const [isClustersLoading, setIsClustersLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
    const [selectedRowsData, setSelectedRowsData] = useState<any[]>([]);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isExcludeModalOpen, setIsExcludeModalOpen] = useState(false);
    const [isExcluding, setIsExcluding] = useState(false);
    const [isIncluding, setIsIncluding] = useState(false);

    const loadClusters = useCallback(async (excludeClusterId?: string) => {
        if (!token || !currentCompany?.id) return;
        setIsClustersLoading(true);
        try {
            const items = await strategy.getAllClusters(token, currentCompany.id);
            setClusters(items);
            setSelectedClusterId(prev => {
                const targetPrev = (prev === excludeClusterId) ? null : prev;
                if (targetPrev && items.some(c => c.id === targetPrev)) return targetPrev;
                return items.length > 0 ? items[0].id : null;
            });
        } catch (error: any) {
            console.error(`Error al cargar clústeres de ${strategy.entityLabel.plural}:`, error);
            notify(`Error al cargar clústeres de ${strategy.entityLabel.plural}`, "error", 3000);
        } finally {
            setIsClustersLoading(false);
        }
    }, [token, currentCompany?.id, strategy]);

    const handleClusterDeleted = useCallback(() => {
        const deletedId = selectedClusterId;
        setSelectedClusterId(null);
        setIsEditMode(false);
        setSelectedRowKeys([]);
        setSelectedRowsData([]);
        if (gridRef.current?.clearSelection) {
            gridRef.current.clearSelection();
        }
        loadClusters(deletedId || undefined);
    }, [selectedClusterId, loadClusters]);

    useEffect(() => {
        loadClusters();
    }, [loadClusters]);

    const selectedCluster = useMemo(
        () => clusters.find(c => c.id === selectedClusterId) || null,
        [clusters, selectedClusterId]
    );

    useEffect(() => {
        if (gridRef.current?.instance?.()) {
            gridRef.current.instance().repaint();
        } else if (gridRef.current?.repaint) {
            gridRef.current.repaint();
        }
    }, [isEditMode]);

    const refreshGrid = useCallback(async () => {
        const instance = gridRef.current?.instance?.() || (typeof gridRef.current?.instance === 'function' ? gridRef.current.instance() : null);
        if (instance?.refresh) {
            await instance.refresh();
        } else if (gridRef.current?.refresh) {
            await gridRef.current.refresh();
        }
        if (instance?.repaint) {
            instance.repaint();
        }
    }, []);

    const handleConfirmExclude = useCallback(async () => {
        if (!selectedClusterId || !token || !currentCompany?.id || selectedRowsData.length === 0) return;
        const targetMembers = selectedRowsData.filter(r => !r.excluded);
        if (targetMembers.length === 0) return;

        setIsExcluding(true);
        const successfulIds: string[] = [];
        let errorCount = 0;

        for (const member of targetMembers) {
            const memberId = member[strategy.membersKeyExpr] || member.customerId || member.itemId || member.id;
            try {
                if (strategy.excludeMember) {
                    await strategy.excludeMember(
                        selectedClusterId,
                        memberId,
                        token,
                        currentCompany.id
                    );
                    successfulIds.push(memberId);
                }
            } catch (error) {
                console.error(`Error al excluir miembro ${memberId}:`, error);
                errorCount++;
            }
        }

        if (successfulIds.length > 0) {
            notify(`Se excluyeron ${successfulIds.length} registros exitosamente`, "success", 3000);
            if (gridRef.current?.deselectRows) {
                gridRef.current.deselectRows(successfulIds);
            } else if (gridRef.current?.instance?.()?.deselectRows) {
                gridRef.current.instance().deselectRows(successfulIds);
            }
            setSelectedRowKeys(prev => prev.filter(key => !successfulIds.includes(key)));
            setSelectedRowsData(prev => prev.filter(r => {
                const id = r[strategy.membersKeyExpr] || r.customerId || r.itemId || r.id;
                return !successfulIds.includes(id);
            }));
        }
        if (errorCount > 0) {
            notify(`Hubo un error al excluir ${errorCount} registros`, "error", 3000);
        }

        setIsExcludeModalOpen(false);
        await refreshGrid();
        loadClusters();
        setIsExcluding(false);
    }, [selectedClusterId, token, currentCompany?.id, selectedRowsData, strategy, refreshGrid, loadClusters]);

    const handleIncludeMembers = useCallback(async () => {
        if (!selectedClusterId || !token || !currentCompany?.id || selectedRowsData.length === 0) return;
        const targetMembers = selectedRowsData.filter(r => !!r.excluded);
        if (targetMembers.length === 0) return;

        setIsIncluding(true);
        const successfulIds: string[] = [];
        let errorCount = 0;

        for (const member of targetMembers) {
            const memberId = member[strategy.membersKeyExpr] || member.customerId || member.itemId || member.id;
            try {
                if (strategy.includeMember) {
                    await strategy.includeMember(
                        selectedClusterId,
                        memberId,
                        token,
                        currentCompany.id
                    );
                    successfulIds.push(memberId);
                }
            } catch (error) {
                console.error(`Error al re-incluir miembro ${memberId}:`, error);
                errorCount++;
            }
        }

        if (successfulIds.length > 0) {
            notify(`Se incluyeron ${successfulIds.length} registros exitosamente`, "success", 3000);
            if (gridRef.current?.deselectRows) {
                gridRef.current.deselectRows(successfulIds);
            } else if (gridRef.current?.instance?.()?.deselectRows) {
                gridRef.current.instance().deselectRows(successfulIds);
            }
            setSelectedRowKeys(prev => prev.filter(key => !successfulIds.includes(key)));
            setSelectedRowsData(prev => prev.filter(r => {
                const id = r[strategy.membersKeyExpr] || r.customerId || r.itemId || r.id;
                return !successfulIds.includes(id);
            }));
        }
        if (errorCount > 0) {
            notify(`Hubo un error al re-incluir ${errorCount} registros`, "error", 3000);
        }

        await refreshGrid();
        loadClusters();
        setIsIncluding(false);
    }, [selectedClusterId, selectedRowsData, token, currentCompany?.id, strategy, refreshGrid, loadClusters]);

    const handleExitEditMode = useCallback(() => {
        setIsEditMode(false);
        setSelectedRowKeys([]);
        setSelectedRowsData([]);
        if (gridRef.current?.clearSelection) {
            gridRef.current.clearSelection();
        }
    }, []);

    const handleToolbarPreparing = useCallback((e: any) => {
        if (isEditMode) {
            const count = selectedRowKeys.length;
            const single = strategy.entityLabel.singular;
            const plural = strategy.entityLabel.plural;
            const isExcludeAllowed = selectedCluster?.kind !== 'static';

            const excludableCount = selectedRowsData.filter(r => !r.excluded).length;
            const includableCount = selectedRowsData.filter(r => !!r.excluded).length;

            const itemsToAdd: any[] = [
                {
                    location: 'before',
                    widget: 'dxButton',
                    options: {
                        icon: 'trash',
                        text: count > 0 ? `Eliminar (${count})` : 'Eliminar',
                        hint: count > 0
                            ? `Eliminar ${count} ${count === 1 ? `${single} seleccionado` : `${plural} seleccionados`}`
                            : `Seleccione ${plural} para eliminar`,
                        type: 'danger',
                        stylingMode: 'contained',
                        elementAttr: { class: '!text-variant [&_.dx-icon]:!text-variant' },
                        disabled: count === 0 || isDeleting || isExcluding || isIncluding,
                        onClick: () => setIsDeleteModalOpen(true)
                    }
                }
            ];

            if (isExcludeAllowed) {
                itemsToAdd.push(
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            icon: 'clear',
                            text: excludableCount > 0 ? `Excluir (${excludableCount})` : 'Excluir',
                            hint: excludableCount > 0
                                ? `Excluir ${excludableCount} ${excludableCount === 1 ? `${single} activo seleccionado` : `${plural} activos seleccionados`}`
                                : `Seleccione ${plural} no excluidos para excluir`,
                            type: 'default',
                            stylingMode: 'outlined',
                            disabled: excludableCount === 0 || isDeleting || isExcluding || isIncluding,
                            onClick: () => setIsExcludeModalOpen(true)
                        }
                    },
                    {
                        location: 'before',
                        widget: 'dxButton',
                        options: {
                            icon: 'check',
                            text: includableCount > 0 ? `Incluir (${includableCount})` : 'Incluir',
                            hint: includableCount > 0
                                ? `Incluir ${includableCount} ${includableCount === 1 ? `${single} excluido seleccionado` : `${plural} excluidos seleccionados`}`
                                : `Seleccione ${plural} excluidos para incluir`,
                            type: 'default',
                            stylingMode: 'outlined',
                            disabled: includableCount === 0 || isDeleting || isExcluding || isIncluding,
                            onClick: handleIncludeMembers
                        }
                    }
                );
            }

            itemsToAdd.push({
                location: 'before',
                widget: 'dxButton',
                options: {
                    icon: 'close',
                    text: 'Finalizar Edición',
                    hint: 'Salir del modo edición (se ignorará la selección)',
                    type: 'normal',
                    stylingMode: 'outlined',
                    disabled: isDeleting || isExcluding || isIncluding,
                    onClick: handleExitEditMode
                }
            });

            e.toolbarOptions.items.unshift(...itemsToAdd);
        } else {
            e.toolbarOptions.items.unshift(
                {
                    location: 'before',
                    widget: 'dxButton',
                    options: {
                        icon: 'plus',
                        text: 'Añadir',
                        hint: `Añadir ${strategy.entityLabel.plural} al clúster`,
                        type: 'default',
                        stylingMode: 'contained',
                        elementAttr: { class: '!bg-focus-300 !text-variant [&_.dx-icon]:!text-variant shadow-sm' },
                        onClick: () => setIsAddModalOpen(true)
                    }
                },
                {
                    location: 'before',
                    widget: 'dxButton',
                    options: {
                        icon: 'edit',
                        text: 'Miembros',
                        hint: 'Activar modo eliminar para gestionar miembros',
                        type: 'default',
                        stylingMode: 'outlined',
                        onClick: () => setIsEditMode(true)
                    }
                }
            );
        }
    }, [isEditMode, selectedRowKeys.length, selectedRowsData, isDeleting, isExcluding, isIncluding, handleExitEditMode, handleIncludeMembers, strategy, selectedCluster?.kind]);

    const handleConfirmDelete = useCallback(async () => {
        if (!selectedClusterId || !token || !currentCompany?.id || selectedRowKeys.length === 0) return;
        setIsDeleting(true);
        const count = selectedRowKeys.length;

        try {
            if (strategy.removeMembers) {
                await strategy.removeMembers(
                    selectedClusterId,
                    selectedRowKeys,
                    token,
                    currentCompany.id
                );
            } else {
                for (const memberId of selectedRowKeys) {
                    await strategy.removeMember(
                        selectedClusterId,
                        memberId,
                        token,
                        currentCompany.id
                    );
                }
            }

            notify(
                `${count} ${count === 1 ? strategy.entityLabel.singular : strategy.entityLabel.plural} ${count === 1 ? 'eliminado' : 'eliminados'} del clúster`,
                "success",
                3000
            );

            setSelectedRowKeys([]);
            setSelectedRowsData([]);
            if (gridRef.current?.clearSelection) {
                gridRef.current.clearSelection();
            }
            await refreshGrid();
            loadClusters();
        } catch (error: any) {
            console.error("Error al eliminar miembros:", error);
            const msg = error instanceof Error && error.message ? error.message : `No se pudieron eliminar los ${strategy.entityLabel.plural}`;
            notify(msg, "error", 3000);
        } finally {
            setIsDeleting(false);
            setIsDeleteModalOpen(false);
        }
    }, [selectedClusterId, token, currentCompany?.id, selectedRowKeys, loadClusters, strategy, refreshGrid]);

    const handleRowPrepared = useCallback((e: any) => {
        if (e.rowType === 'data') {
            if (e.data?.excluded) {
                e.rowElement.classList.add('dx-row-excluded');
            } else {
                e.rowElement.classList.remove('dx-row-excluded');
            }
        }
    }, []);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: strategy.membersKeyExpr,
            load: async (loadOptions) => {
                if (!selectedClusterId || !currentCompany?.id || !token) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const limit = loadOptions.take || 50;
                    const offset = loadOptions.skip || 0;

                    const isExcludeAllowed = selectedCluster?.kind !== 'static';

                    const response = await strategy.getMembers(
                        selectedClusterId,
                        limit,
                        offset,
                        token,
                        currentCompany.id,
                        isExcludeAllowed ? 'all' : undefined
                    );

                    return {
                        data: response.items || [],
                        totalCount: response.metadata?.totalItems ?? 0,
                    };
                } catch (error: any) {
                    console.error(`Error loading ${strategy.entityLabel.plural} cluster members:`, error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar miembros del grupo";
                    notify(errorMessage, "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [selectedClusterId, selectedCluster?.kind, token, currentCompany?.id, strategy]);

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="mb-1.5 w-full flex items-center justify-between gap-2">
                    <div className="flex-1">
                        <SelectBox
                            dataSource={clusters}
                            valueExpr="id"
                            displayExpr={(item: any) => item ? `${item.name} (${item.code})` : ""}
                            value={selectedClusterId}
                            onValueChanged={(e) => {
                                setIsEditMode(false);
                                setSelectedRowKeys([]);
                                setSelectedRowsData([]);
                                if (gridRef.current?.clearSelection) {
                                    gridRef.current.clearSelection();
                                }
                                setSelectedClusterId(e.value);
                            }}
                            placeholder={isClustersLoading ? "Cargando clústeres..." : `Seleccione un ${strategy.clusterEntityLabel.toLowerCase()}...`}
                            disabled={isClustersLoading}
                            searchEnabled={true}
                            showClearButton={true}
                            stylingMode="filled"
                            elementAttr={{ class: "rounded-dx" }}
                        />
                    </div>
                    <Button
                        text="Crear Clúster"
                        icon="plus"
                        type="default"
                        stylingMode="contained"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="!bg-focus-300 !text-variant shadow-sm"
                    />
                </div>


                <div className="w-full flex-1 min-h-0 flex flex-col gap-1.5">
                    {selectedCluster ? (
                        <>
                            <ClusterSummaryCard
                                clusterId={selectedCluster.id}
                                entityType={strategy.entityType}
                                cluster={selectedCluster}
                                onRefreshed={() => {
                                    refreshGrid();
                                    loadClusters();
                                }}
                                onDeleted={handleClusterDeleted}
                            />
                            <div className="flex-1 min-h-0 w-full">
                                <GenericDataGrid
                                    ref={gridRef}
                                    gridId={`audiences-${strategy.entityType}-members-grid`}
                                    keyExpr={strategy.membersKeyExpr}
                                    dataSource={dataSource}
                                    remoteOperations={remoteOpsConfig}
                                    columns={strategy.membersColumns}
                                    allowColumnReordering={true}
                                    allowColumnResizing={true}
                                    showBorders={true}
                                    rowAlternationEnabled={true}
                                    hoverStateEnabled={true}
                                    paging={pagingConfig}
                                    selection={isEditMode ? {
                                        mode: 'multiple',
                                        selectAllMode: 'page',
                                        showCheckBoxesMode: 'always'
                                    } : undefined}
                                    onSelectionChanged={(e) => {
                                        if (isEditMode) {
                                            setSelectedRowKeys(e.selectedRowKeys || []);
                                            setSelectedRowsData(e.selectedRowsData || []);
                                        }
                                    }}
                                    onToolbarPreparing={handleToolbarPreparing}
                                    onRowPrepared={handleRowPrepared}
                                    export={{
                                        enabled: true,
                                        fileName: strategy.membersExportFileName,
                                        allowExportSelectedData: true,
                                        formats: ['xlsx']
                                    }}
                                    height="100%"
                                />
                            </div>
                        </>
                    ) : (
                        <GenericEmpty
                            title="Sin clúster seleccionado"
                            description={strategy.emptySelectDescription}
                        />
                    )}
                </div>
            </div>

            <ClusterManagerModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                entityType={strategy.entityType}
                selectedIds={[]}
                onSuccess={() => {
                    loadClusters();
                }}
            />

            <DeleteMembersModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                    if (!isDeleting) setIsDeleteModalOpen(false);
                }}
                onConfirm={handleConfirmDelete}
                count={selectedRowKeys.length}
                entityType={strategy.entityType}
                isDeleting={isDeleting}
            />

            <ExcludeMembersModal
                isOpen={isExcludeModalOpen}
                onClose={() => {
                    if (!isExcluding) setIsExcludeModalOpen(false);
                }}
                onConfirm={handleConfirmExclude}
                count={selectedRowsData.filter(r => !r.excluded).length}
                entityType={strategy.entityType}
                isExcluding={isExcluding}
            />

            {selectedClusterId && (
                <AddMembersModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    clusterId={selectedClusterId}
                    strategy={strategy}
                    onSuccess={() => {
                        refreshGrid();
                        loadClusters();
                    }}
                />
            )}
        </div>
    );
};

export default GenericMembersList;

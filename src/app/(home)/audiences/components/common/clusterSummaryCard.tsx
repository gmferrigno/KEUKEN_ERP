'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { Button } from '@repo/devextreme';
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { IFClusterSummary } from "@repo/api-contracts/erp";
import { formatDate, formatPrice } from "@/app/lib/utils/prittier";
import { ClusterEntityType } from "@repo/api-contracts/erp";
import { getClusterStrategy } from "../strategy/strategyResolver";
import { ClusterDetailModal } from "./clusterDetailModal";
import { DeleteClusterModal } from "./deleteClusterModal";

import { CLUSTER_KIND_LABELS, REFRESH_MODE_LABELS } from "@/app/lib/constants/audiences.constants";

export interface IClusterCardData {
    id: string;
    code?: string;
    name?: string;
    kind?: string;
    refreshMode?: string;
    active?: boolean;
    description?: string | null;
    memberCount?: number;
    excludedCount?: number;
    refreshedAt?: string | null;
    createdAt?: string | null;
    deletedAt?: string | null;
}

export interface ClusterSummaryCardProps {
    clusterId: string;
    entityType: ClusterEntityType;
    cluster?: IClusterCardData | null;
    memberCount?: number;
    excludedCount?: number;
    refreshedAt?: string | null;
    onRefreshed?: () => void;
    onDeleted?: () => void;
}

export const ClusterSummaryCard: React.FC<ClusterSummaryCardProps> = ({
    clusterId,
    entityType,
    cluster,
    memberCount: initialMemberCount,
    excludedCount: initialExcludedCount,
    refreshedAt: initialRefreshedAt,
    onRefreshed,
    onDeleted,
}) => {
    const { token, currentCompany } = useAuth();
    const strategy = useMemo(() => getClusterStrategy(entityType), [entityType]);
    const [summary, setSummary] = useState<IFClusterSummary | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);

    const [isViewOpen, setIsViewOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [isDeleteOpen, setIsDeleteOpen] = useState(false);

    const loadSummary = async () => {
        if (!strategy.supportsSummary || !strategy.getSummary || !token || !currentCompany?.id || !clusterId) {
            return;
        }
        setIsLoadingSummary(true);
        try {
            const data = await strategy.getSummary(clusterId, 90, currentCompany.id, token);
            setSummary(data);
        } catch (err) {
            console.error("Error al cargar resumen del clúster:", err);
        } finally {
            setIsLoadingSummary(false);
        }
    };

    useEffect(() => {
        loadSummary();
    }, [clusterId, strategy, token, currentCompany?.id, cluster?.memberCount]);

    const isStaticCluster = cluster?.kind === 'static';

    const handleRefresh = async () => {
        if (!clusterId || !token || isStaticCluster) return;
        setIsRefreshing(true);
        try {
            const res = await strategy.refreshCluster(clusterId, token, currentCompany?.id);
            notify(`Clúster recalculado exitosamente: ${res.memberCount} miembros actualizados`, "success", 3000);
            if (onRefreshed) {
                onRefreshed();
            }
            loadSummary();
        } catch (error: any) {
            console.error("Error al recalcular clúster:", error);
            const msg = error instanceof Error && error.message ? error.message : "Error al recalcular el clúster";
            notify(msg, "error", 3000);
        } finally {
            setIsRefreshing(false);
        }
    };

    const formattedSales = formatPrice(summary?.salesAmount) || "$ 0,00";

    const effectiveMemberCount = cluster?.memberCount ?? initialMemberCount ?? 0;
    const effectiveExcludedCount = cluster?.excludedCount ?? initialExcludedCount ?? 0;
    const effectiveRefreshedAt = cluster?.refreshedAt || initialRefreshedAt;
    const kindText = cluster?.kind ? (CLUSTER_KIND_LABELS[cluster.kind] || cluster.kind) : null;

    return (
        <div className="flex flex-col gap-2 p-2.5 bg-main/5 border border-main/10 rounded-dx font-sans text-xs shadow-sm">

            <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">

                    {cluster?.active !== undefined && (
                        <span
                            title={cluster.active ? 'Activa' : 'Inactiva'}
                            className={`w-2 h-2 rounded-full ${cluster.active ? 'bg-green-400' : 'bg-red-400'}`}
                        />
                    )}


                    {kindText && (
                        <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-focus-300/15 text-focus-300 border border-focus-300/30">
                            {kindText}
                        </span>
                    )}


                    {cluster?.refreshMode && (
                        <span className="px-2 py-0.5 text-[11px] font-medium rounded bg-focus-300/10 text-focus-300 border border-focus-300/20">
                            Modo: {REFRESH_MODE_LABELS[cluster.refreshMode] || cluster.refreshMode}
                        </span>
                    )}


                    {cluster?.code && (
                        <span className="text-xs font-mono font-bold text-focus-300 bg-focus-300/10 px-2 py-0.5 rounded border border-focus-300/25">
                            {cluster.code}
                        </span>
                    )}


                    {cluster?.description && (
                        <span className="text-[11px] text-main/60 italic truncate max-w-xs md:max-w-md" title={cluster.description}>
                            "{cluster.description}"
                        </span>
                    )}
                </div>


                <div className="flex items-center gap-0.5">

                    <Button
                        icon="eyeopen"
                        hint="Ver Detalle del Clúster"
                        onClick={() => setIsViewOpen(true)}
                        stylingMode="text"
                        className="!bg-transparent"
                    />


                    <Button
                        icon="edit"
                        hint="Editar Clúster"
                        onClick={() => setIsEditOpen(true)}
                        stylingMode="text"
                        className="!bg-transparent"
                    />


                    <Button
                        icon="trash"
                        hint="Eliminar Clúster"
                        onClick={() => setIsDeleteOpen(true)}
                        stylingMode="text"
                        className="!bg-transparent"
                    />


                    {!isStaticCluster && (
                        <Button
                            icon="refresh"
                            text="Recalcular Clúster"
                            hint="Recalcular Miembros"
                            onClick={handleRefresh}
                            disabled={isRefreshing || isStaticCluster}
                            stylingMode="text"
                            className="!bg-transparent"
                        />
                    )}
                </div>
            </div>


            <div className="flex flex-wrap items-center gap-3 md:gap-4 pt-1.5 border-t border-main/10 text-xs">

                <div className="flex items-center gap-1.5">
                    <i className="dx-icon-group text-focus-300 text-sm" />
                    <span className="text-main/70">Miembros:</span>
                    <span className="font-bold text-main">{effectiveMemberCount}</span>
                </div>

                <div className="h-3 w-px bg-main/15 hidden md:block" />


                <div className="flex items-center gap-1.5">
                    <i className="dx-icon-clear text-focus-300 text-sm" />
                    <span className="text-main/70">Excluidos:</span>
                    <span className="font-bold text-main">{effectiveExcludedCount}</span>
                </div>

                {strategy.supportsSummary && (
                    <>
                        <div className="h-3 w-px bg-main/15 hidden md:block" />


                        <div className="flex items-center gap-1.5">
                            <i className="dx-icon-money text-focus-300 text-sm" />
                            <span className="text-main/70">Ventas (90d):</span>
                            <span className="font-bold text-focus-300">
                                {isLoadingSummary ? "..." : formattedSales}
                            </span>
                        </div>

                        <div className="h-3 w-px bg-main/15 hidden md:block" />


                        <div className="flex items-center gap-1.5">
                            <i className="dx-icon-cart text-focus-300 text-sm" />
                            <span className="text-main/70">Pedidos (90d):</span>
                            <span className="font-bold text-main">
                                {isLoadingSummary ? "..." : (summary?.orderCount ?? 0)}
                            </span>
                        </div>
                    </>
                )}

                <div className="h-3 w-px bg-main/15 hidden md:block" />


                <div className="flex items-center gap-1.5 text-[11px] text-main/60">
                    <i className="dx-icon-clock text-main/50 text-xs" />
                    <span>Refresco:</span>
                    <span className="font-medium text-main/80">
                        {formatDate(effectiveRefreshedAt) || '-:-'}
                    </span>
                </div>


                {cluster?.createdAt && (
                    <>
                        <div className="h-3 w-px bg-main/15 hidden md:block" />
                        <div className="flex items-center gap-1.5 text-[11px] text-main/60">
                            <i className="dx-icon-event text-main/50 text-xs" />
                            <span>Creada:</span>
                            <span className="font-medium text-main/80">
                                {formatDate(cluster.createdAt)}
                            </span>
                        </div>
                    </>
                )}
            </div>


            <ClusterDetailModal
                isOpen={isViewOpen}
                onClose={() => setIsViewOpen(false)}
                clusterId={clusterId}
                entityType={entityType}
                cluster={cluster}
                mode="view"
            />


            <ClusterDetailModal
                isOpen={isEditOpen}
                onClose={() => setIsEditOpen(false)}
                onSuccess={() => {
                    if (onRefreshed) onRefreshed();
                    loadSummary();
                }}
                clusterId={clusterId}
                entityType={entityType}
                cluster={cluster}
                mode="edit"
            />

            <DeleteClusterModal
                isOpen={isDeleteOpen}
                onClose={() => setIsDeleteOpen(false)}
                onSuccess={() => {
                    if (onDeleted) {
                        onDeleted();
                    } else if (onRefreshed) {
                        onRefreshed();
                    }
                }}
                clusterId={clusterId}
                entityType={entityType}
                cluster={cluster}
            />
        </div>
    );
};

export default ClusterSummaryCard;

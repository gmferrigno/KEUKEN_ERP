'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { useAuth } from "@/contexts/AuthContext";
import { formatDate } from "@/app/lib/utils/prittier";
import { ClusterEntityType } from "@repo/api-contracts/erp";
import { getClusterStrategy } from "../strategy/strategyResolver";
import { ClusterRuleBuilder } from "./clusterRuleBuilder";
import { IClusterCardData } from './clusterSummaryCard';


export interface ViewClusterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    clusterId: string;
    entityType: ClusterEntityType;
    cluster?: IClusterCardData | null;
}

const kindLabels: Record<string, string> = {
    static: 'Estática',
    dynamic: 'Dinámica',
    hybrid: 'Híbrida',
};

const refreshModeLabels: Record<string, string> = {
    manual: 'Manual',
    scheduled: 'Programada',
    on_read: 'Al consultar',
};

export const ViewClusterModal: React.FC<ViewClusterModalProps> = ({
    isOpen,
    onClose,
    onHidden,
    clusterId,
    entityType,
    cluster: initialCluster,
}) => {
    const { token, currentCompany } = useAuth();
    const strategy = useMemo(() => getClusterStrategy(entityType), [entityType]);
    const [clusterData, setClusterData] = useState<any>(initialCluster || null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (!isOpen || !clusterId || !token) return;

        let isMounted = true;
        const loadDetails = async () => {
            setIsLoading(true);
            try {
                const data = await strategy.getById(clusterId, token, currentCompany?.id);
                if (isMounted) {
                    setClusterData(data);
                }
            } catch (err) {
                console.error("Error al cargar detalle de la audiencia:", err);
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        };

        loadDetails();

        return () => {
            isMounted = false;
        };
    }, [isOpen, clusterId, token, currentCompany?.id, strategy]);

    const handleHidden = useCallback(() => {
        setClusterData(initialCluster || null);
        setIsLoading(false);
        if (onHidden) {
            onHidden();
        }
    }, [initialCluster, onHidden]);

    const activeCluster = clusterData || initialCluster;
    const hasRules = Boolean(activeCluster?.ruleSet && (activeCluster?.kind === 'dynamic' || activeCluster?.kind === 'hybrid'));

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={`Detalle de ${strategy.clusterEntityLabel}`}
            width={hasRules ? 740 : 540}
            height="auto"
            maxHeight="90vh"
            className="custom-popup"
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="flex flex-col gap-4 p-4 max-h-[75vh] overflow-y-auto font-sans text-xs">
                {isLoading && !activeCluster ? (
                    <div className="flex items-center justify-center py-10 text-main/60">
                        <i className="dx-icon-refresh dx-icon-spin mr-2" /> Cargando información...
                    </div>
                ) : activeCluster ? (
                    <>

                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-main/5 border border-main/10 rounded-dx">
                            <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-main">
                                    {activeCluster.name}
                                </span>
                                {activeCluster.code && (
                                    <span className="font-mono text-xs font-bold text-focus-300 bg-focus-300/10 px-2 py-0.5 rounded border border-focus-300/25">
                                        {activeCluster.code}
                                    </span>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                {activeCluster.kind && (
                                    <span className="px-2 py-0.5 text-[11px] font-bold rounded bg-focus-300/15 text-focus-300 border border-focus-300/30">
                                        {kindLabels[activeCluster.kind] || activeCluster.kind}
                                    </span>
                                )}
                                {activeCluster.active !== undefined && (
                                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium rounded ${activeCluster.active ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full ${activeCluster.active ? 'bg-green-400' : 'bg-red-400'}`} />
                                        {activeCluster.active ? 'Activa' : 'Inactiva'}
                                    </span>
                                )}
                            </div>
                        </div>


                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <div className="p-2.5 bg-main/5 border border-main/10 rounded-dx flex flex-col">
                                <span className="text-[11px] text-main/60">Modo de Actualización</span>
                                <span className="font-semibold text-main mt-0.5">
                                    {refreshModeLabels[activeCluster.refreshMode] || activeCluster.refreshMode || 'Manual'}
                                </span>
                            </div>

                            <div className="p-2.5 bg-main/5 border border-main/10 rounded-dx flex flex-col">
                                <span className="text-[11px] text-main/60">Total de Miembros</span>
                                <span className="font-bold text-focus-300 text-sm mt-0.5">
                                    {activeCluster.memberCount ?? 0}
                                </span>
                            </div>

                            <div className="p-2.5 bg-main/5 border border-main/10 rounded-dx flex flex-col">
                                <span className="text-[11px] text-main/60">Fecha de Creación</span>
                                <span className="font-medium text-main mt-0.5">
                                    {formatDate(activeCluster.createdAt) || 'No registrada'}
                                </span>
                            </div>

                            <div className="p-2.5 bg-main/5 border border-main/10 rounded-dx flex flex-col col-span-2 md:col-span-3">
                                <span className="text-[11px] text-main/60">Último Refresco / Recálculo</span>
                                <span className="font-medium text-main mt-0.5">
                                    {formatDate(activeCluster.refreshedAt) || 'Pendiente de cálculo'}
                                </span>
                            </div>

                            {activeCluster.description && (
                                <div className="p-2.5 bg-main/5 border border-main/10 rounded-dx flex flex-col col-span-2 md:col-span-3">
                                    <span className="text-[11px] text-main/60">Descripción</span>
                                    <span className="text-main/90 mt-0.5 italic">
                                        "{activeCluster.description}"
                                    </span>
                                </div>
                            )}
                        </div>


                        {hasRules && (
                            <div className="border-t border-main/10 pt-3 flex flex-col gap-2">
                                <h5 className="font-bold text-xs text-main">Reglas y Condiciones Configuradas:</h5>
                                <ClusterRuleBuilder
                                    entityType={entityType}
                                    value={activeCluster.ruleSet}
                                    onChange={() => { }}
                                    disabled={true}
                                    companyId={currentCompany?.id}
                                    token={token}
                                />
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-6 text-main/60">
                        No se pudo cargar la información de la audiencia.
                    </div>
                )}
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cerrar"
                    onClick={onClose}
                    stylingMode="contained"
                    className="!bg-focus-300 !text-variant !text-xs !py-1.5"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default ViewClusterModal;

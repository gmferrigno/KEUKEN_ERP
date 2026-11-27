'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, GenericDataGrid } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { ClusterEntityType } from "@repo/api-contracts/erp";
import { IClusterStrategy } from "../strategy/types";
import { getClusterStrategy } from "../strategy/strategyResolver";

export interface AddMembersModalProps {
    isOpen: boolean;
    onClose: () => void;
    onHidden?: () => void;
    onSuccess?: () => void;
    clusterId: string;
    strategy?: IClusterStrategy;
    entityType?: ClusterEntityType;
}

const remoteOpsConfig = { paging: true, filtering: false, sorting: false };
const pagingConfig = { enabled: true, pageSize: 20, pageSizes: [10, 20, 50] };

export const AddMembersModal: React.FC<AddMembersModalProps> = ({
    isOpen,
    onClose,
    onHidden,
    onSuccess,
    clusterId,
    strategy: propStrategy,
    entityType = 'customer',
}) => {
    const { token, currentCompany } = useAuth();
    const strategy = useMemo(() => propStrategy || getClusterStrategy(entityType), [propStrategy, entityType]);
    const gridRef = useRef<any>(null);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [gridKey, setGridKey] = useState(0);

    useEffect(() => {
        if (isOpen) {
            setGridKey(prev => prev + 1);
            setSelectedIds([]);
            setIsSubmitting(false);
        }
    }, [isOpen]);

    const handleHidden = useCallback(() => {
        setSelectedIds([]);
        setIsSubmitting(false);
        if (onHidden) {
            onHidden();
        }
    }, [onHidden]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                if (!token || !currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const limit = loadOptions.take || 20;
                    const offset = loadOptions.skip || 0;
                    return await strategy.loadAvailableMembers(limit, offset, token, currentCompany.id);
                } catch (error: any) {
                    console.error("Error loading available members:", error);
                    const msg = error instanceof Error && error.message ? error.message : "Error al cargar los registros";
                    notify(msg, "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
            byKey: async (key: any) => {
                return { id: key };
            }
        });
    }, [strategy, token, currentCompany?.id]);

    const handleConfirm = async () => {
        if (!clusterId || !token || !currentCompany?.id || selectedIds.length === 0) return;

        setIsSubmitting(true);
        try {
            const res = await strategy.addMembers(
                clusterId,
                selectedIds,
                token,
                currentCompany.id
            );
            notify(res?.detail || `${strategy.entityLabel.plural} añadidos al clúster con éxito`, "success", 3000);

            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (error: any) {
            console.error("Error al añadir miembros al clúster:", error);
            const msg = error instanceof Error && error.message ? error.message : "Error al añadir miembros al clúster";
            notify(msg, "error", 3000);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={!isSubmitting}
            showCloseButton={!isSubmitting}
            showTitle={true}
            title={strategy.addMembersTitle}
            width={780}
            height={530}
            className="custom-popup"
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="flex flex-col w-full h-[400px] p-2 overflow-hidden font-sans">
                <GenericDataGrid
                    key={`grid-${gridKey}`}
                    ref={gridRef}
                    gridId={strategy.addMembersGridId}
                    keyExpr="id"
                    dataSource={dataSource}
                    remoteOperations={remoteOpsConfig}
                    columns={strategy.addMembersColumns}
                    sorting={{ mode: 'none' }}
                    searchPanel={{
                        visible: true,
                        width: 250,
                        placeholder: strategy.addMembersSearchPlaceholder,
                        highlightSearchText: true,
                    }}
                    selection={{
                        mode: 'multiple',
                        selectAllMode: 'page',
                        showCheckBoxesMode: 'always'
                    }}
                    onSelectionChanged={(e) => {
                        setSelectedIds(e.selectedRowKeys || []);
                    }}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={pagingConfig}
                    height="100%"
                />
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={isSubmitting}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    type="default"
                    text={isSubmitting ? "Añadiendo..." : (selectedIds.length > 0 ? `Añadir (${selectedIds.length})` : "Añadir")}
                    stylingMode="contained"
                    onClick={handleConfirm}
                    disabled={isSubmitting || selectedIds.length === 0}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default AddMembersModal;

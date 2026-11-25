"use client";

import { canDo } from "@repo/access";
import { priceSegmentsService } from "@repo/erp-services/priceLists/priceSegments.service";
import { GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from "devextreme-react/check-box";
import notify from "devextreme/ui/notify";
import { useMemo, useRef, useState } from "react";
import type { IFPriceSegment } from "@repo/api-contracts/erp";
import { mapCommercialCatalogError } from "@repo/erp-api-client";
import PriceSegmentModal from "./components/actions/priceSegmentModal";

const { customLoad, customSave } = createGridStateStorage({
    gridId: "price-segments-grid",
});

const PriceSegmentsClient = () => {
    const {
        token,
        permissions,
        loading,
        currentCompany,
        includeInactive,
        isSuperAdmin,
    } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IFPriceSegment | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [allSegments, setAllSegments] = useState<IFPriceSegment[]>([]);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions
            ? canDo("view", ["commercialPriceLists"], permissions)
            : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions
            ? canDo("modify", ["commercialPriceLists"], permissions)
            : false;
    }, [permissions, isSuperAdmin]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions) => {
                try {
                    const response = await priceSegmentsService.getAll(
                        {
                            limit: loadOptions.take || 50,
                            offset: loadOptions.skip || 0,
                            companyId: currentCompany?.id,
                            active: includeInactive ? undefined : true,
                        },
                        token!
                    );
                    setAllSegments(response.items);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch (error) {
                    console.error("Error loading price segments:", error);
                    notify(
                        error instanceof Error
                            ? error.message
                            : "Error al cargar los segmentos de precio",
                        "error",
                        3000
                    );
                    return { data: [], totalCount: 0 };
                }
            },
        });
    }, [refreshVersion, token, currentCompany?.id, includeInactive]);

    const handleRowRemoved = async (data: IFPriceSegment) => {
        try {
            await priceSegmentsService.delete(data.id, token!, currentCompany?.id);
            setRefreshVersion((prev) => prev + 1);
            gridRef.current?.instance?.refresh?.() ?? gridRef.current?.refresh?.();
            notify("Segmento de precio eliminado exitosamente", "success", 3000);
        } catch (error) {
            console.error("Error deleting price segment:", error);
            notify(mapCommercialCatalogError(error), "error", 4500);
        }
    };

    const actions = useMemo(
        () => [
            {
                icon: "edit",
                hint: "Editar",
                onClick: (data: IFPriceSegment) => {
                    setSelectedItem(data);
                    setIsModalOpen(true);
                },
                visible: () => canModify,
            },
            {
                icon: "trash",
                hint: "Eliminar",
                onClick: (data: IFPriceSegment) => handleRowRemoved(data),
                visible: (e: IFPriceSegment) => e.active && canModify,
            },
        ],
        [canModify, token, currentCompany?.id]
    );

    const columns: IGenericDataGridColumn[] = useMemo(
        () => [
            { dataField: "id", caption: "ID", visible: false },
            { dataField: "code", caption: "Código", allowSorting: true, width: 180 },
            { dataField: "name", caption: "Nombre", allowSorting: true },
            {
                dataField: "parentId",
                caption: "Padre",
                calculateDisplayValue: (row: IFPriceSegment) => {
                    if (!row.parentId) return "—";
                    const parent = allSegments.find((s) => s.id === row.parentId);
                    return parent?.name || row.parentId;
                },
            },
            {
                dataField: "active",
                caption: "Activo",
                width: 100,
                alignment: "center",
                visible: includeInactive,
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                ),
            },
        ],
        [includeInactive, allSegments]
    );

    if (loading) return null;

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose !text-[200px] !text-focus-500/20" />
                <p className="text-2xl font-bold text-main/60">
                    No tienes permiso para acceder a esta página
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full rounded-dx">
            <GenericDataGrid
                ref={gridRef}
                gridId="price-segments-grid"
                keyExpr="id"
                dataSource={dataSource}
                remoteOperations={true}
                columns={columns}
                actions={actions}
                editing={{
                    allowAdding: canModify,
                    allowUpdating: false,
                    allowDeleting: false,
                    useIcons: true,
                    onAdd: () => {
                        setSelectedItem(null);
                        setIsModalOpen(true);
                    },
                }}
                noDataText="No se encontraron segmentos de precio"
                stateStoring={{
                    enabled: true,
                    type: "custom",
                    storageKey: "price-segments-grid",
                    customLoad,
                    customSave,
                }}
            />
            <PriceSegmentModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onHidden={() => setSelectedItem(null)}
                onSuccess={() => {
                    setRefreshVersion((prev) => prev + 1);
                    gridRef.current?.instance?.refresh?.() ??
                        gridRef.current?.refresh?.();
                }}
                initialData={selectedItem}
                parentOptions={allSegments}
            />
        </div>
    );
};

export default PriceSegmentsClient;

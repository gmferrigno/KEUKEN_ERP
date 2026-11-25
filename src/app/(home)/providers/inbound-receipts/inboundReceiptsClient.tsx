"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useMemo, useRef, useState } from "react";
import { GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { inboundReceiptsService } from "@repo/erp-services/procurement/inboundReceipts.service";
import { IFInboundReceipt } from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";
import InboundReceiptModal from "./components/inboundReceiptModal";
import InboundReceiptDetailModal from "./components/inboundReceiptDetailModal";

const { customLoad, customSave } = createGridStateStorage({
    gridId: "inbound-receipts-grid",
});

const STATE_LOOKUP = [
    { value: "draft", label: "Borrador" },
    { value: "confirmed", label: "Confirmada" },
    { value: "cancelled", label: "Anulada" },
];

const mapInboundError = (error: unknown, fallback: string) => {
    if (error instanceof ApiError) {
        if (error.code === "PO_REQUIRED_BY_POLICY") return "La política exige orden de compra";
        if (error.code === "QUANTITY_EXCEEDS_PO") return "La cantidad supera lo pendiente de la OC";
        if (error.code === "INVALID_STATE_TRANSITION") return "Transición de estado inválida";
        if (error.code === "COST_REQUIRED") return "Costo y moneda son requeridos sin OC";
        if (error.message) return error.message;
    }
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const InboundReceiptsClient = () => {
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selected, setSelected] = useState<IFInboundReceipt | null>(null);

    const handleRefreshGrid = useCallback(() => {
        gridRef.current?.refresh?.() ?? gridRef.current?.instance?.()?.refresh?.();
    }, []);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions: any) => {
                if (!token || !currentCompany?.id) return { data: [], totalCount: 0 };
                try {
                    const response = await inboundReceiptsService.getAll(
                        {
                            companyId: currentCompany.id,
                            limit: loadOptions.take || 20,
                            offset: loadOptions.skip || 0,
                        },
                        token
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch (error) {
                    notify(mapInboundError(error, "Error al cargar recepciones"), "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
        });
    }, [token, currentCompany?.id]);

    const handleConfirm = async (row: IFInboundReceipt) => {
        if (!token || !currentCompany?.id) return;
        try {
            await inboundReceiptsService.confirm(row.id, token, currentCompany.id);
            notify("Recepción confirmada", "success", 2500);
            handleRefreshGrid();
        } catch (error) {
            notify(mapInboundError(error, "No se pudo confirmar"), "error", 4000);
        }
    };

    const handleCancel = async (row: IFInboundReceipt) => {
        if (!token || !currentCompany?.id) return;
        try {
            await inboundReceiptsService.cancel(row.id, token, currentCompany.id);
            notify("Recepción anulada", "success", 2500);
            handleRefreshGrid();
        } catch (error) {
            notify(mapInboundError(error, "No se pudo anular"), "error", 4000);
        }
    };

    const columns: IGenericDataGridColumn[] = useMemo(
        () => [
            { dataField: "id", caption: "ID", visible: false },
            {
                dataField: "supplierName",
                caption: "Proveedor",
                calculateCellValue: (row: IFInboundReceipt) =>
                    row.supplierName || row.supplierId,
            },
            {
                dataField: "warehouseName",
                caption: "Depósito",
                calculateCellValue: (row: IFInboundReceipt) =>
                    row.warehouseName || row.warehouseId,
            },
            {
                dataField: "purchaseOrderId",
                caption: "OC",
                calculateCellValue: (row: IFInboundReceipt) => row.purchaseOrderId || "—",
            },
            {
                dataField: "state",
                caption: "Estado",
                lookup: {
                    dataSource: STATE_LOOKUP,
                    valueExpr: "value",
                    displayExpr: "label",
                },
            },
            {
                dataField: "lines",
                caption: "Líneas",
                calculateCellValue: (row: IFInboundReceipt) => row.lines?.length ?? 0,
                allowFiltering: false,
            },
            { dataField: "createdAt", caption: "Creada", dataType: "datetime" },
        ],
        []
    );

    return (
        <div className="flex flex-col w-full h-full rounded-dx">
            <GenericDataGrid
                ref={gridRef}
                gridId="inbound-receipts-grid"
                keyExpr="id"
                dataSource={dataSource}
                remoteOperations={true}
                columns={columns}
                export={{ enabled: true, fileName: "RecepcionesEntrada" }}
                editing={{
                    allowAdding: true,
                    allowUpdating: false,
                    allowDeleting: false,
                    useIcons: true,
                    onAdd: () => {
                        setSelected(null);
                        setIsCreateOpen(true);
                    },
                }}
                actions={[
                    {
                        icon: "eyeopen",
                        hint: "Ver detalle",
                        onClick: async (data: IFInboundReceipt) => {
                            if (!token || !currentCompany?.id) return;
                            try {
                                const detail = await inboundReceiptsService.getById(
                                    data.id,
                                    token,
                                    currentCompany.id
                                );
                                setSelected(detail);
                                setIsDetailOpen(true);
                            } catch (error) {
                                notify(mapInboundError(error, "Error al cargar detalle"), "error", 3000);
                            }
                        },
                    },
                    {
                        icon: "check",
                        hint: "Confirmar (mueve stock)",
                        visible: (data: IFInboundReceipt) => data?.state === "draft",
                        onClick: (data: IFInboundReceipt) => handleConfirm(data),
                    },
                    {
                        icon: "close",
                        hint: "Anular (≠ papelera)",
                        visible: (data: IFInboundReceipt) =>
                            data?.state === "draft" || data?.state === "confirmed",
                        onClick: (data: IFInboundReceipt) => handleCancel(data),
                    },
                ]}
                stateStoring={{
                    enabled: true,
                    type: "custom",
                    storageKey: "inbound-receipts-grid",
                    customLoad,
                    customSave,
                }}
            />
            <InboundReceiptModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onHidden={() => setSelected(null)}
                onSuccess={handleRefreshGrid}
            />
            <InboundReceiptDetailModal
                isOpen={isDetailOpen}
                receipt={selected}
                onClose={() => setIsDetailOpen(false)}
                onHidden={() => setSelected(null)}
                onConfirm={async () => {
                    if (selected) await handleConfirm(selected);
                    setIsDetailOpen(false);
                }}
                onCancel={async () => {
                    if (selected) await handleCancel(selected);
                    setIsDetailOpen(false);
                }}
            />
        </div>
    );
};

export default InboundReceiptsClient;

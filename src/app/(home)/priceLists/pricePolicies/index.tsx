"use client";

import { canDo } from "@repo/access";
import { pricePoliciesService } from "@repo/erp-services/priceLists/pricePolicies.service";
import { salesChannelsService } from "@repo/erp-services/salesChannels.service";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import { priceSegmentsService } from "@repo/erp-services/priceLists/priceSegments.service";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";
import type {
    IFCommercialPlatform,
    IFPaymentTerm,
    IFPricePolicy,
    IFPriceSegment,
    IFSalesChannel,
} from "@repo/api-contracts/erp";
import { PRICELIST_OPERATION_LABELS } from "@/app/lib/constants/priceList.constants";
import { GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { mapCommercialCatalogError } from "@repo/erp-api-client";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from "devextreme-react/check-box";
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import PricePolicyModal from "./components/actions/pricePolicyModal";

const { customLoad, customSave } = createGridStateStorage({
    gridId: "pricepolicies-grid",
});

const EXTERNAL_PRICE_LABELS: Record<string, string> = {
    force_calculated: "Forzar calculado",
    accept_external: "Aceptar externo",
    audit_tolerance: "Auditoría c/ tolerancia",
};

const PricePoliciesClient = () => {
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IFPricePolicy | null>(null);
    const [salesChannels, setSalesChannels] = useState<IFSalesChannel[]>([]);
    const [commercialPlatforms, setCommercialPlatforms] = useState<
        IFCommercialPlatform[]
    >([]);
    const [priceSegments, setPriceSegments] = useState<IFPriceSegment[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<IFPaymentTerm[]>([]);

    useEffect(() => {
        if (!token || !currentCompany?.id) return;
        let cancelled = false;

        Promise.all([
            salesChannelsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id },
                token
            ),
            commercialPlatformsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id },
                token
            ),
            priceSegmentsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id },
                token
            ),
            paymentTermsService.getAll(token, currentCompany.id),
        ])
            .then(([ch, pl, seg, terms]) => {
                if (cancelled) return;
                setSalesChannels(ch.items || []);
                setCommercialPlatforms(pl.items || []);
                setPriceSegments(seg.items || []);
                setPaymentTerms(terms.items || []);
            })
            .catch((error) => {
                console.error("Error loading policy lookups:", error);
            });

        return () => {
            cancelled = true;
        };
    }, [token, currentCompany?.id]);

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
                if (!currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const response = await pricePoliciesService.getAll(
                        token!,
                        currentCompany.id,
                        take,
                        skip
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch (error) {
                    console.error("Error loading price policies:", error);
                    notify(mapCommercialCatalogError(error), "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
        });
    }, [refreshVersion, token, currentCompany?.id]);

    const handleRowRemoved = async (data: IFPricePolicy) => {
        try {
            await pricePoliciesService.delete(data.id, token!, currentCompany?.id);
            setRefreshVersion((prev) => prev + 1);
            gridRef.current?.instance?.refresh?.() ?? gridRef.current?.refresh?.();
            notify("Política eliminada exitosamente", "success", 3000);
        } catch (error) {
            console.error("Error deleting price policy:", error);
            notify(mapCommercialCatalogError(error), "error", 4500);
        }
    };

    const dimLabel = (
        id: string | null | undefined,
        items: Array<{ id: string; name?: string; code?: string }>
    ) => {
        if (!id) return "Todos";
        const found = items.find((i) => i.id === id);
        return found?.name || found?.code || id;
    };

    const actions = useMemo(
        () => [
            {
                icon: "edit",
                hint: "Editar",
                onClick: (data: IFPricePolicy) => {
                    setSelectedItem(data);
                    setIsModalOpen(true);
                },
                visible: () => canModify,
            },
            {
                icon: "trash",
                hint: "Eliminar",
                onClick: (data: IFPricePolicy) => handleRowRemoved(data),
                visible: (e: IFPricePolicy) => e.active && canModify,
            },
        ],
        [canModify, token, currentCompany?.id]
    );

    const columns: IGenericDataGridColumn[] = useMemo(
        () => [
            { dataField: "id", caption: "ID", visible: false },
            {
                dataField: "active",
                caption: "Activa",
                width: 90,
                alignment: "center",
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                ),
            },
            {
                dataField: "salesChannelId",
                caption: "Canal",
                calculateDisplayValue: (row: IFPricePolicy) =>
                    dimLabel(row.salesChannelId, salesChannels),
            },
            {
                dataField: "commercialPlatformId",
                caption: "Plataforma",
                calculateDisplayValue: (row: IFPricePolicy) =>
                    dimLabel(row.commercialPlatformId, commercialPlatforms),
            },
            {
                dataField: "priceSegmentId",
                caption: "Segmento",
                calculateDisplayValue: (row: IFPricePolicy) =>
                    dimLabel(row.priceSegmentId, priceSegments),
            },
            {
                dataField: "paymentTermId",
                caption: "Plazo",
                calculateDisplayValue: (row: IFPricePolicy) =>
                    dimLabel(row.paymentTermId, paymentTerms),
            },
            {
                dataField: "pricelistName",
                caption: "Lista",
                calculateDisplayValue: (row: IFPricePolicy) => {
                    const op =
                        PRICELIST_OPERATION_LABELS[row.pricelistOperation] ||
                        row.pricelistOperation ||
                        "";
                    return op
                        ? `${row.pricelistName || "—"} (${op})`
                        : row.pricelistName || "—";
                },
            },
            {
                dataField: "specificity",
                caption: "Spec",
                width: 70,
                alignment: "center",
            },
            { dataField: "code", caption: "Código", width: 180 },
            {
                dataField: "externalPricePolicy",
                caption: "Precio externo",
                calculateDisplayValue: (row: IFPricePolicy) =>
                    EXTERNAL_PRICE_LABELS[row.externalPricePolicy] ||
                    row.externalPricePolicy ||
                    "—",
            },
        ],
        [salesChannels, commercialPlatforms, priceSegments, paymentTerms]
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
                gridId="pricepolicies-grid"
                keyExpr="id"
                dataSource={dataSource}
                remoteOperations={{ paging: true, filtering: false, sorting: false }}
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
                noDataText="No se encontraron políticas de precios"
                paging={{ enabled: true, pageSize: 50, pageSizes: [20, 50, 100] }}
                searchPanel={{
                    visible: true,
                    width: 320,
                    placeholder: "Buscar políticas...",
                }}
                export={{
                    enabled: true,
                    fileName: "PoliticasDePrecios",
                    formats: ["xlsx"],
                }}
                stateStoring={{
                    enabled: true,
                    type: "custom",
                    storageKey: "pricepolicies-grid",
                    customLoad,
                    customSave,
                }}
            />
            <PricePolicyModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onHidden={() => setSelectedItem(null)}
                onSuccess={() => {
                    setRefreshVersion((prev) => prev + 1);
                    gridRef.current?.instance?.refresh?.() ??
                        gridRef.current?.refresh?.();
                }}
                initialData={selectedItem}
            />
        </div>
    );
};

export default PricePoliciesClient;

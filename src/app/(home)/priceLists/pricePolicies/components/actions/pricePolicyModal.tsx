"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from "@repo/devextreme";
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { mapCommercialCatalogError } from "@repo/erp-api-client";
import type {
    IFCommercialPlatform,
    IFPaymentTerm,
    IFPriceList,
    IFPricePolicy,
    IFPriceSegment,
    IFSalesChannel,
} from "@repo/api-contracts/erp";
import { pricePoliciesService } from "@repo/erp-services/priceLists/pricePolicies.service";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import { salesChannelsService } from "@repo/erp-services/salesChannels.service";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import { priceSegmentsService } from "@repo/erp-services/priceLists/priceSegments.service";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";

interface PricePolicyModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
    initialData?: IFPricePolicy | null;
}

const EXTERNAL_PRICE_OPTIONS = [
    { id: "force_calculated", name: "Forzar calculado" },
    { id: "accept_external", name: "Aceptar externo" },
    { id: "audit_tolerance", name: "Auditoría con tolerancia" },
];

const emptyData = {
    code: "",
    companyId: "",
    pricelistId: null as string | null,
    salesChannelId: null as string | null,
    commercialPlatformId: null as string | null,
    priceSegmentId: null as string | null,
    paymentTermId: null as string | null,
    active: true,
    externalPricePolicy: "audit_tolerance",
    externalPriceTolerancePct: 1,
};

const withTodos = <T extends { id: string }>(
    items: T[],
    label: string
): Array<T | { id: null; name: string; code?: string }> => [
    { id: null, name: label } as any,
    ...items,
];

const nameOrCode = (item: { name?: string; code?: string } | null | undefined) =>
    item?.name || item?.code || "";

export default function PricePolicyModal({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    initialData,
}: PricePolicyModalProps) {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);
    const [formData, setFormData] = useState({
        ...emptyData,
        companyId: currentCompany?.id || "",
    });
    const [salesChannels, setSalesChannels] = useState<IFSalesChannel[]>([]);
    const [platforms, setPlatforms] = useState<IFCommercialPlatform[]>([]);
    const [segments, setSegments] = useState<IFPriceSegment[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<IFPaymentTerm[]>([]);
    const [priceLists, setPriceLists] = useState<IFPriceList[]>([]);

    useEffect(() => {
        if (!isOpen || !token || !currentCompany?.id) return;
        let cancelled = false;

        Promise.all([
            salesChannelsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id, active: true },
                token
            ),
            commercialPlatformsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id, active: true },
                token
            ),
            priceSegmentsService.getAll(
                { limit: 500, offset: 0, companyId: currentCompany.id, active: true },
                token
            ),
            paymentTermsService.getAll(token, currentCompany.id),
            priceListsService.getAll(token, currentCompany.id, 500, 0),
        ])
            .then(([ch, pl, seg, terms, lists]) => {
                if (cancelled) return;
                setSalesChannels(ch.items || []);
                setPlatforms(pl.items || []);
                setSegments(seg.items || []);
                setPaymentTerms(terms.items || []);
                setPriceLists(lists.items || []);
            })
            .catch((error) => {
                console.error("Error loading price policy lookups:", error);
                notify(mapCommercialCatalogError(error), "error", 4000);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, token, currentCompany?.id]);

    useEffect(() => {
        if (!isOpen) return;

        const nextData = initialData
            ? {
                  code: initialData.code || "",
                  companyId: initialData.companyId || currentCompany?.id || "",
                  pricelistId: initialData.pricelistId || null,
                  salesChannelId: initialData.salesChannelId ?? null,
                  commercialPlatformId: initialData.commercialPlatformId ?? null,
                  priceSegmentId: initialData.priceSegmentId ?? null,
                  paymentTermId: initialData.paymentTermId ?? null,
                  active: initialData.active ?? true,
                  externalPricePolicy:
                      initialData.externalPricePolicy || "audit_tolerance",
                  externalPriceTolerancePct:
                      initialData.externalPriceTolerancePct ?? 1,
              }
            : {
                  ...emptyData,
                  companyId: currentCompany?.id || "",
              };

        setFormData(nextData);
        setTimeout(() => {
            const formInstance = formRef.current?.instance();
            if (!formInstance) return;
            formInstance.option("formData", nextData);
            if (typeof formInstance.reset === "function") formInstance.reset();
            formInstance.option("formData", nextData);
        }, 0);
    }, [isOpen, initialData, currentCompany?.id]);

    const handleHidden = useCallback(() => {
        setFormData({ ...emptyData, companyId: currentCompany?.id || "" });
        setLoading(false);
        onHidden?.();
    }, [onHidden, currentCompany?.id]);

    const handleSubmit = useCallback(async () => {
        const formInstance = formRef.current?.instance();
        const result = formInstance?.validate();
        if (!result?.isValid) return;

        const currentFormData = formInstance?.option("formData") || formData;
        if (!currentFormData.companyId) {
            notify("Seleccione una compañía operativa", "warning", 3000);
            return;
        }
        if (!currentFormData.pricelistId) {
            notify("Seleccione una lista de precios", "warning", 3000);
            return;
        }

        const code = String(currentFormData.code || "").trim().toLowerCase();
        if (!/^[a-z0-9][a-z0-9_-]{0,39}$/.test(code)) {
            notify(
                "Código inválido: use a-z, 0-9, _ o - (máx. 40, empezar alfanumérico)",
                "warning",
                4000
            );
            return;
        }

        const dimOrNull = (v: unknown) => (v ? String(v) : null);

        setLoading(true);
        try {
            if (initialData?.id) {
                await pricePoliciesService.update(
                    initialData.id,
                    {
                        code,
                        pricelistId: currentFormData.pricelistId,
                        salesChannelId: dimOrNull(currentFormData.salesChannelId),
                        commercialPlatformId: dimOrNull(
                            currentFormData.commercialPlatformId
                        ),
                        priceSegmentId: dimOrNull(currentFormData.priceSegmentId),
                        paymentTermId: dimOrNull(currentFormData.paymentTermId),
                        active: currentFormData.active,
                        externalPricePolicy: currentFormData.externalPricePolicy,
                        externalPriceTolerancePct: Number(
                            currentFormData.externalPriceTolerancePct ?? 1
                        ),
                    },
                    token!,
                    currentFormData.companyId
                );
                notify("Política actualizada exitosamente", "success", 3000);
            } else {
                await pricePoliciesService.create(
                    {
                        companyId: currentFormData.companyId,
                        code,
                        pricelistId: currentFormData.pricelistId,
                        salesChannelId: dimOrNull(currentFormData.salesChannelId),
                        commercialPlatformId: dimOrNull(
                            currentFormData.commercialPlatformId
                        ),
                        priceSegmentId: dimOrNull(currentFormData.priceSegmentId),
                        paymentTermId: dimOrNull(currentFormData.paymentTermId),
                        active: currentFormData.active,
                        externalPricePolicy: currentFormData.externalPricePolicy,
                        externalPriceTolerancePct: Number(
                            currentFormData.externalPriceTolerancePct ?? 1
                        ),
                    },
                    token!
                );
                notify("Política creada exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving price policy:", error);
            notify(mapCommercialCatalogError(error), "error", 4500);
        } finally {
            setLoading(false);
        }
    }, [formData, initialData?.id, token, onClose, onSuccess]);

    const channelOptions = useMemo(
        () => withTodos(salesChannels, "Todos / Cualquiera"),
        [salesChannels]
    );
    const platformOptions = useMemo(
        () => withTodos(platforms, "Todos / Cualquiera"),
        [platforms]
    );
    const segmentOptions = useMemo(
        () => withTodos(segments, "Todos / Cualquiera"),
        [segments]
    );
    const termOptions = useMemo(
        () => withTodos(paymentTerms, "Todos / Cualquiera"),
        [paymentTerms]
    );

    const formContent = useMemo(
        () => (
            <Form ref={formRef} formData={formData} labelLocation="top" colCount={2}>
                <SimpleItem
                    dataField="code"
                    colSpan={2}
                    label={{ text: "Código" }}
                    editorOptions={{
                        placeholder: "ej. ecom-ml-mayorista-30d",
                    }}
                    validationRules={[
                        { type: "required", message: "El código es obligatorio" },
                        {
                            type: "pattern",
                            pattern: /^[a-z0-9][a-z0-9_-]{0,39}$/,
                            message: "Solo a-z 0-9 _ - (máx. 40)",
                        },
                    ]}
                />
                <SimpleItem
                    dataField="pricelistId"
                    colSpan={2}
                    label={{ text: "Lista de precios" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: priceLists,
                        valueExpr: "id",
                        displayExpr: (item: IFPriceList) =>
                            item ? `${item.name}${item.code ? ` (${item.code})` : ""}` : "",
                        searchEnabled: true,
                        showClearButton: false,
                        placeholder: "Seleccione lista...",
                    }}
                    validationRules={[
                        { type: "required", message: "La lista es obligatoria" },
                    ]}
                />
                <SimpleItem
                    dataField="salesChannelId"
                    label={{ text: "Canal" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: channelOptions,
                        valueExpr: "id",
                        displayExpr: nameOrCode,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Todos / Cualquiera",
                    }}
                />
                <SimpleItem
                    dataField="commercialPlatformId"
                    label={{ text: "Plataforma" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: platformOptions,
                        valueExpr: "id",
                        displayExpr: nameOrCode,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Todos / Cualquiera",
                    }}
                />
                <SimpleItem
                    dataField="priceSegmentId"
                    label={{ text: "Segmento" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: segmentOptions,
                        valueExpr: "id",
                        displayExpr: (item: IFPriceSegment) =>
                            item
                                ? item.code
                                    ? `${item.code} — ${item.name}`
                                    : item.name
                                : "",
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Todos / Cualquiera",
                    }}
                />
                <SimpleItem
                    dataField="paymentTermId"
                    label={{ text: "Plazo / condición" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: termOptions,
                        valueExpr: "id",
                        displayExpr: nameOrCode,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Todos / Cualquiera",
                    }}
                />
                <SimpleItem
                    dataField="externalPricePolicy"
                    label={{ text: "Política precio externo" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: EXTERNAL_PRICE_OPTIONS,
                        valueExpr: "id",
                        displayExpr: "name",
                    }}
                />
                <SimpleItem
                    dataField="externalPriceTolerancePct"
                    label={{ text: "Tolerancia %" }}
                    editorType="dxNumberBox"
                    editorOptions={{
                        min: 0,
                        showSpinButtons: true,
                        format: "#0.##",
                    }}
                />
                <SimpleItem
                    dataField="active"
                    label={{ text: "Activa" }}
                    editorType="dxCheckBox"
                />
            </Form>
        ),
        [
            formData,
            priceLists,
            channelOptions,
            platformOptions,
            segmentOptions,
            termOptions,
        ]
    );

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={
                initialData
                    ? "Editar Política de Precios"
                    : "Nueva Política de Precios"
            }
            width={640}
            height="auto"
            maxHeight="88vh"
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => e.component.repaint()}
        >
            <Position at="center" my="center" />
            <div className="p-4">{formContent}</div>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                    className="!bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Guardar"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="!bg-focus-300 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
}

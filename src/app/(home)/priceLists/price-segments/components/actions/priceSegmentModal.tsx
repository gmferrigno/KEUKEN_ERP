"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from "@repo/devextreme";
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import type { IFPriceList, IFPriceSegment, IFPaymentTerm } from "@repo/api-contracts/erp";
import { priceSegmentsService } from "@repo/erp-services/priceLists/priceSegments.service";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";

interface PriceSegmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
    initialData?: IFPriceSegment | null;
    parentOptions: IFPriceSegment[];
}

const emptyData = {
    name: "",
    companyId: "",
    active: true,
    parentId: null as string | null,
    pricelistId: null as string | null,
    referencePricelistId: null as string | null,
    paymentTermId: null as string | null,
    clearReferencePricelist: false,
};

const listDisplay = (item: IFPriceList | null | undefined) =>
    item?.name || "";

const segmentDisplay = (item: IFPriceSegment | null | undefined) =>
    item ? (item.code ? `${item.code} — ${item.name}` : item.name) : "";

const termDisplay = (item: IFPaymentTerm | null | undefined) =>
    item?.name || "";

export default function PriceSegmentModal({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    initialData,
    parentOptions,
}: PriceSegmentModalProps) {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);
    const [formData, setFormData] = useState({
        ...emptyData,
        companyId: currentCompany?.id || "",
    });
    const [saleLists, setSaleLists] = useState<IFPriceList[]>([]);
    const [referenceLists, setReferenceLists] = useState<IFPriceList[]>([]);
    const [paymentTerms, setPaymentTerms] = useState<IFPaymentTerm[]>([]);

    useEffect(() => {
        if (!isOpen || !token || !currentCompany?.id) return;
        let cancelled = false;

        Promise.all([
            priceListsService.getAll(token, currentCompany.id, 200, 0, {
                operation: "sale",
            }),
            priceListsService.getAll(token, currentCompany.id, 200, 0, {
                operation: "reference",
            }),
            paymentTermsService.getAll(token, currentCompany.id),
        ])
            .then(([saleRes, refRes, termsRes]) => {
                if (cancelled) return;
                setSaleLists(saleRes.items || []);
                setReferenceLists(refRes.items || []);
                setPaymentTerms(termsRes.items || []);
            })
            .catch((error) => {
                console.error("Error loading price segment lookups:", error);
            });

        return () => {
            cancelled = true;
        };
    }, [isOpen, token, currentCompany?.id]);

    useEffect(() => {
        if (!isOpen) return;

        const nextData = initialData
            ? {
                  name: initialData.name || "",
                  companyId: initialData.companyId || currentCompany?.id || "",
                  active: initialData.active ?? true,
                  parentId: initialData.parentId ?? null,
                  pricelistId: initialData.pricelistId ?? null,
                  referencePricelistId: initialData.referencePricelistId ?? null,
                  paymentTermId: initialData.paymentTermId ?? null,
                  clearReferencePricelist: false,
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

    const parentSelectOptions = useMemo(
        () =>
            parentOptions.filter(
                (segment) => !initialData?.id || segment.id !== initialData.id
            ),
        [parentOptions, initialData?.id]
    );

    const handleSubmit = useCallback(async () => {
        const formInstance = formRef.current?.instance();
        const result = formInstance?.validate();
        if (!result?.isValid) return;

        const currentFormData = formInstance?.option("formData") || formData;
        if (!currentFormData.companyId) {
            notify("Seleccione una compañía operativa", "warning", 3000);
            return;
        }

        setLoading(true);
        try {
            if (initialData?.id) {
                await priceSegmentsService.update(
                    initialData.id,
                    {
                        name: currentFormData.name,
                        active: currentFormData.active,
                        parentId: currentFormData.parentId || null,
                        pricelistId: currentFormData.pricelistId || null,
                        paymentTermId: currentFormData.paymentTermId || null,
                        ...(currentFormData.clearReferencePricelist
                            ? { clearReferencePricelist: true }
                            : {
                                  referencePricelistId:
                                      currentFormData.referencePricelistId || null,
                              }),
                    },
                    token!,
                    currentFormData.companyId
                );
                notify("Segmento actualizado exitosamente", "success", 3000);
            } else {
                await priceSegmentsService.create(
                    {
                        companyId: currentFormData.companyId,
                        name: currentFormData.name,
                        active: currentFormData.active,
                        parentId: currentFormData.parentId || null,
                        pricelistId: currentFormData.pricelistId || null,
                        referencePricelistId:
                            currentFormData.referencePricelistId || null,
                        paymentTermId: currentFormData.paymentTermId || null,
                    },
                    token!
                );
                notify("Segmento creado exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving price segment:", error);
            notify(
                error instanceof Error
                    ? error.message
                    : "Error al guardar el segmento",
                "error",
                4000
            );
        } finally {
            setLoading(false);
        }
    }, [formData, initialData?.id, token, onClose, onSuccess]);

    const formContent = useMemo(
        () => (
            <Form ref={formRef} formData={formData} labelLocation="top" colCount={2}>
                <SimpleItem
                    dataField="name"
                    colSpan={2}
                    label={{ text: "Nombre" }}
                    validationRules={[
                        { type: "required", message: "El nombre es obligatorio" },
                    ]}
                />
                <SimpleItem
                    dataField="parentId"
                    label={{ text: "Segmento padre" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: parentSelectOptions,
                        valueExpr: "id",
                        displayExpr: segmentDisplay,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Sin padre",
                    }}
                />
                <SimpleItem
                    dataField="active"
                    label={{ text: "Activo" }}
                    editorType="dxCheckBox"
                />
                <SimpleItem
                    dataField="pricelistId"
                    label={{ text: "Lista de precios (sale)" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: saleLists,
                        valueExpr: "id",
                        displayExpr: listDisplay,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Seleccione lista sale...",
                    }}
                />
                <SimpleItem
                    dataField="referencePricelistId"
                    label={{ text: "PVP sugerido (reference)" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: referenceLists,
                        valueExpr: "id",
                        displayExpr: listDisplay,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Seleccione lista reference...",
                        disabled: Boolean(formData.clearReferencePricelist),
                    }}
                />
                <SimpleItem
                    dataField="paymentTermId"
                    label={{ text: "Condición de pago" }}
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: paymentTerms,
                        valueExpr: "id",
                        displayExpr: termDisplay,
                        searchEnabled: true,
                        showClearButton: true,
                        placeholder: "Seleccione condición...",
                    }}
                />
                {initialData?.id ? (
                    <SimpleItem
                        dataField="clearReferencePricelist"
                        label={{ text: "Limpiar PVP sugerido" }}
                        editorType="dxCheckBox"
                    />
                ) : null}
            </Form>
        ),
        [
            formData,
            parentSelectOptions,
            saleLists,
            referenceLists,
            paymentTerms,
            initialData?.id,
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
                    ? "Editar Segmento de Precio"
                    : "Nuevo Segmento de Precio"
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

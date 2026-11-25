"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Form, { SimpleItem, ButtonItem } from "devextreme-react/form";
import { Button } from "@repo/devextreme";
import notify from "devextreme/ui/notify";
import CustomStore from "devextreme/data/custom_store";
import { useAuth } from "@/contexts/AuthContext";
import { inboundReceiptsService } from "@repo/erp-services/procurement/inboundReceipts.service";
import { providerService } from "@repo/erp-services/location_services/provider.service";
import { warehouseService } from "@repo/erp-services/warehouse/warehouse.service";
import { locationService } from "@repo/erp-services/warehouse/locations.service";
import { ApiError } from "@repo/erp-api-client";
import { IFInboundReceiptLineCreate } from "@repo/api-contracts/erp";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
}

const emptyLine = (): IFInboundReceiptLineCreate => ({
    itemId: "",
    productUomQty: 1,
});

const emptyForm = () => ({
    supplierId: "",
    warehouseId: "",
    locationDestId: "",
    purchaseOrderId: "",
    notes: "",
    lines: [emptyLine()] as IFInboundReceiptLineCreate[],
    /** Solo para mostrar JSON en el TextArea; no es contrato BE */
    linesJson: JSON.stringify([emptyLine()], null, 2),
});

export default function InboundReceiptModal({ isOpen, onClose, onSuccess, onHidden }: Props) {
    const { token, currentCompany } = useAuth();
    const formRef = useRef<any>(null);
    const popupRef = useRef<any>(null);
    const locationEditorRef = useRef<any>(null);
    const locationsCache = useRef<any[]>([]);
    const [loading, setLoading] = useState(false);
    /** formData solo se setea al abrir; DX muta el objeto en escritura */
    const [formData, setFormData] = useState(emptyForm);

    const buildLocationsStore = useCallback(
        (warehouseId?: string) =>
            new CustomStore({
                key: "id",
                load: async (opts: any) => {
                    if (!token || !warehouseId) return { data: [], totalCount: 0 };
                    try {
                        const res = await locationService.getOptions(
                            {
                                q: opts.searchValue,
                                warehouseId,
                                limit: opts.take || 50,
                                offset: opts.skip || 0,
                            },
                            token
                        );
                        res.items.forEach((item) => {
                            if (!locationsCache.current.find((i) => i.id === item.id)) {
                                locationsCache.current.push(item);
                            }
                        });
                        return { data: res.items, totalCount: res.metadata.totalItems };
                    } catch {
                        return { data: [], totalCount: 0 };
                    }
                },
                byKey: async (key: string) => {
                    if (!key) return null;
                    const found = locationsCache.current.find((i) => i.id === key);
                    return found || { id: key, label: key };
                },
            }),
        [token]
    );

    useEffect(() => {
        if (!isOpen) return;
        const next = emptyForm();
        locationsCache.current = [];
        setFormData(next);
        requestAnimationFrame(() => {
            const form = formRef.current?.instance?.();
            if (!form) return;
            form.reset?.({ ...next });
            locationEditorRef.current?.option("dataSource", buildLocationsStore(undefined));
            locationEditorRef.current?.option("disabled", true);
            form.updateDimensions?.();
        });
    }, [isOpen, buildLocationsStore]);

    const suppliersStore = useMemo(
        () =>
            new CustomStore({
                key: "id",
                load: async (opts: any) => {
                    if (!token || !currentCompany?.id) return { data: [], totalCount: 0 };
                    const res = await providerService.getOptions(
                        {
                            q: opts.searchValue,
                            limit: 50,
                            offset: opts.skip || 0,
                            companyId: currentCompany.id,
                        },
                        token
                    );
                    return { data: res.items, totalCount: res.metadata.totalItems };
                },
                byKey: async (key) => ({ id: key }),
            }),
        [token, currentCompany?.id]
    );

    const warehousesStore = useMemo(
        () =>
            new CustomStore({
                key: "id",
                load: async () => {
                    if (!token || !currentCompany?.id) return [];
                    const res = await warehouseService.getAll(token, currentCompany.id);
                    return (res as any).items || res || [];
                },
                byKey: async (key) => ({ id: key }),
            }),
        [token, currentCompany?.id]
    );

    const getFormData = useCallback(() => {
        return (
            formRef.current?.instance?.()?.option?.("formData") || formData
        ) as ReturnType<typeof emptyForm>;
    }, [formData]);

    const loadOpenQuantities = useCallback(async () => {
        const data = getFormData();
        const poId = String(data.purchaseOrderId || "").trim();
        if (!token || !currentCompany?.id || !poId) {
            notify("Ingresá el UUID de la OC", "warning", 2500);
            return;
        }
        try {
            const qty = await inboundReceiptsService.getPoOpenQuantities(
                poId,
                token,
                currentCompany.id
            );
            if (!qty.length) {
                notify("La OC no tiene cantidades abiertas", "warning", 3000);
                return;
            }
            const lines = qty.map((q) => ({
                itemId: q.itemId || "",
                purchaseOrderLineId: q.purchaseOrderLineId,
                productUomQty: q.qtyOpen ?? 0,
            }));
            // Mutación in-place + updateData (sin reemplazar formData raíz vía setState)
            data.lines = lines;
            data.linesJson = JSON.stringify(lines, null, 2);
            const form = formRef.current?.instance?.();
            form?.updateData?.("lines", lines);
            form?.updateData?.("linesJson", data.linesJson);
            notify(`Se cargaron ${qty.length} líneas abiertas`, "success", 2500);
        } catch (error) {
            const msg =
                error instanceof ApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "No se pudieron cargar cantidades abiertas";
            notify(msg, "error", 3500);
        }
    }, [token, currentCompany?.id, getFormData]);

    const handleSubmit = async () => {
        if (!token || !currentCompany?.id) return;
        const validation = formRef.current?.instance?.()?.validate?.();
        if (validation && !validation.isValid) return;

        const data = getFormData();
        let lines = data.lines || [];
        // Preferir JSON del editor si parsea bien (blur ya sincroniza; fallback al submit)
        try {
            const parsed = JSON.parse(String(data.linesJson || "[]"));
            if (Array.isArray(parsed)) lines = parsed;
        } catch {
            /* usar data.lines */
        }

        const hasPo = Boolean(String(data.purchaseOrderId || "").trim());
        for (const line of lines) {
            if (!line.itemId || !line.productUomQty) {
                notify("Cada línea necesita ítem y cantidad", "warning", 3000);
                return;
            }
            if (hasPo && !line.purchaseOrderLineId) {
                notify("Con OC, cada línea necesita purchaseOrderLineId", "warning", 3500);
                return;
            }
            if (!hasPo && (line.unitCost == null || !line.currencyId)) {
                notify("Sin OC, cada línea necesita unitCost y currencyId", "warning", 3500);
                return;
            }
        }

        setLoading(true);
        try {
            await inboundReceiptsService.create(
                {
                    companyId: currentCompany.id,
                    supplierId: data.supplierId,
                    warehouseId: data.warehouseId,
                    locationDestId: data.locationDestId,
                    purchaseOrderId: String(data.purchaseOrderId || "").trim() || undefined,
                    notes: data.notes || null,
                    lines,
                },
                token
            );
            notify("Recepción creada en borrador", "success", 2500);
            onSuccess();
            onClose();
        } catch (error) {
            const msg =
                error instanceof ApiError
                    ? error.message
                    : error instanceof Error
                      ? error.message
                      : "No se pudo crear la recepción";
            notify(msg, "error", 4000);
        } finally {
            setLoading(false);
        }
    };

    const formJsx = useMemo(
        () => (
            <Form ref={formRef} formData={formData} labelLocation="top" colCount={2}>
                <SimpleItem
                    dataField="supplierId"
                    label={{ text: "Proveedor" }}
                    isRequired
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: suppliersStore,
                        valueExpr: "id",
                        displayExpr: "label",
                        searchEnabled: true,
                        stylingMode: "filled",
                        dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } },
                    }}
                />
                <SimpleItem
                    dataField="warehouseId"
                    label={{ text: "Depósito" }}
                    isRequired
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: warehousesStore,
                        valueExpr: "id",
                        displayExpr: "name",
                        searchEnabled: true,
                        stylingMode: "filled",
                        dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } },
                        onValueChanged: (e: any) => {
                            // Form+SelectBox a veces no manda e.event; habilitar por cambio de valor
                            if (e.value === e.previousValue) return;
                            const form = formRef.current?.instance?.();
                            const locEditor =
                                form?.getEditor?.("locationDestId") || locationEditorRef.current;
                            if (!locEditor) return;

                            form?.updateData("locationDestId", "");
                            locationsCache.current = [];

                            if (!e.value) {
                                locEditor.option("dataSource", []);
                                locEditor.option("disabled", true);
                                locEditor.option("placeholder", "Elegí depósito primero");
                                return;
                            }

                            locEditor.option("dataSource", buildLocationsStore(e.value));
                            locEditor.option("disabled", false);
                            locEditor.option("placeholder", "Buscar ubicación…");
                        },
                    }}
                />
                <SimpleItem
                    dataField="locationDestId"
                    label={{ text: "Ubicación destino" }}
                    isRequired
                    editorType="dxSelectBox"
                    editorOptions={{
                        dataSource: [],
                        valueExpr: "id",
                        displayExpr: "label",
                        searchEnabled: true,
                        disabled: true,
                        stylingMode: "filled",
                        placeholder: "Elegí depósito primero",
                        dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } },
                        onInitialized: (e: any) => {
                            locationEditorRef.current = e.component;
                            const warehouseId = formRef.current
                                ?.instance?.()
                                ?.option?.("formData")?.warehouseId;
                            if (warehouseId) {
                                e.component.option("dataSource", buildLocationsStore(warehouseId));
                                e.component.option("disabled", false);
                                e.component.option("placeholder", "Buscar ubicación…");
                            }
                        },
                    }}
                />
                <SimpleItem
                    dataField="purchaseOrderId"
                    label={{ text: "OC (próximamente)" }}
                    helpText="Pendiente: falta endpoint de opciones de órdenes de compra."
                    editorOptions={{
                        placeholder: "Selección de OC no disponible aún",
                        stylingMode: "filled",
                        disabled: true,
                        readOnly: true,
                    }}
                />
                <ButtonItem
                    horizontalAlignment="left"
                    buttonOptions={{
                        text: "Cargar líneas abiertas de la OC",
                        type: "default",
                        stylingMode: "outlined",
                        disabled: true,
                        hint: "Disponible cuando exista selector de OC",
                    }}
                />
                <SimpleItem
                    dataField="notes"
                    label={{ text: "Notas" }}
                    colSpan={2}
                    editorType="dxTextArea"
                    editorOptions={{ stylingMode: "filled" }}
                />
                <SimpleItem
                    dataField="linesJson"
                    label={{ text: "Líneas (JSON)" }}
                    colSpan={2}
                    editorType="dxTextArea"
                    editorOptions={{
                        height: 180,
                        stylingMode: "filled",
                        valueChangeEvent: "change",
                        onFocusOut: (e: any) => {
                            // Sincronizar lines al salir del editor (no en cada tecla)
                            try {
                                const parsed = JSON.parse(e.component.option("value") || "[]");
                                if (!Array.isArray(parsed)) return;
                                const data = formRef.current?.instance?.()?.option?.("formData");
                                if (data) {
                                    data.lines = parsed;
                                    data.linesJson = e.component.option("value");
                                }
                            } catch {
                                notify("JSON de líneas inválido", "warning", 2500);
                            }
                        },
                    }}
                />
            </Form>
        ),
        [formData, suppliersStore, warehousesStore, buildLocationsStore, loadOpenQuantities]
    );

    return (
        <Popup
            ref={popupRef}
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            dragEnabled={false}
            hideOnOutsideClick
            showCloseButton
            showTitle
            title="Nueva recepción de entrada"
            width={720}
            height="auto"
            maxHeight="90vh"
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
                formRef.current?.instance?.()?.updateDimensions?.();
            }}
        >
            <Position at="center" my="center" />
            <div className="p-5 text-main">{formJsx}</div>
            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{ text: "Cancelar", onClick: onClose, disabled: loading }}
            />
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text={loading ? "Guardando…" : "Crear borrador"}
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant !rounded-dx"
                />
            </ToolbarItem>
        </Popup>
    );
}

"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from '@repo/devextreme';
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import CustomStore from "devextreme/data/custom_store";
import { consignmentsService } from "@repo/erp-services/consignments.service";
import { itemsService } from "@repo/erp-services/product_services/items.service";
import { customersService } from "@repo/erp-services/partners/customers.service";
import { useAuth } from "@/contexts/AuthContext";
import { getZeroTimeDate } from "@/app/lib/utils/prittier";

interface ConsignmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
    initialData?: any;
}

export default function ConsignmentModal({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    initialData
}: ConsignmentModalProps) {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);
    const itemsCache = useRef<any[]>([]);
    const partnersCache = useRef<any[]>([]);

    const [formData, setFormData] = useState<any>({
        itemId: "",
        partnerId: "",
        quantity: 0,
        companyId: currentCompany?.id || "",
        loanDate: getZeroTimeDate(),
        returnDeadline: "",
        notes: "",
        serialNumberIds: [],
    });

    const itemsDataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions: any) => {
                if (!currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }
                try {
                    const params = {
                        limit: 200,
                        offset: loadOptions.skip || 0,
                        q: loadOptions.searchValue || undefined,
                    };
                    const response = await itemsService.getOptions(currentCompany.id, params, token);
                    const filteredItems = response.items;

                    filteredItems.forEach(item => {
                        if (!itemsCache.current.find(i => i.id === item.id)) {
                            itemsCache.current.push(item);
                        }
                    });

                    return {
                        data: filteredItems,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error) {
                    notify("Error al cargar items", "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
            byKey: async (key: any) => {
                if (!key) return null;
                const found = itemsCache.current.find(i => i.id === key);
                if (found) return found;
                return { id: key };
            }
        });
    }, [token, currentCompany]);

    const customersDataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions: any) => {
                try {
                    const params = {
                        limit: 200,
                        offset: loadOptions.skip || 0,
                        q: loadOptions.searchValue || undefined,
                        companyId: currentCompany?.id,
                    };
                    const response = await customersService.getOptions(params, token);

                    response.items.forEach(item => {
                        if (!partnersCache.current.find(i => i.id === item.id)) {
                            partnersCache.current.push(item);
                        }
                    });

                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error) {
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar partners";
                    notify(errorMessage, "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
            byKey: async (key: any) => {
                if (!key) return null;
                const found = partnersCache.current.find(i => i.id === key);
                if (found) return found;

                try {
                    const partner = await customersService.getById(key, token);
                    if (partner) {
                        partnersCache.current.push(partner);
                        return partner;
                    }
                } catch (e) {
                }
                return { id: key };
            }
        });
    }, [token, currentCompany?.id]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    itemId: initialData.itemId || "",
                    partnerId: initialData.partnerId || "",
                    quantity: initialData.quantity || 0,
                    companyId: initialData.companyId || currentCompany?.id || "",
                    loanDate: initialData.loanDate ? getZeroTimeDate(initialData.loanDate) : getZeroTimeDate(),
                    returnDeadline: initialData.returnDeadline ? getZeroTimeDate(initialData.returnDeadline) : "",
                    notes: initialData.notes || "",
                    serialNumberIds: initialData.serialNumberIds || [],
                });
            } else {
                setFormData({
                    itemId: "",
                    partnerId: "",
                    quantity: 0,
                    companyId: currentCompany?.id || "",
                    loanDate: getZeroTimeDate(),
                    returnDeadline: "",
                    notes: "",
                    serialNumberIds: [],
                });
            }
        }
    }, [isOpen, initialData, currentCompany?.id]);

    const handleSubmit = useCallback(async () => {
        const result = formRef.current?.instance().validate();
        if (!result?.isValid) return;

        setLoading(true);
        try {
            const createPayload = {
                ...formData,
                companyId: currentCompany?.id || formData.companyId,
                loanDate: getZeroTimeDate(formData.loanDate),
                returnDeadline: getZeroTimeDate(formData.returnDeadline),
            };
            await consignmentsService.create(createPayload, token, currentCompany?.id);
            notify("Creado exitosamente", "success", 3000);
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error al crear consignación:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear consignación";
            notify(errorMessage, "error", 3000);
        } finally {
            setLoading(false);
        }
    }, [formData, token, currentCompany?.id, onClose, onSuccess]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? "Editar Consignación" : "Nueva Consignación"}
            width={450}
            height="auto"
            maxHeight="88vh"
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="p-5">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                >
                    <SimpleItem
                        dataField="itemId"
                        label={{ text: "Artículo" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: itemsDataSource,
                            valueExpr: "id",
                            displayExpr: "label",
                            searchEnabled: true,
                            stylingMode: 'filled',
                            placeholder: "Seleccione un artículo...",
                            dropDownOptions: {
                                wrapperAttr: {
                                    class: "popup-menu-container"
                                }
                            }
                        }}
                        validationRules={[{ type: 'required', message: "El artículo es obligatorio" }]}
                    />

                    <SimpleItem
                        dataField="partnerId"
                        label={{ text: "Cliente" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: customersDataSource,
                            valueExpr: "id",
                            displayExpr: "label",
                            searchEnabled: true,
                            stylingMode: 'filled',
                            placeholder: "Seleccione un cliente...",
                            dropDownOptions: {
                                wrapperAttr: {
                                    class: "popup-menu-container"
                                }
                            }
                        }}
                        validationRules={[{ type: 'required', message: "El cliente es obligatorio" }]}
                    />

                    <SimpleItem
                        dataField="quantity"
                        label={{ text: "Cantidad" }}
                        editorType="dxNumberBox"
                        editorOptions={{
                            min: 0.000001,
                            format: "#,##0.########",
                            valueChangeEvent: "blur",
                            stylingMode: 'filled',
                            placeholder: "Ingrese la cantidad",
                        }}
                        validationRules={[
                            { type: 'required', message: "La cantidad es obligatoria" },
                            {
                                type: 'custom',
                                validationCallback: (e: any) => {
                                    const num = Number(e.value);
                                    return !isNaN(num) && num > 0;
                                },
                                message: "La cantidad debe ser mayor a 0"
                            }
                        ]}
                    />

                    <SimpleItem
                        dataField="loanDate"
                        label={{ text: "Fecha de Préstamo" }}
                        editorType="dxDateBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: "Seleccione fecha de préstamo",
                            displayFormat: "dd/MM/yyyy",
                            onValueChanged: (e: any) => {
                                if (e.value) {
                                    formData.loanDate = getZeroTimeDate(e.value);
                                    const deadlineEditor = formRef.current?.instance().getEditor("returnDeadline");
                                    if (deadlineEditor?.option("value")) {
                                        deadlineEditor.validate();
                                    }
                                }
                            }
                        }}
                        validationRules={[{ type: 'required', message: "La fecha de préstamo es obligatoria" }]}
                    />

                    <SimpleItem
                        dataField="returnDeadline"
                        label={{ text: "Fecha de Devolución" }}
                        editorType="dxDateBox"
                        editorOptions={{
                            stylingMode: 'filled',
                            placeholder: "Seleccione fecha de devolución",
                            displayFormat: "dd/MM/yyyy",
                            onValueChanged: (e: any) => {
                                if (e.value) {
                                    formData.returnDeadline = getZeroTimeDate(e.value);
                                }
                            }
                        }}
                        validationRules={[
                            { type: 'required', message: "La fecha de devolución es obligatoria" },
                            {
                                type: 'custom',
                                validationCallback: (e: any) => {
                                    if (!e.value || !formData.loanDate) return true;
                                    const returnTime = new Date(getZeroTimeDate(e.value)).getTime();
                                    const loanTime = new Date(getZeroTimeDate(formData.loanDate)).getTime();
                                    return returnTime >= loanTime;
                                },
                                message: "La fecha de devolución debe ser igual o posterior a la fecha de préstamo"
                            }
                        ]}
                    />

                    <SimpleItem
                        dataField="notes"
                        label={{ text: "Notas" }}
                        editorType="dxTextArea"
                        editorOptions={{
                            placeholder: "Notas o comentarios adicionales...",
                            valueChangeEvent: "blur",
                            stylingMode: 'filled',
                            autoResizeEnabled: true,
                        }}
                    />
                </Form>
            </div>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Guardar"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                />
            </ToolbarItem>
        </Popup>
    );
}

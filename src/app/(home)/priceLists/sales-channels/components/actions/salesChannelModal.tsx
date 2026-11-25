"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from "@repo/devextreme";
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { salesChannelsService } from "@repo/erp-services/salesChannels.service";
import { useAuth } from "@/contexts/AuthContext";
import type { IFSalesChannel } from "@repo/api-contracts/erp";

interface SalesChannelModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
    initialData?: IFSalesChannel | null;
}

const emptyData = {
    code: "",
    name: "",
    companyId: "",
    active: true,
};

export default function SalesChannelModal({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    initialData,
}: SalesChannelModalProps) {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);
    const [formData, setFormData] = useState({
        ...emptyData,
        companyId: currentCompany?.id || "",
    });

    useEffect(() => {
        if (!isOpen) return;

        const nextData = initialData
            ? {
                  code: initialData.code || "",
                  name: initialData.name || "",
                  companyId: initialData.companyId || currentCompany?.id || "",
                  active: initialData.active ?? true,
              }
            : {
                  code: "",
                  name: "",
                  companyId: currentCompany?.id || "",
                  active: true,
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

        setLoading(true);
        try {
            if (initialData?.id) {
                await salesChannelsService.update(
                    initialData.id,
                    {
                        code: currentFormData.code,
                        name: currentFormData.name,
                        active: currentFormData.active,
                    },
                    token!,
                    currentFormData.companyId
                );
                notify("Canal actualizado exitosamente", "success", 3000);
            } else {
                await salesChannelsService.create(
                    {
                        code: currentFormData.code,
                        name: currentFormData.name,
                        companyId: currentFormData.companyId,
                        active: currentFormData.active,
                    },
                    token!
                );
                notify("Canal creado exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving sales channel:", error);
            notify(
                error instanceof Error ? error.message : "Error al guardar el canal",
                "error",
                3000
            );
        } finally {
            setLoading(false);
        }
    }, [formData, initialData?.id, token, onClose, onSuccess]);

    const formContent = useMemo(
        () => (
            <Form ref={formRef} formData={formData} labelLocation="top">
                <SimpleItem
                    dataField="code"
                    label={{ text: "Código" }}
                    validationRules={[
                        { type: "required", message: "El código es obligatorio" },
                        {
                            type: "stringLength",
                            max: 40,
                            message: "Máximo 40 caracteres",
                        },
                    ]}
                />
                <SimpleItem
                    dataField="name"
                    label={{ text: "Nombre" }}
                    validationRules={[
                        { type: "required", message: "El nombre es obligatorio" },
                    ]}
                />
                <SimpleItem
                    dataField="active"
                    label={{ text: "Activo" }}
                    editorType="dxCheckBox"
                />
            </Form>
        ),
        [formData]
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
            title={initialData ? "Editar Canal de Venta" : "Nuevo Canal de Venta"}
            width={420}
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

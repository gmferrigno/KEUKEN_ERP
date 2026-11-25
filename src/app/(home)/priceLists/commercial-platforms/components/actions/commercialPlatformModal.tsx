"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from '@repo/devextreme';
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import { mapCommercialCatalogError } from "@repo/erp-api-client";
import { useAuth } from "@/contexts/AuthContext";

interface CommercialPlatformModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
    initialData?: any;
}

const emptyPlatformData = {
    code: "",
    name: "",
    companyId: "",
    active: true,
    includeInDefaultPopulate: true,
};

export default function CommercialPlatformModal({
    isOpen,
    onClose,
    onSuccess,
    onHidden,
    initialData
}: CommercialPlatformModalProps) {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);

    const [formData, setFormData] = useState({
        ...emptyPlatformData,
        companyId: currentCompany?.id || "",
    });

    useEffect(() => {
        if (isOpen) {
            const nextData = initialData
                ? {
                    code: initialData.code || "",
                    name: initialData.name || "",
                    companyId: initialData.companyId || currentCompany?.id || "",
                    active: initialData.active ?? true,
                    includeInDefaultPopulate: initialData.includeInDefaultPopulate ?? true,
                }
                : {
                    code: "",
                    name: "",
                    companyId: currentCompany?.id || "",
                    active: true,
                    includeInDefaultPopulate: true,
                };

            setFormData(nextData);

            setTimeout(() => {
                const formInstance = formRef.current?.instance();
                if (formInstance) {
                    formInstance.option("formData", nextData);
                    if (typeof formInstance.reset === 'function') {
                        formInstance.reset();
                    }
                    formInstance.option("formData", nextData);
                }
            }, 0);
        }
    }, [isOpen, initialData, currentCompany?.id]);

    const handleHidden = useCallback(() => {
        setFormData({
            ...emptyPlatformData,
            companyId: currentCompany?.id || "",
        });
        setLoading(false);
        if (onHidden) {
            onHidden();
        }
    }, [onHidden, currentCompany?.id]);

    const handleSubmit = useCallback(async () => {
        const formInstance = formRef.current?.instance();
        const result = formInstance?.validate();
        if (!result?.isValid) return;

        const currentFormData = formInstance?.option("formData") || formData;

        setLoading(true);
        try {
            if (initialData?.id) {
                await commercialPlatformsService.update(
                    initialData.id,
                    {
                        code: currentFormData.code,
                        name: currentFormData.name,
                        active: currentFormData.active,
                        includeInDefaultPopulate: currentFormData.includeInDefaultPopulate,
                    },
                    token,
                    currentFormData.companyId
                );
                notify("Actualizado exitosamente", "success", 3000);
            } else {
                await commercialPlatformsService.create(currentFormData, token);
                notify("Creado exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving commercial platform:", error);
            notify(mapCommercialCatalogError(error), "error", 4500);
        } finally {
            setLoading(false);
        }
    }, [formData, initialData?.id, token, onClose, onSuccess]);

    const formContent = useMemo(() => (
        <Form
            ref={formRef}
            formData={formData}
            labelLocation="top"
        >
            <SimpleItem dataField="code" label={{ text: "Código" }} validationRules={[{ type: 'required', message: "El código es obligatorio" }]} />
            <SimpleItem dataField="name" label={{ text: "Nombre" }} validationRules={[{ type: 'required', message: "El nombre es obligatorio" }]} />
            <SimpleItem dataField="active" label={{ text: "Activo" }} editorType="dxCheckBox" />
            <SimpleItem dataField="includeInDefaultPopulate" label={{ text: "Por Defecto" }} editorType="dxCheckBox" />
        </Form>
    ), [formData]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={handleHidden}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? "Editar Plataforma" : "Nueva Plataforma"}
            width={400}
            height="auto"
            maxHeight="88vh"
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="p-4">
                {formContent}
            </div>
            <ToolbarItem toolbar="bottom" location="after">
                <Button text="Cancelar" onClick={onClose} disabled={loading} stylingMode="text" className="!bg-main/10" />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button text="Guardar" type="default" stylingMode="contained" onClick={handleSubmit} disabled={loading} className="!bg-focus-300 !text-variant" />
            </ToolbarItem>
        </Popup>
    );
}

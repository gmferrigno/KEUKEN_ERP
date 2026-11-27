"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Form, { SimpleItem } from "devextreme-react/form";
import { Button } from "@repo/devextreme";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { packagesService } from "@repo/erp-services/warehouse/packages.service";
import { ApiError } from "@repo/erp-api-client";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    onHidden?: () => void;
}

const emptyForm = () => ({
    sscc: "",
    transferId: "",
    parentPackageId: "",
});

export default function PackageModal({ isOpen, onClose, onSuccess, onHidden }: Props) {
    const { token, currentCompany } = useAuth();
    const formRef = useRef<any>(null);
    const [loading, setLoading] = useState(false);

    const [formData, setFormData] = useState(emptyForm);

    useEffect(() => {
        if (!isOpen) return;
        const next = emptyForm();
        setFormData(next);
        requestAnimationFrame(() => {
            const form = formRef.current?.instance?.();
            if (!form) return;
            form.reset?.({ ...next });
            form.updateDimensions?.();
        });
    }, [isOpen]);

    const handleSubmit = async () => {
        if (!token || !currentCompany?.id) return;
        const data =
            formRef.current?.instance?.()?.option?.("formData") || formData;

        setLoading(true);
        try {
            await packagesService.create(
                {
                    companyId: currentCompany.id,
                    sscc: String(data.sscc || "").trim() || null,
                    transferId: String(data.transferId || "").trim() || null,
                    parentPackageId: String(data.parentPackageId || "").trim() || null,
                },
                token
            );
            notify("Bulto creado (estado open)", "success", 2500);
            onSuccess();
            onClose();
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo crear el bulto",
                "error",
                4000
            );
        } finally {
            setLoading(false);
        }
    };

    const formJsx = useMemo(
        () => (
            <Form ref={formRef} formData={formData} labelLocation="top">
                <SimpleItem
                    dataField="sscc"
                    label={{ text: "SSCC (opcional)" }}
                    editorOptions={{
                        placeholder: "Si está en papelera, el BE puede revivirlo",
                        stylingMode: "filled",
                    }}
                />
                <SimpleItem
                    dataField="transferId"
                    label={{ text: "Transfer ID (opcional)" }}
                    editorOptions={{ stylingMode: "filled" }}
                />
                <SimpleItem
                    dataField="parentPackageId"
                    label={{ text: "Bulto padre (opcional)" }}
                    editorOptions={{ stylingMode: "filled" }}
                />
            </Form>
        ),
        [formData]
    );

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={onHidden}
            dragEnabled={false}
            hideOnOutsideClick
            showCloseButton
            showTitle
            title="Nuevo bulto WMS"
            width={480}
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
                    text={loading ? "Creando…" : "Crear"}
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

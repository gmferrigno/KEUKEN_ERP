"use client";

import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Form, { SimpleItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { Button } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { warehouseService } from "@repo/erp-services/warehouse/warehouse.service";
import { IWarehouseCreate } from "@repo/api-contracts/erp";
import { FIELD_LIMITS } from "@/app/lib/constants/common.constants";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

interface WarehouseCreationProps {
    onSuccess: () => Promise<void>;
    disabled?: boolean;
}

const WarehouseCreation = ({ onSuccess, disabled }: WarehouseCreationProps) => {
    const { currentCompany, token, permissions } = useAuth();
    const [isPopupVisible, setPopupVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);

    const [formData, setFormData] = useState<IWarehouseCreate>({
        name: "",
        code: "",
        company_id: currentCompany?.id ?? "",
    });

    useEffect(() => {
        if (isPopupVisible) {
            const nextData: IWarehouseCreate = {
                name: "",
                code: "",
                company_id: currentCompany?.id ?? "",
            };
            setFormData(nextData);

            setTimeout(() => {
                const formInstance = formRef.current?.instance();
                if (formInstance) {
                    formInstance.option("formData", nextData);
                    if (typeof formInstance.reset === "function") {
                        formInstance.reset();
                    }
                    formInstance.option("formData", nextData);
                }
            }, 0);
        }
    }, [isPopupVisible, currentCompany?.id]);

    const openPopup = useCallback(() => {
        setPopupVisible(true);
    }, []);

    const closePopup = useCallback(() => {
        setPopupVisible(false);
    }, []);

    const handleHiding = useCallback(() => {
        setPopupVisible(false);
        setFormData({
            name: "",
            code: "",
            company_id: currentCompany?.id ?? "",
        });
    }, [currentCompany?.id]);

    const handleSubmit = useCallback(async () => {
        const formInstance = formRef.current?.instance();
        const result = formInstance?.validate();

        if (!result?.isValid) return;

        if (!currentCompany?.id) {
            notify("No hay una empresa activa seleccionada", "error", 3000);
            return;
        }

        const currentFormData = formInstance?.option("formData") || formData;
        const payload: IWarehouseCreate = {
            name: currentFormData.name,
            code: currentFormData.code,
            company_id: currentCompany.id,
        };

        setLoading(true);
        try {
            await warehouseService.create(payload, token);
            notify("Almacén creado con éxito", "success", 2000);
            await onSuccess();
            closePopup();
        } catch (err: any) {
            console.error("Error al crear el almacén:", err);
            const errorMessage = err instanceof Error && err.message ? err.message : "Error al crear el almacén. Intente nuevamente.";
            notify(errorMessage, "error", 4000);
        } finally {
            setLoading(false);
        }
    }, [formData, currentCompany?.id, token, onSuccess, closePopup]);

    const canModify = useMemo(() => {
        return permissions ? canDo("modify", PERMISSIONS_CONSTANTS.modifyWarehouses, permissions) : false;
    }, [permissions]);

    if (!canModify || disabled) return null;

    return (
        <>
            <Button
                width={36}
                height={36}
                disabled={disabled}
                className="
                    !bg-primary-900/30 hover:!bg-primary-900/60
                    flex items-center justify-center !rounded-dx
                    !border !border-primary-0/20 hover:!border-focus-300/60
                    shadow-sm hover:shadow-black/5
                    transition-all duration-300 group !p-0"
                stylingMode="text"
                onClick={openPopup}
            >
                <div className="flex items-center justify-center w-full h-full">
                    <div className="size-7 bg-primary-0/10 rounded-dx flex justify-center items-center border border-primary-0/20 group-hover:bg-focus-500 group-hover:text-variant group-hover:border-focus-300 group-hover:scale-105 transition-all duration-300">
                        <i className="dx-icon-plus text-base !text-main group-hover:!text-variant"></i>
                    </div>
                </div>
            </Button>

            <Popup
                visible={isPopupVisible}
                onHiding={closePopup}
                onHidden={handleHiding}
                onShown={(e) => {
                    e.component.repaint();
                }}
                dragEnabled={false}
                hideOnOutsideClick={true}
                showCloseButton={true}
                showTitle={true}
                title="Nuevo Almacén"
                width={450}
                height="auto"
            >
                <Position at="center" my="center" />
                <div className="p-4">
                    <Form
                        ref={formRef}
                        formData={formData}
                        labelLocation="top"
                    >
                        <SimpleItem
                            dataField="code"
                            label={{ text: "Código" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "Código del almacén",
                                valueChangeEvent: "blur",
                                stylingMode: "filled",
                                maxLength: FIELD_LIMITS.stringTeeny,
                            }}
                            validationRules={[
                                { type: "required", message: "El código es obligatorio" },
                                { type: "stringLength", max: FIELD_LIMITS.stringTeeny, message: `El código no puede superar los ${FIELD_LIMITS.stringTeeny} caracteres` },
                            ]}
                        />
                        <SimpleItem
                            dataField="name"
                            label={{ text: "Nombre del Almacén" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "Nombre del almacén",
                                valueChangeEvent: "blur",
                                stylingMode: "filled",
                                maxLength: FIELD_LIMITS.stringLong,
                            }}
                            validationRules={[
                                { type: "required", message: "El nombre del almacén es obligatorio" },
                                { type: "stringLength", max: FIELD_LIMITS.stringLong, message: `El nombre no puede superar los ${FIELD_LIMITS.stringLong} caracteres` },
                            ]}
                        />
                        <SimpleItem
                            dataField="companyName"
                            label={{ text: "Empresa" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                value: currentCompany?.name || "",
                                disabled: true,
                                stylingMode: "filled",
                            }}
                        />
                    </Form>
                </div>

                <ToolbarItem toolbar="bottom" location="after">
                    <Button
                        text="Cancelar"
                        onClick={closePopup}
                        disabled={loading}
                        stylingMode="text"
                        className="!bg-main/10"
                    />
                </ToolbarItem>
                <ToolbarItem toolbar="bottom" location="after">
                    <Button
                        text="Crear"
                        type="default"
                        stylingMode="contained"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="!bg-focus-300 !text-variant"
                    />
                </ToolbarItem>
            </Popup>
        </>
    );
};

export default WarehouseCreation;


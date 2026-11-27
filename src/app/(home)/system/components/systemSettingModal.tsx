"use client";

import { systemService } from "@repo/erp-services/system.service";
import { IFSystemSetting, IFSystemSettingUpdate } from "@repo/api-contracts/erp";
import { SYSTEM_KEY_TEMPLATES } from "@/app/lib/constants/systemKeys.constants";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";

interface SystemSettingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: IFSystemSetting | null;
}

const SystemSettingModal = ({ isOpen, onClose, onSuccess, initialData }: SystemSettingModalProps) => {
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const formRef = useRef<any>(null);
    const { token } = useAuth();
    const [existingKeys, setExistingKeys] = useState<string[]>([]);

    const [formData, setFormData] = useState<IFSystemSettingUpdate & { key: string }>({
        key: "",
        category: "",
        dataType: "string",
        description: "",
        isReadOnly: false,
        isSecret: false,
        value: "",
    });

    useEffect(() => {
        let mounted = true;
        if (isOpen && token && !initialData) {
            systemService.getAll(token)
                .then(data => {
                    if (mounted) {
                        setExistingKeys(data.map(item => item.key));
                    }
                })
                .catch(err => {
                    console.error("Error loading keys in modal:", err);
                });
        }
        return () => { mounted = false; };
    }, [isOpen, token, initialData]);

    const availableTemplates = useMemo(() => {
        return SYSTEM_KEY_TEMPLATES.filter(temp => !existingKeys.includes(temp.key));
    }, [existingKeys]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    key: initialData.key,
                    category: initialData.category || "",
                    dataType: initialData.dataType || "string",
                    description: initialData.description || "",
                    isReadOnly: initialData.isReadOnly ?? false,
                    isSecret: initialData.isSecret ?? false,
                    value: initialData.value || "",
                });
            } else {
                setFormData({
                    key: "",
                    category: "",
                    dataType: "string",
                    description: "",
                    isReadOnly: false,
                    isSecret: false,
                    value: "",
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData?.key]);

    const handleKeyChange = (key: string) => {
        const template = SYSTEM_KEY_TEMPLATES.find(t => t.key === key);
        if (template) {
            setFormData({
                key: key,
                category: template.category,
                dataType: template.dataType,
                description: template.description,
                isReadOnly: false,
                isSecret: template.isSecret ?? false,
                value: template.dataType === 'boolean' ? 'false' : '',
            });
        } else {
            setFormData(prev => ({ ...prev, key }));
        }
    };

    const handleSubmit = useCallback(async () => {
        const keyToSave = formData.key;
        if (!keyToSave) {
            notify("Debe seleccionar una clave", "error", 3000);
            return;
        }
        const result = formRef.current?.instance().validate();
        if (!result?.isValid) return;

        setLoading(true);
        try {
            await systemService.update(keyToSave, formData, token);
            notify(initialData ? "Configuración actualizada exitosamente" : "Configuración creada exitosamente", "success", 3000);
            onSuccess();
            onClose();
        } catch (error: unknown) {
            console.error("Error saving system setting:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al guardar la configuración";
            notify(errorMessage, "error", 3000);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, initialData?.key, onClose, onSuccess, token]);

    const getValueEditorOptions = () => {
        const baseOptions: Record<string, unknown> = {
            stylingMode: 'filled',
            elementAttr: { class: "rounded-dx" },
            disabled: formData.isReadOnly
        };

        if (formData.isSecret) {
            baseOptions.mode = 'password';
        }

        return baseOptions;
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? `Editar Configuración: ${initialData.key}` : "Crear Nueva Configuración"}
            width={550}
            height={480}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="p-4">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                    onFieldDataChanged={(e) => {
                        if (e.dataField !== "key") {
                            setFormData(prev => ({ ...prev, [e.dataField!]: e.value }));
                        }
                    }}
                >
                    <SimpleItem
                        dataField="key"
                        label={{ text: "Clave" }}
                        editorType="dxTextBox"
                        editorOptions={{
                            disabled: true,
                            stylingMode: 'filled',
                            elementAttr: { class: "rounded-dx" }
                        }}
                        visible={!!initialData}
                    />

                    <SimpleItem
                        dataField="key"
                        label={{ text: "Clave" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: availableTemplates,
                            valueExpr: "key",
                            displayExpr: "key",
                            value: formData.key,
                            onValueChanged: (e: { value: string }) => handleKeyChange(e.value),
                            searchEnabled: true,
                            placeholder: "Seleccione una clave...",
                            stylingMode: 'filled',
                            elementAttr: { class: "rounded-dx" }
                        }}
                        visible={!initialData}
                    />

                    <GroupItem colCount={2}>
                        <SimpleItem
                            dataField="category"
                            label={{ text: "Categoría" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                stylingMode: 'filled',
                                elementAttr: { class: "rounded-dx" }
                            }}
                            validationRules={[{ type: 'required', message: "La categoría es obligatoria" }]}
                        />
                        <SimpleItem
                            dataField="dataType"
                            label={{ text: "Tipo de Dato" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                stylingMode: 'filled',
                                disabled: true,
                                elementAttr: { class: "rounded-dx" }
                            }}
                        />
                    </GroupItem>

                    <SimpleItem
                        dataField="description"
                        label={{ text: "Descripción" }}
                        editorType="dxTextArea"
                        editorOptions={{
                            stylingMode: 'filled',
                            height: 60,
                            elementAttr: { class: "rounded-dx" }
                        }}
                    />

                    {formData.dataType === 'boolean' ? (
                        <SimpleItem
                            dataField="value"
                            label={{ text: "Valor" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                dataSource: [
                                    { value: "true", name: "Verdadero (True)" },
                                    { value: "false", name: "Falso (False)" }
                                ],
                                valueExpr: "value",
                                displayExpr: "name",
                                stylingMode: 'filled',
                                disabled: formData.isReadOnly,
                                elementAttr: { class: "rounded-dx" }
                            }}
                            validationRules={[{ type: 'required', message: "El valor es obligatorio" }]}
                        />
                    ) : formData.dataType === 'json' ? (
                        <SimpleItem
                            dataField="value"
                            label={{ text: "Valor (JSON)" }}
                            editorType="dxTextArea"
                            editorOptions={{
                                stylingMode: 'filled',
                                height: 80,
                                disabled: formData.isReadOnly,
                                elementAttr: { class: "rounded-dx" }
                            }}
                            validationRules={[
                                { type: 'required', message: "El valor es obligatorio" },
                                {
                                    type: 'custom',
                                    message: 'Debe ser un formato JSON válido',
                                    validationCallback: (options: { value?: string }) => {
                                        try {
                                            if (options.value) {
                                                JSON.parse(options.value);
                                            }
                                            return true;
                                        } catch {
                                            return false;
                                        }
                                    }
                                }
                            ]}
                        />
                    ) : (
                        <SimpleItem
                            dataField="value"
                            label={{ text: "Valor" }}
                            editorType="dxTextBox"
                            editorOptions={getValueEditorOptions()}
                            validationRules={[{ type: 'required', message: "El valor es obligatorio" }]}
                        />
                    )}

                    <GroupItem colCount={2} cssClass="mt-2">
                        <SimpleItem
                            dataField="isReadOnly"
                            label={{ text: "Lectura Sola" }}
                            editorType="dxCheckBox"
                            editorOptions={{
                                text: "Sólo lectura",
                            }}
                        />
                        <SimpleItem
                            dataField="isSecret"
                            label={{ text: "Secreto" }}
                            editorType="dxCheckBox"
                            editorOptions={{
                                text: "Ocultar valor (Secret)",
                            }}
                        />
                    </GroupItem>
                </Form>
            </div>

            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                    className="rounded-dx! bg-main/10!"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Guardar"
                    type="default"
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="bg-focus-300! shadow-lg shadow-black/20 text-variant!"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default SystemSettingModal;

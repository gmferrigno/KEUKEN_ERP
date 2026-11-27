"use client";

import { cashRegistersService } from "@repo/erp-services/accountant/cashRegisters.service";
import { IFCashRegister, IFCashRegisterCreation, IFCashRegisterType } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { useAccess } from "@repo/access";
import { Button } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

interface CashRegisterModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: IFCashRegister | null;
    registerTypes: IFCashRegisterType[];
}

const CashRegisterModal = ({ isOpen, onClose, onSuccess, initialData, registerTypes }: CashRegisterModalProps) => {
    const { token, currentCompany } = useAuth();
    const { canAccess } = useAccess();
    const canEditHierarchy = canAccess("treasury.cashRegisters.hierarchy");
    const [loading, setLoading] = useState(false);
    const [registers, setRegisters] = useState<IFCashRegister[]>([]);
    const formRef = useRef<any>(null);

    const [formData, setFormData] = useState<IFCashRegisterCreation & { active?: boolean }>({
        name: "",
        companyId: currentCompany?.id ?? "",
        registerType: "central_rendiciones",
        parentCashRegisterId: null,
        active: true,
    });

    const registersRef = useRef<IFCashRegister[]>([]);
    const formDataRef = useRef(formData);

    useEffect(() => {
        registersRef.current = registers;
    }, [registers]);

    useEffect(() => {
        formDataRef.current = formData;
    }, [formData]);

    useEffect(() => {
        let mounted = true;
        const fetchRegisters = async () => {
            if (!currentCompany?.id) return;
            try {
                const response = await cashRegistersService.getAll(token, currentCompany.id);
                if (mounted) {
                    const filtered = initialData?.id
                        ? response.items.filter(r => r.id !== initialData.id)
                        : response.items;
                    setRegisters(filtered);
                }
            } catch (error) {
                console.error("Error fetching parent cash registers:", error);
            }
        };

        if (isOpen) {
            fetchRegisters();
        }

        return () => { mounted = false; };
    }, [isOpen, token, currentCompany?.id, initialData?.id]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || "",
                    companyId: initialData.companyId || currentCompany?.id || "",
                    registerType: initialData.registerType || "central_rendiciones",
                    parentCashRegisterId: initialData.registerType === "tesoreria" ? null : (initialData.parentCashRegisterId || null),
                    active: initialData.active ?? true,
                });
            } else {
                setFormData({
                    name: "",
                    companyId: currentCompany?.id ?? "",
                    registerType: "central_rendiciones",
                    parentCashRegisterId: null,
                    active: true,
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, initialData?.id, currentCompany?.id]);

    const availableRegisterTypes = useMemo(() => {
        if (initialData?.registerType === "tesoreria") {
            return registerTypes.filter(t => t.id === "tesoreria");
        }
        return registerTypes.filter(t => t.id !== "tesoreria");
    }, [initialData?.registerType, registerTypes]);

    const availableParents = useMemo(() => {
        const getDescendants = (id: string, list: IFCashRegister[]): string[] => {
            const descendants: string[] = [];
            const queue = [id];
            while (queue.length > 0) {
                const currentId = queue.shift()!;
                const children = list.filter(r => r.parentCashRegisterId === currentId);
                for (const child of children) {
                    descendants.push(child.id);
                    queue.push(child.id);
                }
            }
            return descendants;
        };

        let list = registers;

        if (initialData?.id) {
            const descendants = getDescendants(initialData.id, registers);
            list = list.filter(r => r.id !== initialData.id && !descendants.includes(r.id));
        }

        if (formData.registerType === "central_rendiciones") {
            list = list.filter(r => r.registerType === "tesoreria");
        } else if (formData.registerType === "cajero_cobrador") {
            list = list.filter(r => r.registerType === "central_rendiciones");
        } else if (formData.registerType === "tesoreria") {
            list = [];
        }

        return list;
    }, [registers, formData.registerType, initialData?.id]);

    const handleSubmit = useCallback(async () => {
        const result = formRef.current?.instance().validate();
        if (!result?.isValid) return;

        setLoading(true);
        try {
            const dataToSave = {
                ...formData,
                companyId: currentCompany?.id || formData.companyId
            };

            if (initialData?.id) {
                await cashRegistersService.update(initialData.id, {
                    name: dataToSave.name,
                    registerType: dataToSave.registerType,
                    parentCashRegisterId: dataToSave.parentCashRegisterId,
                    active: dataToSave.active ?? true
                }, token);
                notify("Caja registradora actualizada exitosamente", "success", 3000);
            } else {
                await cashRegistersService.create(dataToSave, token);
                notify("Caja registradora creada exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving cash register:", error);
            const errorMessage = error?.message || "Error al guardar la caja registradora";
            notify(errorMessage, "error", 3000);
        } finally {
            setLoading(false);
        }
    }, [formData, initialData?.id, onClose, onSuccess, token, currentCompany?.id]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? "Editar Caja Registradora" : "Nueva Caja Registradora"}
            width={550}
            height="auto"
            maxHeight={450}
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
                        setFormData(prev => {
                            const updated = { ...prev, [e.dataField!]: e.value };
                            if (e.dataField === "registerType") {
                                updated.parentCashRegisterId = null;
                            }
                            return updated;
                        });
                    }}
                >
                    <GroupItem colCount={2}>
                        <SimpleItem
                            dataField="name"
                            label={{ text: "Nombre de la Caja" }}
                            editorType="dxTextBox"
                            colSpan={2}
                            editorOptions={{
                                placeholder: "Ej: Caja 01",
                                valueChangeEvent: "blur",
                                stylingMode: 'filled',
                            }}
                            validationRules={[{ type: 'required', message: "El nombre es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="registerType"
                            label={{ text: "Tipo de Caja" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                dataSource: availableRegisterTypes,
                                valueExpr: "id",
                                displayExpr: "name",
                                stylingMode: 'filled',
                                disabled: initialData?.registerType === "tesoreria",
                                dropDownOptions: {
                                    wrapperAttr: {
                                        class: "popup-menu-container"
                                    }
                                }
                            }}
                            validationRules={[{ type: 'required', message: "El tipo de caja es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="parentCashRegisterId"
                            label={{ text: "Caja Padre (Opcional)" }}
                            editorType="dxSelectBox"
                            visible={canEditHierarchy || Boolean(formData.parentCashRegisterId)}
                            editorOptions={{
                                dataSource: availableParents,
                                valueExpr: "id",
                                displayExpr: "name",
                                searchEnabled: true,
                                showClearButton: true,
                                stylingMode: 'filled',
                                disabled: formData.registerType === "tesoreria" || !canEditHierarchy,
                                dropDownOptions: {
                                    wrapperAttr: {
                                        class: "popup-menu-container"
                                    }
                                }
                            }}
                            validationRules={[
                                {
                                    type: 'custom',
                                    message: "La caja padre es obligatoria para este tipo de caja",
                                    validationCallback: (e) => {
                                        const currentType = formDataRef.current.registerType;
                                        if (currentType === "central_rendiciones" || currentType === "cajero_cobrador") {
                                            return !!e.value;
                                        }
                                        return true;
                                    }
                                },
                                {
                                    type: 'custom',
                                    message: "El tipo de la caja padre no es válido para este tipo de caja",
                                    validationCallback: (e) => {
                                        if (!e.value) return true;
                                        const parent = registersRef.current.find(r => r.id === e.value);
                                        if (!parent) return false;
                                        const currentType = formDataRef.current.registerType;
                                        if (currentType === "central_rendiciones") {
                                            return parent.registerType === "tesoreria";
                                        }
                                        if (currentType === "cajero_cobrador") {
                                            return parent.registerType === "central_rendiciones";
                                        }
                                        return true;
                                    }
                                }
                            ]}
                        />
                        <SimpleItem
                            dataField="active"
                            label={{ text: "Estado" }}
                            editorType="dxCheckBox"
                            colSpan={2}
                            editorOptions={{
                                text: "Activa / Habilitada",
                                stylingMode: 'filled',
                            }}
                        />
                    </GroupItem>
                </Form>
            </div>

            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={loading}
                    stylingMode="text"
                    className="rounded-dx! bg-main/10!"
                />
            </ToolbarItem>
            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
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

export default CashRegisterModal;

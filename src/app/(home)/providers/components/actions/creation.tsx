"use client";

import { providerService } from "@repo/erp-services/location_services/provider.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import { IFProvider, IFProviderCreation, IFProviderUpdate } from "@repo/api-contracts/erp";
import { IFCountry } from "@repo/api-contracts/erp";
import { IFState } from "@repo/api-contracts/erp";
import { IFCitie } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useRef, useState } from "react";

interface ProviderCreationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: IFProvider | null;
}

const ivaConditions = [
    { id: 'Responsable Inscripto', name: 'Responsable Inscripto' },
    { id: 'Monotributista', name: 'Monotributista' },
    { id: 'Exento', name: 'Exento' },
    { id: 'Consumidor Final', name: 'Consumidor Final' },
];

const ProviderCreationModal = ({ isOpen, onClose, onSuccess, initialData }: ProviderCreationModalProps) => {
    const { currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const formRef = useRef<any>(null);

    const { token } = useAuth();

    const [countries, setCountries] = useState<IFCountry[]>([]);
    const [states, setStates] = useState<IFState[]>([]);
    const [cities, setCities] = useState<IFCitie[]>([]);
    const [formData, setFormData] = useState<IFProviderCreation>({
        name: "",
        code: "",
        taxId: "",
        companyId: currentCompany?.id ?? "",
        email: "",
        countryIsoCode: "AR",
        stateCode: "",
        cityId: "",
        taxData: {
            ivaCondition: "Responsable Inscripto"
        }
    });

    useEffect(() => {
        const loadCountries = async () => {
            if (!token) return;
            try {
                const response = await countriesService.getAll(token);
                setCountries(response.items);
            } catch (error) {
                console.error("Error loading countries:", error);
            }
        };
        if (isOpen) {
            loadCountries();
        }
    }, [isOpen, token]);

    useEffect(() => {
        const loadStates = async () => {
            if (!token || !formData.countryIsoCode) {
                setStates([]);
                return;
            }
            try {
                const response = await statesService.getAll(token, formData.countryIsoCode);
                setStates(response.items);
            } catch (error) {
                console.error("Error loading states:", error);
            }
        };
        if (isOpen) {
            loadStates();
        }
    }, [formData.countryIsoCode, isOpen, token]);

    const selectedState = states.find(s => s.code === formData.stateCode);
    const stateId = selectedState?.id;

    useEffect(() => {
        const loadCities = async () => {
            if (!token || !stateId) {
                setCities([]);
                return;
            }
            try {
                const response = await citiesService.getAll(token, stateId);
                setCities(response.items);
            } catch (error) {
                console.error("Error loading cities:", error);
            }
        };
        if (isOpen) {
            loadCities();
        }
    }, [stateId, isOpen, token]);

    useEffect(() => {
        if (isOpen) {
            if (initialData) {
                setFormData({
                    name: initialData.name || "",
                    code: initialData.code || "",
                    taxId: initialData.taxId || "",
                    companyId: initialData.companyId || currentCompany?.id || "",
                    email: initialData.email || "",
                    countryIsoCode: initialData.countryIsoCode || "AR",
                    stateCode: initialData.stateCode || "",
                    cityId: initialData.cityId || "",
                    taxData: {
                        ivaCondition: "Responsable Inscripto" // Valor por defecto si no viene en el listado
                    }
                });
            } else {
                setFormData({
                    name: "",
                    code: "",
                    taxId: "",
                    companyId: currentCompany?.id ?? "",
                    email: "",
                    countryIsoCode: "AR",
                    stateCode: "",
                    cityId: "",
                    taxData: {
                        ivaCondition: "Responsable Inscripto"
                    }
                });
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, currentCompany?.id, initialData?.id]);

    const handleSubmit = useCallback(async () => {
        const result = formRef.current?.instance().validate();
        if (!result?.isValid) return;

        setLoading(true);
        try {
            if (initialData?.id) {
                const updateData: IFProviderUpdate = {
                    name: formData.name,
                    countryIsoCode: formData.countryIsoCode,
                    stateCode: formData.stateCode,
                    taxData: formData.taxData,
                    cityId: formData.cityId,
                    email: formData.email,
                    taxId: formData.taxId,
                };
                await providerService.update(initialData.id, updateData, token);
                notify("Proveedor actualizado exitosamente", "success", 3000);
            } else {
                await providerService.create(formData, token);
                notify("Proveedor creado exitosamente", "success", 3000);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error("Error saving provider:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al guardar el proveedor";
            notify(errorMessage, "error", 3000);
        } finally {
            setLoading(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [formData, initialData?.id, onClose, onSuccess, token]);

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            dragEnabled={false}
            hideOnOutsideClick={false}
            showCloseButton={true}
            showTitle={true}
            title={initialData ? "Editar Proveedor" : "Nuevo Proveedor"}
            width={700}
            height="auto"
            maxHeight={750}
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="p-2">
                <Form
                    ref={formRef}
                    formData={formData}
                    labelLocation="top"
                    colCount={2}
                    scrollingEnabled={false}
                    onFieldDataChanged={(e) => {
                        const currentFormVal = e.component.option("formData");
                        if (e.dataField === "countryIsoCode") {
                            currentFormVal.stateCode = "";
                            e.component.updateData("stateCode", "");
                            currentFormVal.cityId = "";
                            e.component.updateData("cityId", "");
                        }
                        if (e.dataField === "stateCode") {
                            currentFormVal.cityId = "";
                            e.component.updateData("cityId", "");
                        }
                        setFormData({ ...currentFormVal });
                    }}
                >
                    <GroupItem caption="Información General" colSpan={2} colCount={2}>
                        <SimpleItem
                            dataField="name"
                            label={{ text: "Razón Social / Nombre" }}
                            editorType="dxTextBox"
                            colSpan={2}
                            editorOptions={{
                                placeholder: "Ej: Distribuidora S.A.",
                                stylingMode: 'filled',
                            }}
                            validationRules={[{ type: 'required', message: "El nombre es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="code"
                            label={{ text: "Código de Proveedor" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "Ej: PROV-001",
                                stylingMode: 'filled',
                                readOnly: !!initialData
                            }}
                            validationRules={[{ type: 'required', message: "El código es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="taxId"
                            label={{ text: "CUIT / Tax ID" }}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "Ej: 30-XXXXXXXX-X",
                                stylingMode: 'filled',
                            }}
                            validationRules={[{ type: 'required', message: "El Tax ID es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="email"
                            label={{ text: "Correo Electrónico" }}
                            colSpan={2}
                            editorType="dxTextBox"
                            editorOptions={{
                                placeholder: "ejemplo@correo.com",
                                stylingMode: 'filled',
                            }}
                            validationRules={[
                                { type: 'required', message: "El email es obligatorio" },
                                { type: 'email', message: "Email inválido" }
                            ]}
                        />
                    </GroupItem>

                    <GroupItem caption="Localización y Fiscal" colSpan={2} colCount={2}>
                        <SimpleItem
                            dataField="countryIsoCode"
                            label={{ text: "País" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                dataSource: countries,
                                valueExpr: "code",
                                displayExpr: "name",
                                placeholder: "Seleccione un país...",
                                stylingMode: 'filled',
                                searchEnabled: true,
                                dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } }
                            }}
                            validationRules={[{ type: 'required', message: "El país es obligatorio" }]}
                        />
                        <SimpleItem
                            dataField="stateCode"
                            label={{ text: "Provincia / Estado" }}
                            editorType="dxSelectBox"
                            editorOptions={{
                                dataSource: states,
                                valueExpr: "code",
                                displayExpr: "name",
                                placeholder: "Seleccione una provincia...",
                                noDataText: formData.countryIsoCode ? "Cargando provincias..." : "Seleccione un país primero",
                                stylingMode: 'filled',
                                searchEnabled: true,
                                dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } }
                            }}
                            validationRules={[{ type: 'required', message: "La provincia es obligatoria" }]}
                        />
                        <SimpleItem
                            dataField="cityId"
                            label={{ text: "Ciudad" }}
                            editorType="dxSelectBox"
                            colSpan={2}
                            editorOptions={{
                                dataSource: cities,
                                valueExpr: "id",
                                displayExpr: "name",
                                placeholder: "Seleccione una ciudad...",
                                noDataText: formData.stateCode ? "Cargando ciudades..." : "Seleccione una provincia primero",
                                stylingMode: 'filled',
                                searchEnabled: true,
                                dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } }
                            }}
                            validationRules={[{ type: 'required', message: "La ciudad es obligatoria" }]}
                        />
                        <SimpleItem
                            dataField="taxData.ivaCondition"
                            label={{ text: "Condición de IVA" }}
                            colSpan={2}
                            editorType="dxSelectBox"
                            editorOptions={{
                                dataSource: ivaConditions,
                                valueExpr: "id",
                                displayExpr: "name",
                                stylingMode: 'filled',
                                dropDownOptions: { wrapperAttr: { class: "popup-menu-container" } }
                            }}
                            validationRules={[{ type: 'required', message: "La condición de IVA es obligatoria" }]}
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
                    className="!bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    type="default"
                    text={initialData ? "Actualizar" : "Crear Proveedor"}
                    stylingMode="contained"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default ProviderCreationModal;

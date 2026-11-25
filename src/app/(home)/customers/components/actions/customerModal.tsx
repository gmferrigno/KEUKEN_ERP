import { customersService } from "@repo/erp-services/partners/customers.service";
import { IFCustomerCreate, IFCustomerUpdate } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from '@repo/devextreme';
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import Form, { Item } from "devextreme-react/form";
import LoadIndicator from "devextreme-react/load-indicator";
import notify from "devextreme/ui/notify";
import { useEffect, useRef, useState, useCallback } from "react";
import MetadataFieldsClient from "@/components/metadata/MetadataFieldsClient";
import { metadataService } from "@repo/erp-services/metadata.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import { fiscalPositionsService } from "@repo/erp-services/accountant/fiscalPositions.service";

interface CustomerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    customerId?: string | null;
}

const CustomerModal = ({ isOpen, onClose, onSuccess, customerId }: CustomerModalProps) => {
    const { token, currentCompany } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [formData, setFormData] = useState<any>({});
    const formRef = useRef<any>(null);

    const [metadataState, setMetadataState] = useState<{
        loading: boolean;
        visible: boolean;
        attributes?: any[];
        groups?: any[];
        values?: any;
        error?: string;
    }>({
        loading: false,
        visible: false,
    });

    useEffect(() => {
        if (!isOpen) {
            setMetadataState({
                loading: false,
                visible: false,
            });
        }
    }, [isOpen]);

    const handleToggleMetadata = useCallback(async (forceRefresh?: boolean) => {
        const hasNoAttributes = metadataState.attributes && metadataState.attributes.filter(a => a.isVisible && !a.isSystemInternal).length === 0;

        if (!metadataState.loading && metadataState.attributes && !forceRefresh && !hasNoAttributes) {
            setMetadataState(prev => ({
                ...prev,
                visible: !prev.visible
            }));
            return;
        }

        setMetadataState(prev => ({
            ...prev,
            loading: true,
            visible: true,
        }));

        try {
            const [attributes, groups, values] = await Promise.all([
                metadataService.getAttributes("common.customer", token, true),
                metadataService.getGroups("common.customer", token),
                metadataService.getValues("common.customer", customerId!, token)
            ]);
            setMetadataState({
                loading: false,
                visible: true,
                attributes,
                groups,
                values
            });
        } catch (err: any) {
            console.error("Error al cargar metadatos de cliente:", err);
            setMetadataState({
                loading: false,
                visible: true,
                error: "No se pudieron cargar los metadatos de este cliente."
            });
        }
    }, [token, customerId, metadataState.loading, metadataState.attributes]);

    const [countries, setCountries] = useState<any[]>([]);

    const initialStatesRef = useRef<any[]>([]);
    const initialCitiesRef = useRef<any[]>([]);
    const initialFiscalRef = useRef<any[]>([]);

    const stateEditorRef = useRef<any>(null);
    const cityEditorRef = useRef<any>(null);
    const fiscalEditorRef = useRef<any>(null);

    const loadFiscalPositions = useCallback(async () => {
        if (!token || !currentCompany?.id) {
            initialFiscalRef.current = [];
            fiscalEditorRef.current?.option("dataSource", []);
            fiscalEditorRef.current?.option("disabled", true);
            return;
        }
        try {
            const res = await fiscalPositionsService.getAll(token, currentCompany.id);
            initialFiscalRef.current = (res.items || []).filter((p) => p.active);
            fiscalEditorRef.current?.option("dataSource", initialFiscalRef.current);
            fiscalEditorRef.current?.option("disabled", false);
        } catch {
            initialFiscalRef.current = [];
            fiscalEditorRef.current?.option("dataSource", []);
            fiscalEditorRef.current?.option("disabled", true);
        }
    }, [token, currentCompany?.id]);

    useEffect(() => {
        if (!token) return;
        countriesService.getAll(token).then(res => setCountries(res.items)).catch(() => setCountries([]));
    }, [token]);

    useEffect(() => {
        if (isOpen && customerId && token) {
            fetchCustomer(customerId);
        } else if (isOpen && !customerId) {
            initialStatesRef.current = [];
            initialCitiesRef.current = [];
            initialFiscalRef.current = [];
            setFormData({
                companyId: currentCompany?.id || "",
                fiscalPositionId: "",
            });
            loadFiscalPositions();
        }
    }, [isOpen, customerId, token, currentCompany, loadFiscalPositions]);

    const fetchCustomer = async (id: string) => {
        if (!token) return;
        setIsLoading(true);
        try {
            const customer = await customersService.getById(id, token);

            const [statesRes, fiscalRes] = await Promise.all([
                customer.countryIsoCode
                    ? statesService.getAll(token, customer.countryIsoCode).catch(() => ({ items: [] }))
                    : Promise.resolve({ items: [] }),
                currentCompany?.id
                    ? fiscalPositionsService.getAll(token, currentCompany.id).catch(() => ({ items: [], total: 0 }))
                    : Promise.resolve({ items: [], total: 0 }),
            ]);
            initialStatesRef.current = statesRes.items || [];
            initialFiscalRef.current = (fiscalRes.items || []).filter((p) => p.active);

            if (customer.stateId) {
                const citiesRes = await citiesService.getAll(token, customer.stateId).catch(() => ({ items: [] }));
                initialCitiesRef.current = citiesRes.items || [];
            } else {
                initialCitiesRef.current = [];
            }

            setFormData({
                ...customer,
                fiscalPositionId: customer.fiscalPositionId || "",
            });
        } catch (error) {
            console.error("Error fetching customer:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar datos del cliente";
            notify(errorMessage, "error", 3000);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!token) return;

        const validation = formRef.current?.instance().validate();
        if (!validation?.isValid) {
            notify("Por favor complete los campos requeridos", "warning", 3000);
            return;
        }

        setIsLoading(true);
        try {
            if (customerId) {
                const updateData: IFCustomerUpdate = {
                    name: formData.name,
                    email: formData.email,
                    countryIsoCode: formData.countryIsoCode,
                    stateCode: formData.stateCode,
                    cityCode: formData.cityCode,
                    minDaysToExpiryOrder: formData.minDaysToExpiryOrder,
                    minDaysToExpiryReception: formData.minDaysToExpiryReception,
                    fiscalPositionId: formData.fiscalPositionId,
                    taxData: formData.taxData ?? null,
                };
                await customersService.update(customerId, updateData, token);
                notify("Cliente actualizado exitosamente", "success", 3000);
            } else {
                const createData: IFCustomerCreate = {
                    code: formData.code,
                    companyId: formData.companyId,
                    name: formData.name,
                    email: formData.email,
                    taxId: formData.taxId,
                    fiscalPositionId: formData.fiscalPositionId,
                    countryIsoCode: formData.countryIsoCode,
                    stateCode: formData.stateCode,
                    cityCode: formData.cityCode,
                    minDaysToExpiryOrder: formData.minDaysToExpiryOrder,
                    minDaysToExpiryReception: formData.minDaysToExpiryReception,
                    taxData: formData.taxData ?? null,
                };
                await customersService.create(createData, token);
                notify("Cliente creado exitosamente", "success", 3000);
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Error saving customer:", error);
            notify(error instanceof Error ? error.message : "Error al guardar cliente", "error", 3000);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            onHidden={() => {
                setFormData({});
                if (formRef.current) {
                    formRef.current.instance().reset();
                }
            }}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            title={customerId ? "Editar Cliente" : "Nuevo Cliente"}
            width={600}
            height={500}
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            <div className="flex flex-col gap-4 p-4 h-full overflow-y-auto custom-scrollbar">
                {isLoading || (customerId && !formData.id) || (!customerId && !formData.companyId) ? (
                    <div className="flex flex-1 min-h-[280px] w-full flex-col items-center justify-center gap-3 text-main/60">
                        <LoadIndicator visible height={36} width={36} />
                        <span className="text-sm text-center">
                            {customerId
                                ? "Cargando datos del cliente..."
                                : "Preparando formulario..."}
                        </span>
                    </div>
                ) : (
                    <>
                        <Form
                            ref={formRef}
                            formData={formData}
                            labelLocation="top"
                            showValidationSummary={true}
                            colCount={2}
                        >
                            {!customerId && (
                                <Item
                                    dataField="code"
                                    editorType="dxTextBox"
                                    isRequired={true}
                                    label={{ text: "Código" }}
                                />
                            )}
                            <Item
                                dataField="name"
                                editorType="dxTextBox"
                                isRequired={true}
                                colSpan={customerId ? 2 : 1}
                                label={{ text: "Nombre / Razón Social" }}
                            />
                            <Item
                                dataField="email"
                                editorType="dxTextBox"
                                isRequired={true}
                                colSpan={2}
                                label={{ text: "Email" }}
                            />
                            {!customerId && (
                                <Item
                                    dataField="taxId"
                                    editorType="dxTextBox"
                                    isRequired={true}
                                    label={{ text: "Identificación Fiscal" }}
                                />
                            )}
                            <Item
                                dataField="countryIsoCode"
                                editorType="dxSelectBox"
                                isRequired={true}
                                label={{ text: "País" }}
                                editorOptions={{
                                    dataSource: countries,
                                    valueExpr: "code",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione un país...",
                                    onValueChanged: (e: any) => {
                                        if (e.event) {
                                            formRef.current?.instance().updateData("stateCode", "");
                                            formRef.current?.instance().updateData("cityCode", "");

                                            stateEditorRef.current?.option("dataSource", []);
                                            stateEditorRef.current?.option("disabled", true);
                                            cityEditorRef.current?.option("dataSource", []);
                                            cityEditorRef.current?.option("disabled", true);

                                            if (e.value) {
                                                statesService.getAll(token!, e.value).then(res => {
                                                    stateEditorRef.current?.option("dataSource", res.items);
                                                    stateEditorRef.current?.option("disabled", false);
                                                });
                                            }
                                        }
                                    }
                                }}
                            />
                            <Item
                                dataField="stateCode"
                                editorType="dxSelectBox"
                                isRequired={true}
                                label={{ text: "Estado/Provincia" }}
                                editorOptions={{
                                    onInitialized: (e: any) => { stateEditorRef.current = e.component; },
                                    dataSource: initialStatesRef.current,
                                    valueExpr: "code",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione una provincia...",
                                    disabled: !formData.countryIsoCode,
                                    onValueChanged: (e: any) => {
                                        if (e.event) {
                                            formRef.current?.instance().updateData("cityCode", "");

                                            cityEditorRef.current?.option("dataSource", []);
                                            cityEditorRef.current?.option("disabled", true);

                                            if (e.value) {
                                                const statesArray = stateEditorRef.current?.option("dataSource") || initialStatesRef.current;
                                                const stateObj = statesArray.find((s: any) => s.code === e.value);

                                                if (stateObj) {
                                                    citiesService.getAll(token!, stateObj.id).then(res => {
                                                        cityEditorRef.current?.option("dataSource", res.items);
                                                        cityEditorRef.current?.option("disabled", false);
                                                    });
                                                }
                                            }
                                        }
                                    }
                                }}
                            />
                            <Item
                                dataField="cityCode"
                                editorType="dxSelectBox"
                                isRequired={true}
                                label={{ text: "Ciudad" }}
                                editorOptions={{
                                    onInitialized: (e: any) => { cityEditorRef.current = e.component; },
                                    dataSource: initialCitiesRef.current,
                                    valueExpr: "code",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione una ciudad...",
                                    disabled: !formData.stateCode,
                                }}
                            />
                            <Item
                                dataField="fiscalPositionId"
                                editorType="dxSelectBox"
                                isRequired={true}
                                label={{ text: "Condición IVA" }}
                                editorOptions={{
                                    onInitialized: (e: any) => {
                                        fiscalEditorRef.current = e.component;
                                        if (initialFiscalRef.current.length) {
                                            e.component.option({
                                                dataSource: initialFiscalRef.current,
                                                disabled: false,
                                            });
                                        }
                                    },
                                    dataSource: initialFiscalRef.current,
                                    valueExpr: "id",
                                    displayExpr: "name",
                                    searchEnabled: true,
                                    placeholder: "Seleccione la condición IVA...",
                                    disabled: !currentCompany?.id,
                                }}
                            />
                            <Item
                                dataField="minDaysToExpiryOrder"
                                editorType="dxNumberBox"
                                label={{ text: "Días mín. venc. Orden" }}
                            />
                            <Item
                                dataField="minDaysToExpiryReception"
                                editorType="dxNumberBox"
                                label={{ text: "Días mín. venc. Recepción" }}
                            />
                        </Form>

                        {/* Metadatos Dinámicos (solo en edición) */}
                        {customerId && (
                            <div className="mt-6 border-t border-main/10 pt-4">
                                <MetadataFieldsClient
                                    entityType="common.customer"
                                    entityId={customerId}
                                    title="Metadatos del Cliente"
                                    mode="tabs"
                                    canEdit={true}
                                    onToggle={handleToggleMetadata}
                                    isToggled={metadataState.visible}
                                    loading={metadataState.loading}
                                    error={metadataState.error}
                                    attributes={metadataState.attributes}
                                    groups={metadataState.groups}
                                    initialFetchedValues={metadataState.values}
                                />
                            </div>
                        )}
                    </>
                )}
            </div>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cancelar"
                    onClick={onClose}
                    disabled={isLoading}
                    stylingMode="text"
                    className="!rounded-dx !bg-main/10"
                />
            </ToolbarItem>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    type="default"
                    text="Guardar"
                    stylingMode="contained"
                    onClick={handleSave}
                    disabled={isLoading}
                    className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default CustomerModal;

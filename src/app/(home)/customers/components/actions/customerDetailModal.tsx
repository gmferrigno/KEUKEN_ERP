import { customersService } from "@repo/erp-services/partners/customers.service";
import { IFCustomerFull } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { Popup } from "devextreme-react/popup";
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import LoadIndicator from "devextreme-react/load-indicator";
import { useEffect, useState, useCallback } from "react";
import React from "react";
import notify from "devextreme/ui/notify";
import MetadataFieldsClient from "@/components/metadata/MetadataFieldsClient";
import { metadataService } from "@repo/erp-services/metadata.service";
import CustomerPaymentTermsEffective from "./CustomerPaymentTermsEffective";

interface CustomerDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    customerId: string | null;
}

const CustomerDetailModal = ({ isOpen, onClose, customerId }: CustomerDetailModalProps) => {
    const { token } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [customerFull, setCustomerFull] = useState<IFCustomerFull | null>(null);

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
                metadataService.getValues("common.customer", customerId ?? "", token)
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

    useEffect(() => {
        if (isOpen && customerId && token) {
            fetchCustomerFull(customerId);
        } else if (!isOpen) {
            setCustomerFull(null);
        }
    }, [isOpen, customerId, token]);

    const fetchCustomerFull = async (id: string) => {
        setIsLoading(true);
        try {
            const data = await customersService.getFullById(id, token!);
            setCustomerFull(data);
        } catch (error) {
            console.error("Error fetching full customer:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar detalles del cliente";
            notify(errorMessage, "error", 3000);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const renderAddresses = () => {
        if (!customerFull?.addresses || customerFull.addresses.length === 0) {
            return (
                <div className="mt-2 p-3 bg-main/5 rounded-dx text-sm text-main/60 border border-main/10">
                    No hay direcciones registradas para este cliente.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto border border-main/10 rounded-dx overflow-hidden shadow-none mt-3">
                <table className="w-full text-left border-collapse rounded-none">
                    <thead>
                        <tr className="bg-main/5 border-b border-main/10">
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Nombre / Tipo</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Cód. PDV</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Calle</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Ciudad</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Provincia</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider text-right">CP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerFull.addresses.map((addr, idx) => (
                            <tr
                                key={idx}
                                className={`${idx % 2 === 0 ? 'bg-primary-0/10' : 'bg-primary-0/20'} border-b border-main/5 last:border-0 hover:bg-focus-300/10 transition-colors duration-100`}
                            >
                                <td className="p-2 text-xs font-medium text-main">
                                    <div>{addr.name}</div>
                                    <div className="text-[10px] opacity-60 uppercase">{addr.type?.join(', ')}</div>
                                </td>
                                <td className="p-2 text-xs text-main">
                                    {addr.code ? (
                                        <span className="font-mono bg-focus-500/15 text-focus-300 px-1.5 py-0.5 rounded border border-focus-500/20 text-[11px]">
                                            {addr.code}
                                        </span>
                                    ) : (
                                        <span className="text-main/40 italic">—</span>
                                    )}
                                </td>
                                <td className="p-2 text-xs text-main">{addr.street || "—"}</td>
                                <td className="p-2 text-xs text-main">{addr.cityName || "—"}</td>
                                <td className="p-2 text-xs text-main">{addr.stateName || "—"}</td>
                                <td className="p-2 text-xs text-main text-right font-semibold">{addr.zip || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    const renderTaxExemptions = () => {
        if (!customerFull?.taxExemptions || customerFull.taxExemptions.length === 0) {
            return (
                <div className="mt-2 p-3 bg-main/5 rounded-dx text-sm text-main/60 border border-main/10">
                    No hay exenciones impositivas registradas.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto border border-main/10 rounded-dx overflow-hidden shadow-none mt-3">
                <table className="w-full text-left border-collapse rounded-none">
                    <thead>
                        <tr className="bg-main/5 border-b border-main/10">
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Impuesto</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Certificado</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Válido Desde</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">Válido Hasta</th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider text-right">Porcentaje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {customerFull.taxExemptions.map((tax, idx) => (
                            <tr
                                key={idx}
                                className={`${idx % 2 === 0 ? 'bg-primary-0/10' : 'bg-primary-0/20'} border-b border-main/5 last:border-0 hover:bg-focus-300/10 transition-colors duration-100`}
                            >
                                <td className="p-2 text-xs font-medium text-main">{tax.taxId}</td>
                                <td className="p-2 text-xs font-mono text-main/80">{tax.exemptionNumber || "—"}</td>
                                <td className="p-2 text-xs text-main">{tax.validFrom || "—"}</td>
                                <td className="p-2 text-xs text-main">{tax.validTo || "—"}</td>
                                <td className="p-2 text-xs text-main text-right font-semibold">{tax.percentage}%</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            title="Detalle del Cliente"
            width={800}
            height="90%"
            showCloseButton={true}
            wrapperAttr={{ class: "rounded-dx" }}
        >
            <div className="flex flex-col gap-4 p-2 h-full overflow-y-auto custom-scrollbar">
                {isLoading || !customerFull ? (
                    <div className="flex flex-1 min-h-[320px] w-full flex-col items-center justify-center gap-3 text-main/60">
                        <LoadIndicator visible height={36} width={36} />
                        <span className="text-sm text-center">
                            Cargando datos del cliente...
                        </span>
                    </div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <Form
                            formData={{
                                code: customerFull.customer.code,
                                name: customerFull.customer.name,
                                email: customerFull.customer.email,
                                taxId: customerFull.customer.taxId,
                                ivaCondition:
                                    customerFull.customer.fiscalPositionName ||
                                    customerFull.customer.fiscalPositionCode ||
                                    "—",
                                status: customerFull.customer.active ? "Activo" : "Inactivo",
                                country: customerFull.customer.countryIsoCode,
                                state: customerFull.customer.stateName || customerFull.customer.stateCode,
                                // cityLabel: display-only (BE city name/code); never written back
                                cityLabel:
                                    customerFull.customer.cityName ||
                                    customerFull.customer.cityCode ||
                                    "—",
                            }}
                            readOnly={true}
                            colCount={2}
                            scrollingEnabled={false}
                        >
                            {/* Card 1: Información General */}
                            <GroupItem
                                colSpan={2}
                                colCount={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                            >
                                <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-4 border-b border-main/10 pb-3 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold text-dx-primary mb-1">Información General</h3>
                                            <p className="text-xs opacity-60">Datos principales del cliente.</p>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-bold ${customerFull.customer.active ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                                            {customerFull.customer.active ? "ACTIVO" : "INACTIVO"}
                                        </span>
                                    </div>
                                </SimpleItem>

                                <SimpleItem dataField="code" label={{ text: "Código" }} editorOptions={{ stylingMode: "filled" }} />
                                <SimpleItem dataField="name" label={{ text: "Razón Social" }} editorOptions={{ stylingMode: "filled" }} />
                                <SimpleItem dataField="email" label={{ text: "Email" }} editorOptions={{ stylingMode: "filled" }} />
                            </GroupItem>

                            {/* Card 2: Información Fiscal */}
                            <GroupItem
                                colSpan={2}
                                colCount={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                            >
                                <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-4 border-b border-main/10 pb-3">
                                        <h3 className="text-lg font-bold text-dx-primary mb-1">Información Fiscal</h3>
                                        <p className="text-xs opacity-60">Datos impositivos principales.</p>
                                    </div>
                                </SimpleItem>

                                <SimpleItem dataField="taxId" label={{ text: "Identificación Fiscal" }} editorOptions={{ stylingMode: "filled" }} />
                                <SimpleItem dataField="ivaCondition" label={{ text: "Condición IVA" }} editorOptions={{ stylingMode: "filled" }} />
                            </GroupItem>
                            
                            {/* Card 3: Ubicación Principal */}
                            <GroupItem
                                colSpan={2}
                                colCount={3}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                            >
                                <SimpleItem colSpan={3} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-4 border-b border-main/10 pb-3">
                                        <h3 className="text-lg font-bold text-dx-primary mb-1">Ubicación Principal</h3>
                                    </div>
                                </SimpleItem>

                                <SimpleItem dataField="country" label={{ text: "País" }} editorOptions={{ stylingMode: "filled" }} />
                                <SimpleItem dataField="state" label={{ text: "Estado/Provincia" }} editorOptions={{ stylingMode: "filled" }} />
                                <SimpleItem dataField="cityLabel" label={{ text: "Ciudad" }} editorOptions={{ stylingMode: "filled", readOnly: true }} />
                            </GroupItem>

                            {/* Card 4: Direcciones (Lista) */}
                            <GroupItem
                                colSpan={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                            >
                                <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-2 border-b border-main/10 pb-3 flex justify-between items-center">
                                        <div>
                                            <h3 className="text-lg font-bold text-dx-primary mb-1">Direcciones Registradas ({customerFull?.addresses?.length || 0})</h3>
                                            <p className="text-xs opacity-60">Sucursales y direcciones de envío/facturación.</p>
                                        </div>
                                    </div>
                                </SimpleItem>

                                <SimpleItem colSpan={2} label={{ visible: false }}>
                                    {renderAddresses()}
                                </SimpleItem>
                            </GroupItem>

                            {/* Card 5: Exenciones (Lista) */}
                            <GroupItem
                                colSpan={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                            >
                                <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-2 border-b border-main/10 pb-3">
                                        <h3 className="text-lg font-bold text-dx-primary mb-1">Exenciones de Impuestos ({customerFull?.taxExemptions?.length || 0})</h3>
                                    </div>
                                </SimpleItem>

                                <SimpleItem colSpan={2} label={{ visible: false }}>
                                    {renderTaxExemptions()}
                                </SimpleItem>
                            </GroupItem>

                            <GroupItem
                                colSpan={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm"
                            >
                                <SimpleItem colSpan={2} label={{ visible: false }}>
                                    {customerFull?.id && (
                                        <CustomerPaymentTermsEffective
                                            customerId={customerFull.id}
                                            addresses={(customerFull.addresses || []).map((a: any) => ({
                                                id: a.id,
                                                label:
                                                    a.name ||
                                                    a.street ||
                                                    a.label ||
                                                    a.id,
                                            }))}
                                        />
                                    )}
                                </SimpleItem>
                            </GroupItem>
                        </Form>

                        {/* Metadatos Dinámicos */}
                        <div className="mt-6 border-t border-main/10 pt-4">
                            <MetadataFieldsClient
                                entityType="common.customer"
                                entityId={customerFull.customer.id}
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
                    </div>
                )}
            </div>
        </Popup>
    );
};

export default React.memo(CustomerDetailModal);

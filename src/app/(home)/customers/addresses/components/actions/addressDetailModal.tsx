'use client';

import { IFCustomerAddress } from "@repo/api-contracts/erp";
import { customerAddressesService } from "@repo/erp-services/partners/customerAddresses.service";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@repo/devextreme";
import { Popup, ToolbarItem } from "devextreme-react/popup";
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import LoadIndicator from "devextreme-react/load-indicator";
import notify from "devextreme/ui/notify";
import React, { useEffect, useMemo, useState } from "react";

interface AddressDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    address: IFCustomerAddress | null;
    customerLabel?: string | null;
}

const ADDRESS_TYPE_LABELS: Record<string, string> = {
    sales: "Ventas",
    delivery: "Entrega",
    invoice: "Facturación",
    other: "Otro",
};

const dash = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
};

const AddressDetailModal = ({
    isOpen,
    onClose,
    address,
    customerLabel,
}: AddressDetailModalProps) => {
    const { token, currentCompany } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [detail, setDetail] = useState<IFCustomerAddress | null>(null);

    useEffect(() => {
        if (!isOpen) {
            setDetail(null);
            setIsLoading(false);
            return;
        }

        if (!address?.id || !address?.customerId || !token) {
            setDetail(address);
            return;
        }

        let cancelled = false;

        const load = async () => {
            setIsLoading(true);
            try {
                const fresh = await customerAddressesService.getById(
                    address.customerId,
                    address.id,
                    token,
                    currentCompany?.id
                );
                if (!cancelled) setDetail(fresh);
            } catch (error) {
                console.error("Error fetching address detail:", error);
                if (!cancelled) {
                    setDetail(address);
                    notify(
                        error instanceof Error
                            ? error.message
                            : "No se pudo cargar el detalle actualizado; se muestran datos del listado",
                        "warning",
                        3500
                    );
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        };

        void load();

        return () => {
            cancelled = true;
        };
    }, [isOpen, address?.id, address?.customerId, token, currentCompany?.id]);

    const current = detail;
    const isDeleted = Boolean(current?.deletedAt);

    const formData = useMemo(() => {
        if (!current) return {};
        return {
            customer: customerLabel || current.customerId || "—",
            name: dash(current.name),
            code: dash(current.code),
            type: Array.isArray(current.type)
                ? current.type.map((t) => ADDRESS_TYPE_LABELS[t] || t).join(", ")
                : "—",
            street: dash(current.street),
            city: dash(current.cityName),
            state: dash(current.stateName),
            country: dash(current.countryName),
            zip: dash(current.zip),
            geoLat: dash(current.geoLat),
            geoLon: dash(current.geoLon),
            deliveryAddressId: dash(current.deliveryAddressId),
            accountId: dash(current.accountId),
            creditLimit: dash(current.creditLimit),
            creditLimitEffective: dash(current.creditLimitEffective),
            pricelistId: dash(current.pricelistId),
            paymentTermId: dash(current.paymentTermId),
            salesChannelId: dash(current.salesChannelId),
            commercialPlatformId: dash(current.commercialPlatformId),
            deletedAt: current.deletedAt
                ? new Date(current.deletedAt).toLocaleString()
                : "—",
            deletedByName: dash(current.deletedByName),
        };
    }, [current, customerLabel]);

    const renderTitle = () => (
        <div className="w-full flex items-center justify-between gap-x-1">
            <span className="font-semibold text-base">Detalle de la Dirección</span>
            {isDeleted && (
                <span className="py-0.5 text-xs text-main/50">Borrado</span>
            )}
        </div>
    );

    const renderZones = () => {
        if (!current?.zones || current.zones.length === 0) {
            return (
                <div className="mt-2 p-3 bg-main/5 rounded-dx text-sm text-main/60 border border-main/10">
                    No hay zonas asociadas a esta dirección.
                </div>
            );
        }

        return (
            <div className="overflow-x-auto border border-main/10 rounded-dx overflow-hidden shadow-none mt-3">
                <table className="w-full text-left border-collapse rounded-none">
                    <thead>
                        <tr className="bg-main/5 border-b border-main/10">
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">
                                Nombre
                            </th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">
                                Código
                            </th>
                            <th className="p-2 text-xs font-bold text-dx-primary uppercase tracking-wider">
                                Tipo
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {current.zones.map((zone, idx) => (
                            <tr
                                key={zone.id || idx}
                                className={`${idx % 2 === 0 ? "bg-primary-0/10" : "bg-primary-0/20"} border-b border-main/5 last:border-0`}
                            >
                                <td className="p-2 text-xs font-medium text-main">{zone.name}</td>
                                <td className="p-2 text-xs text-main font-mono">{dash(zone.code)}</td>
                                <td className="p-2 text-xs text-main">
                                    {Array.isArray(zone.zoneType)
                                        ? zone.zoneType.join(", ")
                                        : "—"}
                                </td>
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
            titleRender={renderTitle}
            width={800}
            height="90%"
            showCloseButton={true}
            wrapperAttr={{ class: "rounded-dx" }}
        >
            <div className="flex flex-col gap-4 p-2 h-full overflow-y-auto custom-scrollbar">
                {isLoading || !current ? (
                    <div className="flex flex-1 min-h-[320px] w-full flex-col items-center justify-center gap-3 text-main/60">
                        <LoadIndicator visible height={36} width={36} />
                        <span className="text-sm text-center">
                            Cargando datos de la dirección...
                        </span>
                    </div>
                ) : (
                    <Form
                        formData={formData}
                        readOnly={true}
                        colCount={2}
                        scrollingEnabled={false}
                    >
                        <GroupItem
                            colSpan={2}
                            colCount={2}
                            cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                        >
                            <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                <div className="mb-4 border-b border-main/10 pb-3 flex justify-between items-center">
                                    <div>
                                        <h3 className="text-lg font-bold text-dx-primary mb-1">
                                            Información General
                                        </h3>
                                        <p className="text-xs opacity-60">
                                            Datos principales de la dirección / sucursal.
                                        </p>
                                    </div>
                                    <span
                                        className={`px-2 py-1 rounded text-xs font-bold ${
                                            current.active
                                                ? "bg-green-500/10 text-green-600"
                                                : "bg-red-500/10 text-red-600"
                                        }`}
                                    >
                                        {current.active ? "ACTIVO" : "INACTIVO"}
                                    </span>
                                </div>
                            </SimpleItem>

                            <SimpleItem
                                dataField="customer"
                                label={{ text: "Cliente" }}
                                colSpan={2}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="name"
                                label={{ text: "Nombre" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="code"
                                label={{ text: "Código PDV" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="type"
                                label={{ text: "Tipo" }}
                                colSpan={2}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                        </GroupItem>

                        <GroupItem
                            colSpan={2}
                            colCount={2}
                            cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                        >
                            <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                <div className="mb-4 border-b border-main/10 pb-3">
                                    <h3 className="text-lg font-bold text-dx-primary mb-1">
                                        Ubicación
                                    </h3>
                                    <p className="text-xs opacity-60">
                                        Dirección física y coordenadas.
                                    </p>
                                </div>
                            </SimpleItem>

                            <SimpleItem
                                dataField="street"
                                label={{ text: "Calle" }}
                                colSpan={2}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="country"
                                label={{ text: "País" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="state"
                                label={{ text: "Provincia" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="city"
                                label={{ text: "Ciudad" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="zip"
                                label={{ text: "Código postal" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="geoLat"
                                label={{ text: "Latitud" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="geoLon"
                                label={{ text: "Longitud" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                        </GroupItem>

                        <GroupItem
                            colSpan={2}
                            colCount={2}
                            cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                        >
                            <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                <div className="mb-4 border-b border-main/10 pb-3">
                                    <h3 className="text-lg font-bold text-dx-primary mb-1">
                                        Overrides comerciales
                                    </h3>
                                    <p className="text-xs opacity-60">
                                        Valores específicos de la sucursal (si aplica).
                                    </p>
                                </div>
                            </SimpleItem>

                            <SimpleItem
                                dataField="deliveryAddressId"
                                label={{ text: "Dirección de entrega (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="accountId"
                                label={{ text: "Cuenta corriente (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="creditLimit"
                                label={{ text: "Límite de crédito" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="creditLimitEffective"
                                label={{ text: "Límite efectivo" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="pricelistId"
                                label={{ text: "Lista de precios (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="paymentTermId"
                                label={{ text: "Condición de pago (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="salesChannelId"
                                label={{ text: "Canal de venta (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                            <SimpleItem
                                dataField="commercialPlatformId"
                                label={{ text: "Plataforma comercial (ID)" }}
                                editorOptions={{ stylingMode: "filled" }}
                            />
                        </GroupItem>

                        <GroupItem
                            colSpan={2}
                            cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm !mb-6"
                        >
                            <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                <div className="mb-2 border-b border-main/10 pb-3">
                                    <h3 className="text-lg font-bold text-dx-primary mb-1">
                                        Zonas ({current.zones?.length || 0})
                                    </h3>
                                    <p className="text-xs opacity-60">
                                        Zonas logísticas asociadas a la dirección.
                                    </p>
                                </div>
                            </SimpleItem>
                            <SimpleItem colSpan={2} label={{ visible: false }}>
                                {renderZones()}
                            </SimpleItem>
                        </GroupItem>

                        {isDeleted && (
                            <GroupItem
                                colSpan={2}
                                colCount={2}
                                cssClass="!p-5 !rounded-dx !bg-primary-0/40 !border !border-focus-100/40 !shadow-sm"
                            >
                                <SimpleItem colSpan={2} cssClass="!p-0" label={{ visible: false }}>
                                    <div className="mb-4 border-b border-main/10 pb-3">
                                        <h3 className="text-lg font-bold text-dx-primary mb-1">
                                            Auditoría de borrado
                                        </h3>
                                    </div>
                                </SimpleItem>
                                <SimpleItem
                                    dataField="deletedAt"
                                    label={{ text: "Fecha eliminación" }}
                                    editorOptions={{ stylingMode: "filled" }}
                                />
                                <SimpleItem
                                    dataField="deletedByName"
                                    label={{ text: "Eliminado por" }}
                                    editorOptions={{ stylingMode: "filled" }}
                                />
                            </GroupItem>
                        )}
                    </Form>
                )}
            </div>
            <ToolbarItem toolbar="bottom" location="after">
                <Button
                    text="Cerrar"
                    onClick={onClose}
                    disabled={isLoading}
                    stylingMode="contained"
                    type="normal"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default React.memo(AddressDetailModal);

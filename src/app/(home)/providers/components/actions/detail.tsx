"use client";

import { IFProvider, IFProviderFull } from "@repo/api-contracts/erp";
import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from '@repo/devextreme';
import Form, { GroupItem, SimpleItem } from "devextreme-react/form";
import { providerService } from "@repo/erp-services/location_services/provider.service";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import notify from "devextreme/ui/notify";
import { formatDate } from "@/lib/utils/formatter.helper";

interface ProviderDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    provider?: IFProvider | null;
}

const ProviderDetailModal = ({ isOpen, onClose, provider }: ProviderDetailModalProps) => {
    const { token } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullProvider, setFullProvider] = useState<IFProviderFull | null>(null);


    useEffect(() => {
        const fetchDetails = async () => {
            if (!provider?.id || !token) return;
            setLoading(true);
            try {
                const data = await providerService.getFull(provider.id, token);
                setFullProvider(data);
            } catch (error: any) {
                console.error("Error fetching provider full details", error);
                const errorMessage = error instanceof Error && error.message
                    ? error.message
                    : "Error al cargar los detalles del proveedor";
                notify(errorMessage, "error", 3000);
            } finally {
                setLoading(false);
            }
        };

        if (isOpen && provider?.id) {
            fetchDetails();
        } else {
            setFullProvider(null);
        }
    }, [isOpen, provider?.id, token]);

    const showLoading = loading || (isOpen && !!provider?.id && !fullProvider);

    const skeletonData = {
        name: "Cargando razón social...",
        code: "Cargando...",
        taxId: "Cargando...",
        email: "Cargando correo...",
        countryIsoCode: "...",
        stateName: "Cargando...",
        cityName: "Cargando...",
        taxData: {
            ivaCondition: "Cargando..."
        }
    };

    const isDeleted = Boolean(
        provider?.deletedAt ||
        (provider as any)?.deleted_at ||
        fullProvider?.deletedAt ||
        (fullProvider as any)?.deleted_at
    );

    const renderTitle = () => (
        <div className="w-full flex items-center justify-between gap-x-1">
            <span className="font-semibold text-base">Detalle del Proveedor</span>
            {isDeleted && (
                <span className="py-0.5 text-xs text-main/50">
                    Borrado
                </span>
            )}
        </div>
    );

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            titleRender={renderTitle}
            width={650}
            height="auto"
            maxHeight={600}
            className="custom-popup"
            deferRendering={false}
        >
            <Position at="center" my="center" />
            <div className="p-2 min-h-[200px] flex flex-col justify-between font-sans">
                {(!showLoading && !fullProvider) ? (
                    <div className="flex flex-col items-center justify-center flex-1 py-10">
                        <p className="text-sm text-main/50">No hay información disponible para este proveedor.</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <Form
                            formData={showLoading ? skeletonData : fullProvider}
                            readOnly={true}
                            labelLocation="top"
                            colCount={2}
                            scrollingEnabled={false}
                            className={showLoading ? "animate-pulse opacity-70" : ""}
                        >
                            <GroupItem caption="Información General" colSpan={2} colCount={2}>
                                <SimpleItem
                                    dataField="name"
                                    label={{ text: "Razón Social / Nombre" }}
                                    colSpan={2}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="code"
                                    label={{ text: "Código de Proveedor" }}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="taxId"
                                    label={{ text: "CUIT / Tax ID" }}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="email"
                                    label={{ text: "Correo Electrónico" }}
                                    colSpan={2}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                            </GroupItem>
                            <GroupItem caption="Localización y Fiscal" colSpan={2} colCount={2}>
                                <SimpleItem
                                    dataField="countryIsoCode"
                                    label={{ text: "País (ISO)" }}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="stateName"
                                    label={{ text: "Provincia / Estado" }}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="cityName"
                                    label={{ text: "Ciudad" }}
                                    colSpan={2}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                                <SimpleItem
                                    dataField="taxData.ivaCondition"
                                    label={{ text: "Condición de IVA" }}
                                    colSpan={2}
                                    editorOptions={{ stylingMode: 'filled' }}
                                />
                            </GroupItem>
                        </Form>

                        {}
                        <div className="border-t border-main/10 pt-4 flex justify-between text-xs text-main/40 font-medium">
                            <span>Creado: {showLoading ? "Cargando..." : formatDate(fullProvider?.createdAt)}</span>
                            <span>Actualizado: {showLoading ? "Cargando..." : formatDate(fullProvider?.updatedAt)}</span>
                        </div>
                    </div>
                )}
            </div>
            <ToolbarItem
                toolbar="bottom"
                location="after"
            >
                <Button
                    text="Cerrar"
                    onClick={onClose}
                    stylingMode="contained"
                    type="normal"
                />
            </ToolbarItem>
        </Popup>
    );
};

export default ProviderDetailModal;

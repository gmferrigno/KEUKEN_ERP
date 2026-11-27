'use client';

import { useCallback, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react/load-panel";
import { TextBox } from "devextreme-react/text-box";
import notify from "devextreme/ui/notify";
import { FIELD_LIMITS } from "@/app/lib/constants/common.constants";
import { stockService } from "@repo/erp-services/stock.service";
import { IFArticleStock } from "@repo/api-contracts/erp";
import { Button } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";

const ArticleStockSearch = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [stockDetail, setStockDetail] = useState<IFArticleStock | null>(null);
    const [hasSearched, setHasSearched] = useState(false);

    const [locationId, setLocationId] = useState("");
    const [itemId, setItemId] = useState("");
    const isFetchingRef = useRef(false);

    const { token, currentCompany } = useAuth();

    const handleSearch = useCallback(async () => {
        if (!locationId || !itemId || isFetchingRef.current) {
            if (!isFetchingRef.current) notify("Por favor ingrese ambos parámetros de búsqueda", "warning", 3000);
            return;
        }

        setIsLoading(true);
        isFetchingRef.current = true;
        setHasSearched(true);
        setStockDetail(null);

        try {
            const response = await stockService.getArticleStock({
                locationId: locationId,
                itemId: itemId
            }, token, currentCompany?.id);

            if (response) {
                setStockDetail(response);
            } else {
                notify("No se encontró stock para los criterios ingresados", "info", 3000);
            }
        } catch (error: any) {
            console.error("Error loading article stock:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al consultar el stock. Verifique los datos.";
            notify(errorMessage, "error", 3000);
        } finally {
            setIsLoading(false);
            isFetchingRef.current = false;
        }
    }, [locationId, itemId, token, currentCompany?.id]);

    return (
        <div className="w-full h-full relative flex flex-col min-h-0 gap-4 mt-2">
            <LoadPanel
                visible={isLoading}
                showPane={false}
                message="Consultando disponibilidad..."
            />

            <div className="w-full flex-1 flex flex-col min-h-0 gap-4">

                <div className="bg-primary-900/40 p-4 rounded-dx border border-main/10 w-full shadow-sm">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="flex-1 flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-semibold text-main/80 ml-0.5">ID o SKU de Artículo</label>
                            <TextBox
                                value={itemId}
                                valueChangeEvent="keyup"
                                onValueChanged={(e) => setItemId(e.value || '')}
                                placeholder="Ej. QUESO-GOUDA-001"
                                stylingMode="filled"
                                maxLength={FIELD_LIMITS.stringLong}
                                className="!rounded-dx w-full"
                                onEnterKey={handleSearch}
                            />
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5 w-full">
                            <label className="text-xs font-semibold text-main/80 ml-0.5">ID o Ruta de Ubicación</label>
                            <TextBox
                                value={locationId}
                                valueChangeEvent="keyup"
                                onValueChanged={(e) => setLocationId(e.value || '')}
                                placeholder="Ej. WH1.PASILLO_A"
                                stylingMode="filled"
                                maxLength={FIELD_LIMITS.stringLong}
                                className="!rounded-dx w-full"
                                onEnterKey={handleSearch}
                            />
                        </div>
                        <Button
                            text="Consultar Disponibilidad"
                            icon="search"
                            type="default"
                            stylingMode="contained"
                            onClick={handleSearch}
                            disabled={!locationId || !itemId || isLoading}
                            className="!bg-focus-300 !text-variant shadow-md shadow-black/10"
                        />
                    </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex flex-col custom-scrollbar">
                    {stockDetail ? (
                        <div className="w-full animate-in slide-in-from-top-4 duration-300">
                            <div className="relative overflow-hidden bg-primary-900/40 rounded-dx border border-main/10 shadow-sm flex flex-col md:flex-row w-full">
                                <div className="flex-1 p-5 md:p-6 flex flex-col gap-4">
                                    <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <h2 className="text-lg font-bold text-main">{stockDetail.itemName}</h2>
                                            <div className="px-2.5 py-0.5 bg-focus-500/20 text-focus-300 border border-focus-500/30 rounded-full hidden sm:flex items-center gap-1.5 text-xs">
                                                <span className="uppercase font-bold text-[10px]">SKU:</span>
                                                <span className="font-semibold">{stockDetail.itemSku}</span>
                                            </div>
                                        </div>
                                        <Button
                                            icon="refresh"
                                            type="default"
                                            stylingMode="text"
                                            onClick={handleSearch}
                                            disabled={isLoading}
                                            hint="Actualizar"
                                            className="!min-w-0 !rounded-full text-main hover:!text-focus-300"
                                        />
                                    </div>

                                    <div className="h-px w-full bg-main/10" />

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-main/40 text-[10px] font-bold uppercase tracking-wider">Producto</span>
                                            <span className="text-sm font-semibold text-main">{stockDetail.productName}</span>
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                            <span className="text-main/40 text-[10px] font-bold uppercase tracking-wider">Ubicación</span>
                                            <span className="text-sm font-semibold bg-main/5 px-2.5 py-1 rounded-dx border border-main/10 w-fit text-main">{stockDetail.locationName}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="w-full md:w-64 p-6 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-main/10 relative bg-main/5">
                                    <span className="text-main/40 text-[10px] font-bold uppercase tracking-wider mb-2">Stock Disponible</span>
                                    <div className="flex flex-col items-center">
                                        <span className="text-5xl font-black text-focus-300">
                                            {stockDetail.available}
                                        </span>
                                        <span className="text-main/60 text-xs uppercase font-bold mt-1">
                                            {stockDetail.uomName}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : hasSearched && !isLoading ? (
                        <GenericEmpty
                            icon="dx-icon-taskrejected"
                            title="Sin Stock Registrado"
                            description="No hay existencia de este artículo en el nodo consultado."
                            className="h-full"
                        />
                    ) : !isLoading ? (
                        <GenericEmpty
                            title="Esperando consulta..."
                            description="Ingresa un artículo y ubicación para conocer la disponibilidad."
                            className="h-full"
                        />
                    ) : null}
                </div>
            </div>
        </div>
    );
};

export default ArticleStockSearch;

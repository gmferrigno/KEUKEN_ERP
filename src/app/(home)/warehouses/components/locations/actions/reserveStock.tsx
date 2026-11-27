"use client";

import { stockService } from "@repo/erp-services/stock.service";
import { IFStockByLocationItem } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { NumberBox } from "devextreme-react";
import { Button } from '@repo/devextreme';
import { Popup, Position } from "devextreme-react/popup";
import notify from "devextreme/ui/notify";
import { useEffect, useState } from "react";

interface ReserveStockItemProps {
    visible: boolean;
    onHiding: () => void;
    locationId: string;
    line: IFStockByLocationItem | null;
    onSuccess?: () => void;
}

const ReserveStockItem = ({ visible, onHiding, locationId, line, onSuccess }: ReserveStockItemProps) => {
    const [quantity, setQuantity] = useState<number>(0);
    const [loading, setLoading] = useState(false);

    const { token, currentCompany } = useAuth();

    useEffect(() => {
        if (visible && line) {
            setQuantity(0);
        }
    }, [visible, line]);

    const handleSubmit = async () => {
        if (!line) return;

        if (quantity <= 0) {
            notify("La cantidad debe ser mayor a 0", "error");
            return;
        }

        if (quantity > line.available) {
            notify(`No puedes reservar más de la cantidad disponible (${line.available})`, "error");
            return;
        }

        setLoading(true);

        try {
            await stockService.createReserve({
                locationId: locationId,
                itemId: line.itemId,
                quantity: quantity,
            }, token, currentCompany?.id);

            notify("Reserva registrada correctamente", "success");
            onSuccess?.();
            onHiding();
        } catch (error: any) {
            console.error("Error reserving stock:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al registrar la reserva";
            notify(errorMessage, "error");
        } finally {
            setLoading(false);
        }
    };

    if (!line) return null;

    return (
        <Popup
            visible={visible}
            onHiding={onHiding}
            dragEnabled={false}
            hideOnOutsideClick={true}
            showCloseButton={true}
            showTitle={true}
            titleRender={() => (
                <div className="flex flex-row items-center gap-3">
                    <div className="size-10 bg-focus-500/10 rounded-dx flex items-center justify-center border border-focus-500/20">
                        <i className="dx-icon-bookmark text-xl text-focus-100"></i>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-base font-bold">Reservar Stock</h3>
                        <span className="text-xs">{line.itemName} - {line.itemSku}</span>
                    </div>
                </div>
            )}
            width={500}
            height="auto"
            className="custom-popup"
        >
            <Position at="center" my="center" />

            <div className="flex flex-col gap-6 p-4 bg-primary-950/20 rounded-dx">
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between">
                        <label className="text-xs  font-bold uppercase tracking-wider">Cantidad a reservar</label>
                        <span className="text-xs  text-focus-100 font-bold">Disponible: {line.available}</span>
                    </div>
                    <NumberBox
                        value={quantity}
                        onValueChanged={(e) => setQuantity(e.value)}
                        min={0}
                        max={line.available}
                        showSpinButtons={true}
                        mode="number"
                        stylingMode="filled"
                        elementAttr={{ class: '!bg-main/5 !rounded-dx !h-[50px]' }}
                        inputAttr={{ class: '!text-lg !font-bold !text-center' }}
                    />
                    <p className="text-xs  italic mt-1">
                        * Ingrese la cantidad que desea reservar para este producto.
                    </p>
                </div>

                <div className="flex justify-end gap-3 mt-4 border-t border-main/5 pt-6">
                    <Button
                        text="Cancelar"
                        onClick={onHiding}
                        disabled={loading}
                        stylingMode="contained"
                        elementAttr={{
                            class: "!rounded-dx !bg-main/5 !shadow-none"
                        }}
                    />
                    <Button
                        type="default"
                        stylingMode="contained"
                        onClick={handleSubmit}
                        disabled={loading || quantity <= 0 || quantity > line.available}
                        width={180}
                        elementAttr={{
                            class: "!bg-focus-500 !rounded-dx shadow-md shadow-black/20"
                        }}
                    >
                        <div className="flex items-center justify-center">
                            <p className="text-sm !text-variant">Confirmar Reserva</p>
                        </div>
                    </Button>
                </div>
            </div>
        </Popup>
    );
};

export default ReserveStockItem;

"use client";

import { Popup, Position, ToolbarItem } from "devextreme-react/popup";
import { Button } from "@repo/devextreme";
import { IFInboundReceipt } from "@repo/api-contracts/erp";

interface Props {
    isOpen: boolean;
    receipt: IFInboundReceipt | null;
    onClose: () => void;
    onHidden?: () => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export default function InboundReceiptDetailModal({
    isOpen,
    receipt,
    onClose,
    onHidden,
    onConfirm,
    onCancel,
}: Props) {
    // Mantener Popup montado durante animación de cierre (limpiar entidad en onHidden del padre)
    const canConfirm = receipt?.state === "draft";
    const canCancelBiz = receipt?.state === "draft" || receipt?.state === "confirmed";

    return (
        <Popup
            visible={isOpen && !!receipt}
            onHiding={onClose}
            onHidden={onHidden}
            dragEnabled={false}
            hideOnOutsideClick
            showCloseButton
            showTitle
            title={
                receipt
                    ? `Recepción ${receipt.id.slice(0, 8)}…`
                    : "Recepción"
            }
            width={640}
            height="auto"
            maxHeight="85vh"
            className="custom-popup"
            deferRendering={false}
            onShown={(e) => {
                e.component.repaint();
            }}
        >
            <Position at="center" my="center" />
            {receipt && (
                <div className="flex flex-col gap-3 p-5 text-sm text-main">
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <span className="text-main/60 text-xs">Estado</span>
                            <div className="font-semibold text-main">{receipt.state}</div>
                        </div>
                        <div>
                            <span className="text-main/60 text-xs">Proveedor</span>
                            <div className="font-semibold text-main">
                                {receipt.supplierName || receipt.supplierId}
                            </div>
                        </div>
                        <div>
                            <span className="text-main/60 text-xs">Depósito</span>
                            <div className="font-semibold text-main">
                                {receipt.warehouseName || receipt.warehouseId}
                            </div>
                        </div>
                        <div>
                            <span className="text-main/60 text-xs">Ubicación dest.</span>
                            <div className="font-semibold text-main">
                                {receipt.locationDestName || receipt.locationDestId}
                            </div>
                        </div>
                        <div className="col-span-2">
                            <span className="text-main/60 text-xs">OC</span>
                            <div className="font-semibold text-main">
                                {receipt.purchaseOrderId || "—"}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="font-semibold text-main mb-1">
                            Líneas vivas ({receipt.lines.length})
                        </div>
                        <div className="max-h-64 overflow-auto border border-main/10 rounded-dx bg-primary-0/40 p-2">
                            {receipt.lines.length === 0 && (
                                <p className="text-main/60">Sin líneas</p>
                            )}
                            {receipt.lines.map((line, idx) => (
                                <div
                                    key={line.id || idx}
                                    className="py-1.5 border-b border-main/5 last:border-0"
                                >
                                    <div className="text-main">
                                        {line.itemName || line.itemSku || line.itemId}
                                    </div>
                                    <div className="text-main/60 text-xs">
                                        qty {line.productUomQty}
                                        {line.purchaseOrderLineId
                                            ? ` · PO line ${line.purchaseOrderLineId.slice(0, 8)}…`
                                            : ""}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-xs text-main/60">
                        Anular es una acción de negocio (cancel), distinta de enviar a papelera
                        (soft-delete).
                    </p>
                </div>
            )}
            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{ text: "Cerrar", onClick: onClose }}
            />
            {canCancelBiz && (
                <ToolbarItem
                    widget="dxButton"
                    toolbar="bottom"
                    location="after"
                    options={{
                        text: "Anular",
                        type: "danger",
                        stylingMode: "outlined",
                        onClick: onCancel,
                    }}
                />
            )}
            {canConfirm && (
                <ToolbarItem toolbar="bottom" location="after">
                    <Button
                        text="Confirmar"
                        type="default"
                        stylingMode="contained"
                        onClick={onConfirm}
                        className="!bg-focus-300 shadow-lg shadow-black/20 !text-variant !rounded-dx"
                    />
                </ToolbarItem>
            )}
        </Popup>
    );
}

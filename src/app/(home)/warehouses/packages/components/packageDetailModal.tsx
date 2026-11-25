"use client";

import { useState } from "react";
import { Popup, ToolbarItem } from "devextreme-react/popup";
import { NumberBox, TextBox } from "devextreme-react";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { packagesService } from "@repo/erp-services/warehouse/packages.service";
import { IFPackage } from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";

interface Props {
    isOpen: boolean;
    pkg: IFPackage | null;
    onClose: () => void;
    onChanged: () => void;
    onClosePackage: () => void;
}

export default function PackageDetailModal({
    isOpen,
    pkg,
    onClose,
    onChanged,
    onClosePackage,
}: Props) {
    const { token, currentCompany } = useAuth();
    const [itemId, setItemId] = useState("");
    const [quantity, setQuantity] = useState(1);
    const [loading, setLoading] = useState(false);

    if (!pkg) return null;

    const isOpenState = pkg.state === "open";

    const handleAddContent = async () => {
        if (!token || !currentCompany?.id || !itemId.trim() || quantity <= 0) {
            notify("Ítem y cantidad son requeridos", "warning", 2500);
            return;
        }
        setLoading(true);
        try {
            await packagesService.addContent(
                pkg.id,
                { itemId: itemId.trim(), quantity },
                token,
                currentCompany.id
            );
            notify("Contenido agregado", "success", 2000);
            setItemId("");
            setQuantity(1);
            onChanged();
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo agregar contenido",
                "error",
                3500
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <Popup
            visible={isOpen}
            onHiding={onClose}
            dragEnabled
            showCloseButton
            title={`Bulto ${pkg.sscc || pkg.id.slice(0, 8)}…`}
            width={560}
            height="auto"
            maxHeight="85vh"
        >
            <div className="flex flex-col gap-3 text-sm p-1">
                <div className="grid grid-cols-2 gap-2">
                    <div>
                        <span className="opacity-60">Estado</span>
                        <div className="font-medium">{pkg.state}</div>
                    </div>
                    <div>
                        <span className="opacity-60">SSCC</span>
                        <div className="font-medium">{pkg.sscc || "—"}</div>
                    </div>
                    <div>
                        <span className="opacity-60">Transfer</span>
                        <div className="font-medium">{pkg.transferId || "—"}</div>
                    </div>
                    <div>
                        <span className="opacity-60">Padre</span>
                        <div className="font-medium">{pkg.parentPackageId || "—"}</div>
                    </div>
                </div>

                <div>
                    <div className="font-medium mb-1">
                        Contenido vivo (
                        {(pkg.contents || []).reduce((s, c) => s + Number(c.quantity || 0), 0)})
                    </div>
                    <div className="max-h-48 overflow-auto border border-black/10 rounded-dx p-2">
                        {(pkg.contents || []).length === 0 && (
                            <p className="opacity-60">Sin contenido</p>
                        )}
                        {(pkg.contents || []).map((c, idx) => (
                            <div key={c.id || idx} className="py-1 border-b border-black/5 last:border-0">
                                {c.itemName || c.itemSku || c.itemId} — qty {c.quantity}
                            </div>
                        ))}
                    </div>
                </div>

                {isOpenState && (
                    <div className="flex flex-col gap-2 border border-black/10 rounded-dx p-2">
                        <div className="font-medium">Agregar contenido</div>
                        <TextBox
                            value={itemId}
                            onValueChanged={(e) => setItemId(e.value || "")}
                            placeholder="item_id (UUID)"
                        />
                        <NumberBox
                            value={quantity}
                            onValueChanged={(e) => setQuantity(Number(e.value) || 0)}
                            min={0}
                        />
                        <button
                            type="button"
                            className="dx-button dx-button-mode-contained dx-button-success self-start px-3 py-1"
                            disabled={loading}
                            onClick={handleAddContent}
                        >
                            {loading ? "Agregando…" : "Agregar"}
                        </button>
                    </div>
                )}

                <p className="text-xs opacity-60">
                    Cerrar es acción de negocio (idempotente). Eliminar/papelera es soft-delete aparte.
                </p>
            </div>
            <ToolbarItem
                widget="dxButton"
                toolbar="bottom"
                location="after"
                options={{ text: "Cerrar ventana", onClick: onClose }}
            />
            {isOpenState && (
                <ToolbarItem
                    widget="dxButton"
                    toolbar="bottom"
                    location="after"
                    options={{
                        text: "Cerrar bulto",
                        type: "default",
                        onClick: onClosePackage,
                    }}
                />
            )}
        </Popup>
    );
}

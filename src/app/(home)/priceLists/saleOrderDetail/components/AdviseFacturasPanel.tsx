"use client";

import { useMemo, useState } from "react";
import notify from "devextreme/ui/notify";
import { CheckBox, NumberBox } from "devextreme-react";
import { Button } from "@repo/devextreme";
import { useAuth } from "@/contexts/AuthContext";
import { issuanceConfigService } from "@repo/erp-services/issuance/issuanceConfig.service";
import { IFAdviseFacturasResponse } from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";

interface Props {
    saleOrderId: string;
}

const mapAdviseError = (error: unknown) => {
    if (error instanceof ApiError) {
        switch (error.code) {
            case "AMOUNT_EXCEEDS_FISCAL_LIMIT":
                return "El monto supera el tope fiscal";
            case "IDENTITY_REQUIRED":
                return "Se requiere identidad fiscal del cliente";
            case "MISSING_CURRENCY_RATE":
                return "Falta cotización de moneda";
            case "MIXED_ADDRESS":
                return "Direcciones mixtas en el lote";
            case "REMITO_NOT_EMITTED":
                return "Hay remitos sin emitir";
            case "INVALID_MAX_TOTAL_OVERRIDE":
                return "Override de tope inválido";
            default:
                return error.message || "Error en advise de facturas";
        }
    }
    if (error instanceof Error) return error.message;
    return "Error en advise de facturas";
};

export type AdviseSessionState = {
    response: IFAdviseFacturasResponse;
    maxTotalOverride?: number;
    forceAmountLimitBypass?: boolean;
};

export default function AdviseFacturasPanel({ saleOrderId }: Props) {
    const { token, currentCompany, isSuperAdmin, effectiveScopes } = useAuth();
    const [loading, setLoading] = useState(false);
    const [maxTotalOverride, setMaxTotalOverride] = useState<number | undefined>();
    const [forceBypass, setForceBypass] = useState(false);
    const [invoiceBeforeDelivery, setInvoiceBeforeDelivery] = useState(false);
    const [result, setResult] = useState<AdviseSessionState | null>(null);

    const canBypass = useMemo(() => {
        if (isSuperAdmin) return true;
        const scopes = effectiveScopes || [];
        return (
            scopes.includes("documents:amount_limit:bypass") ||
            scopes.includes("*:*:*")
        );
    }, [isSuperAdmin, effectiveScopes]);

    const runAdvise = async () => {
        if (!token || !currentCompany?.id || !saleOrderId) return;
        setLoading(true);
        try {
            const response = await issuanceConfigService.adviseFacturas(
                {
                    companyId: currentCompany.id,
                    saleOrderIds: [saleOrderId],
                    maxTotalOverride: maxTotalOverride && maxTotalOverride > 0 ? maxTotalOverride : undefined,
                    forceAmountLimitBypass: forceBypass || undefined,
                    invoiceBeforeDelivery: invoiceBeforeDelivery || undefined,
                },
                token
            );
            setResult({
                response,
                maxTotalOverride:
                    maxTotalOverride && maxTotalOverride > 0 ? maxTotalOverride : undefined,
                forceAmountLimitBypass: forceBypass || undefined,
            });
            const onExceed = response.amountRule?.onExceed;
            if (onExceed === "block") {
                notify(
                    "El tope bloquea la emisión. Usá bypass solo si tenés permiso.",
                    "warning",
                    4500
                );
            } else if (onExceed === "split") {
                notify(
                    `${response.proposals.length} propuesta(s) de partición`,
                    "success",
                    3000
                );
            } else {
                notify("Advise OK", "success", 2000);
            }
        } catch (error) {
            setResult(null);
            notify(mapAdviseError(error), "error", 4500);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full rounded-dx border border-main/10 bg-primary-500 p-4 flex flex-col gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-sm font-semibold text-main">Asesor de facturación</h3>
                    <p className="text-xs text-main/60">
                        Propone cómo partir FAC si se supera el tope. No emite el documento 380 todavía.
                    </p>
                </div>
                <Button
                    text={loading ? "Consultando…" : "Asesorar facturación"}
                    type="default"
                    disabled={loading}
                    onClick={runAdvise}
                />
            </div>

            <div className="flex flex-wrap gap-4 items-end text-sm">
                <div className="flex flex-col gap-1">
                    <span className="text-xs text-main/60">max_total_override</span>
                    <NumberBox
                        value={maxTotalOverride}
                        onValueChanged={(e) =>
                            setMaxTotalOverride(
                                e.value == null || e.value === "" ? undefined : Number(e.value)
                            )
                        }
                        min={0}
                        showClearButton
                        width={160}
                    />
                </div>
                <CheckBox
                    text="Facturar antes de entrega"
                    value={invoiceBeforeDelivery}
                    onValueChanged={(e) => setInvoiceBeforeDelivery(Boolean(e.value))}
                />
                {canBypass && (
                    <CheckBox
                        text="Forzar bypass de tope"
                        value={forceBypass}
                        onValueChanged={(e) => setForceBypass(Boolean(e.value))}
                    />
                )}
            </div>

            {result && (
                <div className="text-sm border-t border-main/10 pt-3 flex flex-col gap-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div>
                            <span className="text-xs text-main/60">Tope</span>
                            <div className="font-medium">
                                {result.response.amountRule?.maxTotal ?? "—"}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-main/60">Fuente</span>
                            <div className="font-medium">
                                {result.response.amountRule?.maxTotalSource ?? "—"}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-main/60">onExceed</span>
                            <div className="font-medium">
                                {result.response.amountRule?.onExceed ?? "—"}
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-main/60">Propuestas</span>
                            <div className="font-medium">{result.response.proposals.length}</div>
                        </div>
                    </div>
                    {result.response.proposals.length > 0 && (
                        <div className="max-h-40 overflow-auto rounded-dx border border-main/10 p-2 text-xs font-mono whitespace-pre-wrap">
                            {JSON.stringify(result.response.proposals, null, 2)}
                        </div>
                    )}
                    <p className="text-xs text-main/50">
                        Overrides de esta sesión listos para reenviar al emitir FAC:{" "}
                        {JSON.stringify({
                            maxTotalOverride: result.maxTotalOverride,
                            forceAmountLimitBypass: result.forceAmountLimitBypass,
                        })}
                    </p>
                </div>
            )}
        </div>
    );
}

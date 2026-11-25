"use client";

import { useEffect, useState } from "react";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { paymentTermsService } from "@repo/erp-services/payments_services/paymentTerms.service";
import { IFPaymentTermEffective } from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";
import { SelectBox } from "@repo/devextreme";

interface AddressOption {
    id: string;
    label: string;
}

interface Props {
    customerId: string;
    addresses?: AddressOption[];
}

export default function CustomerPaymentTermsEffective({ customerId, addresses = [] }: Props) {
    const { token, currentCompany } = useAuth();
    const [addressId, setAddressId] = useState<string | undefined>();
    const [data, setData] = useState<IFPaymentTermEffective | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token || !customerId) return;
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const effective = await paymentTermsService.getEffective(
                    {
                        customerId,
                        companyId: currentCompany?.id,
                        customerAddressId: addressId,
                        includeRules: true,
                    },
                    token
                );
                if (!cancelled) setData(effective);
            } catch (error) {
                if (!cancelled) {
                    setData(null);
                    notify(
                        error instanceof ApiError
                            ? error.message
                            : "No se pudieron cargar condiciones efectivas",
                        "error",
                        3500
                    );
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => {
            cancelled = true;
        };
    }, [token, customerId, currentCompany?.id, addressId]);

    const inheritanceLabel =
        addressId && data?.inheritedFromCustomer === false
            ? "Override de dirección"
            : addressId && data?.inheritedFromCustomer
              ? "Heredado del cliente"
              : "Plan del cliente";

    return (
        <div className="flex flex-col gap-2 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                    <h3 className="text-lg font-bold text-dx-primary mb-1">Condiciones de pago efectivas</h3>
                    <p className="text-xs opacity-60">
                        Qué plan aplica realmente (propia o heredada)
                        {data ? ` · ${inheritanceLabel}` : ""}
                    </p>
                </div>
                {addresses.length > 0 && (
                    <SelectBox
                        dataSource={[{ id: "", label: "Cliente (sin dirección)" }, ...addresses]}
                        valueExpr="id"
                        displayExpr="label"
                        value={addressId || ""}
                        onValueChanged={(e) => setAddressId(e.value || undefined)}
                        width={260}
                        placeholder="Filtrar por dirección"
                    />
                )}
            </div>
            {loading && <p className="opacity-60 animate-pulse">Cargando…</p>}
            {!loading && data && (
                <div className="rounded-dx border border-main/10 p-3 max-h-48 overflow-auto">
                    {data.terms.length === 0 && (
                        <p className="opacity-60">Sin condiciones efectivas</p>
                    )}
                    {data.terms.map((term) => (
                        <div key={term.id} className="py-1 border-b border-main/5 last:border-0">
                            <strong>{term.name}</strong>
                            <span className="opacity-70"> · net {term.netDays} días</span>
                        </div>
                    ))}
                    {data.inheritedFromCustomer != null && (
                        <span className="inline-flex mt-2 text-xs px-2 py-0.5 rounded bg-main/5">
                            {inheritanceLabel}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
}

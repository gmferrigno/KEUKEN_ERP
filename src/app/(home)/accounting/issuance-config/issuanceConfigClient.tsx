"use client";

import { useCallback, useEffect, useState } from "react";
import Form, { SimpleItem, GroupItem, ButtonItem } from "devextreme-react/form";
import notify from "devextreme/ui/notify";
import { useAuth } from "@/contexts/AuthContext";
import { issuanceConfigService } from "@repo/erp-services/issuance/issuanceConfig.service";
import {
    IFInvoiceAmountRule,
    IFIssuanceConfig,
    TFIssuanceCircuit,
} from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";
import { Button } from "@repo/devextreme";

const CIRCUITS: { value: TFIssuanceCircuit; label: string }[] = [
    { value: "prep_remito", label: "Prep + Remito" },
    { value: "prep_direct", label: "Prep directo" },
    { value: "direct_order", label: "Orden directa" },
    { value: "manual", label: "Manual" },
];

const ON_EXCEED = [
    { value: "split", label: "Partir (split)" },
    { value: "block", label: "Bloquear" },
    { value: "require_identity", label: "Requiere identidad" },
];

const IssuanceConfigClient = () => {
    const { token, currentCompany } = useAuth();
    const [loading, setLoading] = useState(false);
    const [scope, setScope] = useState({
        customerId: "",
        customerAddressId: "",
    });
    const [config, setConfig] = useState<Partial<IFIssuanceConfig>>({
        circuit: "prep_remito",
    });
    const [rules, setRules] = useState<IFInvoiceAmountRule[]>([]);
    const [ruleForm, setRuleForm] = useState({
        ivaCondition: "consumidor_final",
        maxTotal: 0,
        onExceed: "split" as "split" | "block" | "require_identity",
        priority: 100,
        notes: "",
    });

    const loadResolve = useCallback(async () => {
        if (!token || !currentCompany?.id) return;
        setLoading(true);
        try {
            const resolved = await issuanceConfigService.resolve(
                {
                    companyId: currentCompany.id,
                    customerId: scope.customerId.trim() || undefined,
                    customerAddressId: scope.customerAddressId.trim() || undefined,
                },
                token
            );
            setConfig(resolved);
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo resolver la config",
                "error",
                3500
            );
        } finally {
            setLoading(false);
        }
    }, [token, currentCompany?.id, scope.customerId, scope.customerAddressId]);

    const loadRules = useCallback(async () => {
        if (!token || !currentCompany?.id) return;
        try {
            const list = await issuanceConfigService.getAmountRules(currentCompany.id, token);
            setRules(list);
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudieron cargar reglas de tope",
                "error",
                3500
            );
        }
    }, [token, currentCompany?.id]);

    useEffect(() => {
        loadResolve();
        loadRules();
    }, [loadResolve, loadRules]);

    const handleSaveConfig = async () => {
        if (!token || !currentCompany?.id || !config.circuit) return;
        setLoading(true);
        try {
            const res = await issuanceConfigService.upsert(
                {
                    companyId: currentCompany.id,
                    customerId: scope.customerId.trim() || null,
                    customerAddressId: scope.customerAddressId.trim() || null,
                    circuit: config.circuit,
                    remitoGroupBy: config.remitoGroupBy || undefined,
                    invoiceGroupBy: config.invoiceGroupBy || undefined,
                    remitoTrigger: config.remitoTrigger || undefined,
                    invoiceTrigger: config.invoiceTrigger || undefined,
                    deliveryMedium: config.deliveryMedium || undefined,
                    notes: config.notes ?? null,
                },
                token
            );
            setConfig(res.config);
            notify(
                "Config guardada (soft-replace: la activa previa del mismo scope va a papelera)",
                "success",
                4500
            );
            await loadResolve();
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo guardar",
                "error",
                4000
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSaveRule = async () => {
        if (!token || !currentCompany?.id) return;
        if (!ruleForm.ivaCondition || !(ruleForm.maxTotal > 0)) {
            notify("ivaCondition y maxTotal (>0) son requeridos", "warning", 3000);
            return;
        }
        try {
            await issuanceConfigService.upsertAmountRule(
                {
                    companyId: currentCompany.id,
                    ivaCondition: ruleForm.ivaCondition,
                    maxTotal: ruleForm.maxTotal,
                    onExceed: ruleForm.onExceed,
                    priority: ruleForm.priority,
                    notes: ruleForm.notes || null,
                },
                token
            );
            notify("Regla de tope guardada", "success", 2500);
            await loadRules();
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo guardar la regla",
                "error",
                4000
            );
        }
    };

    return (
        <div className="flex flex-col w-full h-full overflow-auto gap-4 p-1">
            <section className="rounded-dx border border-black/10 p-4 bg-white/40">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-base font-semibold">Configuración de emisión</h2>
                        <p className="text-xs opacity-60">
                            Cascada: address → customer → company → default prep_remito
                            {config.source ? ` · efectiva: ${config.source}` : ""}
                            {config.scope ? ` (${config.scope})` : ""}
                        </p>
                    </div>
                    <Button text="Resolver" stylingMode="outlined" onClick={loadResolve} disabled={loading} />
                </div>
                <Form
                    formData={{ ...scope, ...config }}
                    onFieldDataChanged={(e) => {
                        const field = e.dataField as string;
                        if (!field) return;
                        if (field === "customerId" || field === "customerAddressId") {
                            setScope((prev) => ({ ...prev, [field]: e.value }));
                        } else {
                            setConfig((prev) => ({ ...prev, [field]: e.value }));
                        }
                    }}
                    labelLocation="top"
                    colCount={2}
                >
                    <GroupItem caption="Scope (override opcional)" colCount={2} colSpan={2}>
                        <SimpleItem dataField="customerId" label={{ text: "Customer ID" }} />
                        <SimpleItem
                            dataField="customerAddressId"
                            label={{ text: "Customer Address ID" }}
                        />
                    </GroupItem>
                    <SimpleItem
                        dataField="circuit"
                        label={{ text: "Circuito" }}
                        isRequired
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: CIRCUITS,
                            valueExpr: "value",
                            displayExpr: "label",
                        }}
                    />
                    <SimpleItem
                        dataField="deliveryMedium"
                        label={{ text: "Medio entrega" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: ["EMAIL", "PAPER"],
                            showClearButton: true,
                        }}
                    />
                    <SimpleItem
                        dataField="remitoGroupBy"
                        label={{ text: "Remito group by" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: ["BY_PREP", "BY_ORDER", "MANUAL"],
                            showClearButton: true,
                        }}
                    />
                    <SimpleItem
                        dataField="invoiceGroupBy"
                        label={{ text: "Invoice group by" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: ["BY_REMITO", "BY_ORDER", "MANUAL"],
                            showClearButton: true,
                        }}
                    />
                    <SimpleItem
                        dataField="remitoTrigger"
                        label={{ text: "Remito trigger" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: ["MANUAL", "PREP_DONE", "ROUTE_CLOSE"],
                            showClearButton: true,
                        }}
                    />
                    <SimpleItem
                        dataField="invoiceTrigger"
                        label={{ text: "Invoice trigger" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            items: [
                                "MANUAL",
                                "RF_VALIDATED",
                                "ROUTE_CLOSE",
                                "ORDER_COVERED",
                                "PERIOD_END",
                            ],
                            showClearButton: true,
                        }}
                    />
                    <SimpleItem
                        dataField="notes"
                        label={{ text: "Notas" }}
                        colSpan={2}
                        editorType="dxTextArea"
                    />
                    <ButtonItem
                        horizontalAlignment="right"
                        colSpan={2}
                        buttonOptions={{
                            text: loading ? "Guardando…" : "Guardar config",
                            type: "success",
                            onClick: handleSaveConfig,
                            disabled: loading,
                        }}
                    />
                </Form>
            </section>

            <section className="rounded-dx border border-black/10 p-4 bg-white/40">
                <h2 className="text-base font-semibold mb-1">Reglas de tope fiscal</h2>
                <p className="text-xs opacity-60 mb-3">
                    Match por condición IVA del customer (p. ej. consumidor_final)
                </p>
                <div className="mb-4 max-h-48 overflow-auto border border-black/5 rounded-dx p-2 text-sm">
                    {rules.length === 0 && <p className="opacity-60">Sin reglas</p>}
                    {rules.map((r, idx) => (
                        <div key={r.id || idx} className="py-1 border-b border-black/5 last:border-0">
                            <strong>{r.ivaCondition}</strong> — max {r.maxTotal} · onExceed{" "}
                            {r.onExceed || "split"} · prio {r.priority ?? 100}
                        </div>
                    ))}
                </div>
                <Form
                    formData={ruleForm}
                    onFieldDataChanged={(e) => {
                        if (e.dataField) {
                            setRuleForm((prev) => ({ ...prev, [e.dataField as string]: e.value }));
                        }
                    }}
                    labelLocation="top"
                    colCount={2}
                >
                    <SimpleItem dataField="ivaCondition" label={{ text: "IVA condition" }} isRequired />
                    <SimpleItem
                        dataField="maxTotal"
                        label={{ text: "Max total (moneda base)" }}
                        isRequired
                        editorType="dxNumberBox"
                        editorOptions={{ min: 0 }}
                    />
                    <SimpleItem
                        dataField="onExceed"
                        label={{ text: "Al exceder" }}
                        editorType="dxSelectBox"
                        editorOptions={{
                            dataSource: ON_EXCEED,
                            valueExpr: "value",
                            displayExpr: "label",
                        }}
                    />
                    <SimpleItem
                        dataField="priority"
                        label={{ text: "Prioridad" }}
                        editorType="dxNumberBox"
                    />
                    <SimpleItem dataField="notes" label={{ text: "Notas" }} colSpan={2} />
                    <ButtonItem
                        horizontalAlignment="right"
                        colSpan={2}
                        buttonOptions={{
                            text: "Upsert regla",
                            type: "default",
                            onClick: handleSaveRule,
                        }}
                    />
                </Form>
            </section>
        </div>
    );
};

export default IssuanceConfigClient;

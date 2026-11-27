'use client';

import React, { useEffect, useState } from 'react';
import { Button, SelectBox } from '@repo/devextreme';
import NumberBox from "devextreme-react/number-box";
import TextBox from "devextreme-react/text-box";
import CheckBox from "devextreme-react/check-box";
import { useAuth } from "@/contexts/AuthContext";
import {
    IFCustomerRuleSet,
    IFPredicate
} from "@repo/api-contracts/erp";
import { customerClustersService } from "@repo/erp-services/audiences/customerClusters.service";
import { itemClustersService } from "@repo/erp-services/audiences/itemClusters.service";
import { categoriesService } from "@repo/erp-services/product_services/categories.service";
import { IFCategory } from "@repo/api-contracts/erp";

import {
    PREDICATE_TYPES,
    EXISTS_OPS,
    AGG_METRICS,
    AGG_OPS,
    DAYS_OPTIONS,
    ATTR_FIELDS,
} from "@/app/lib/constants/audiences.constants";

export interface CustomerRuleEditorProps {
    value: IFCustomerRuleSet;
    onChange: (value: IFCustomerRuleSet) => void;
    disabled?: boolean;
}

export const CustomerRuleEditor: React.FC<CustomerRuleEditorProps> = ({
    value,
    onChange,
    disabled = false,
}) => {
    const { token, currentCompany } = useAuth();
    const [categories, setCategories] = useState<IFCategory[]>([]);
    const [itemClusters, setItemClusters] = useState<any[]>([]);
    const [customerClusters, setCustomerClusters] = useState<any[]>([]);

    useEffect(() => {
        if (!token || !currentCompany?.id) return;

        let isMounted = true;
        const loadOptions = async () => {
            try {
                const [catsRes, itemClustRes, custClustRes] = await Promise.all([
                    categoriesService.getAll(currentCompany.id, { limit: 200, offset: 0 }, token).catch(() => ({ items: [] })),
                    itemClustersService.getAll(200, 0, token, currentCompany.id).catch(() => ({ items: [] })),
                    customerClustersService.getAll(200, 0, token, currentCompany.id).catch(() => ({ items: [] })),
                ]);
                if (isMounted) {
                    setCategories(catsRes.items || []);
                    setItemClusters(itemClustRes.items || []);
                    setCustomerClusters(custClustRes.items || []);
                }
            } catch (err) {
                console.error("Error al cargar opciones auxiliares para reglas:", err);
            }
        };

        loadOptions();

        return () => {
            isMounted = false;
        };
    }, [token, currentCompany?.id]);

    const handleCombinatorChange = (combinator: "and" | "or") => {
        onChange({
            ...value,
            combinator,
        });
    };

    const handleUniverseActiveChange = (activeOnly: boolean) => {
        onChange({
            ...value,
            universe: {
                ...value.universe,
                activeOnly,
            }
        });
    };

    const handleUniverseBaseClusterChange = (customerClusterId?: string) => {
        onChange({
            ...value,
            universe: {
                ...value.universe,
                customerClusterId: customerClusterId || undefined,
            }
        });
    };

    const handleAddPredicate = () => {
        const newPredicate: IFPredicate = {
            type: "purchase_exists",
            op: "any",
            window: { lastDays: 90 },
            scope: {},
        };
        onChange({
            ...value,
            predicates: [...(value.predicates || []), newPredicate],
        });
    };

    const handleClonePredicate = (index: number) => {
        const target = value.predicates?.[index];
        if (!target) return;
        const cloned: IFPredicate = JSON.parse(JSON.stringify(target));
        const updated = [...(value.predicates || [])];
        updated.splice(index + 1, 0, cloned);
        onChange({
            ...value,
            predicates: updated,
        });
    };

    const handleRemovePredicate = (index: number) => {
        const updated = [...(value.predicates || [])];
        updated.splice(index, 1);
        onChange({
            ...value,
            predicates: updated,
        });
    };

    const handlePredicateChange = (index: number, updatedPredicate: IFPredicate) => {
        const updated = [...(value.predicates || [])];
        updated[index] = updatedPredicate;
        onChange({
            ...value,
            predicates: updated,
        });
    };

    const handleTypeSwitch = (index: number, newType: string) => {
        let newPredicate: IFPredicate;
        switch (newType) {
            case "customer_attr":
                newPredicate = {
                    type: "customer_attr",
                    field: "price_segment_id",
                    op: "in",
                    value: "",
                };
                break;
            case "purchase_agg":
                newPredicate = {
                    type: "purchase_agg",
                    metric: "amount",
                    op: "gt",
                    value: 10000,
                    window: { lastDays: 90 },
                    scope: {},
                };
                break;
            case "purchase_compare_period":
                newPredicate = {
                    type: "purchase_compare_period",
                    metric: "amount",
                    op: "lt",
                    compare: "prior_value",
                    window: { align: "same_quarter_last_year" },
                    scope: {},
                };
                break;
            case "in_cluster":
            case "not_in_cluster":
                newPredicate = {
                    type: newType as "in_cluster" | "not_in_cluster",
                    clusterId: customerClusters[0]?.id || "",
                };
                break;
            case "purchase_exists":
            default:
                newPredicate = {
                    type: "purchase_exists",
                    op: "any",
                    window: { lastDays: 90 },
                    scope: {},
                };
                break;
        }
        handlePredicateChange(index, newPredicate);
    };

    const predicatesCount = value.predicates?.length || 0;

    return (
        <div className="flex flex-col gap-4">
            {}
            <div className="flex flex-col gap-3 p-3 bg-main/5 border border-main/10 rounded-dx">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2 justify-between w-full">
                        <span className="text-xs font-semibold text-main/80">Lógica combinatoria entre reglas:</span>
                        <div className="flex rounded-dx border border-main/15 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => handleCombinatorChange("and")}
                                disabled={disabled}
                                className={`px-2 py-0.5 text-xs font-bold transition-all ${value.combinator === "and"
                                    ? "bg-focus-300 text-variant shadow"
                                    : "bg-transparent text-main/70 hover:text-main"
                                    }`}
                            >
                                TODAS
                            </button>
                            <button
                                type="button"
                                onClick={() => handleCombinatorChange("or")}
                                disabled={disabled}
                                className={`px-2 py-0.5 text-xs font-bold transition-all ${value.combinator === "or"
                                    ? "bg-focus-300 text-variant shadow"
                                    : "bg-transparent text-main/70 hover:text-main"
                                    }`}
                            >
                                AL MENOS UNA
                            </button>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-main/10">
                    <div className="flex items-center gap-2">
                        <CheckBox
                            value={value.universe?.activeOnly ?? true}
                            onValueChanged={(e) => {
                                if (e.event) {
                                    handleUniverseActiveChange(Boolean(e.value));
                                }
                            }}
                            disabled={disabled}
                            text="Solo clientes activos"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <span className="text-[11px] font-semibold text-main/70 whitespace-nowrap">Universo base:</span>
                        <div className="flex-1">
                            <SelectBox
                                items={[
                                    { id: '', name: 'Todos los clientes de la compañía' },
                                    ...customerClusters.map(c => ({ id: c.id, name: `Clúster: ${c.name}` }))
                                ]}
                                valueExpr="id"
                                displayExpr="name"
                                value={value.universe?.customerClusterId || ''}
                                onValueChanged={(e) => {
                                    if (e.event) {
                                        handleUniverseBaseClusterChange(e.value);
                                    }
                                }}
                                disabled={disabled}
                                stylingMode="filled"
                                searchEnabled={true}
                                placeholder="Todos los clientes"
                            />
                        </div>
                    </div>
                </div>
            </div>


            <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-main">
                        Reglas y Condiciones ({predicatesCount})
                    </span>
                    <span className="text-[11px] text-main/60">
                        {value.combinator === "and" ? "Se deben cumplir todas las condiciones" : "Basta con que se cumpla cualquiera de las condiciones"}
                    </span>
                </div>

                {predicatesCount === 0 ? (
                    <div className="text-center py-6 border border-dashed border-main/20 rounded-dx text-xs text-main/60 bg-main/5 flex flex-col items-center gap-3">
                        <span>No hay condiciones configuradas para este clúster.</span>
                        {!disabled && (
                            <Button
                                text="Añadir Primera Regla"
                                icon="add"
                                onClick={handleAddPredicate}
                                stylingMode="contained"
                                className="!bg-focus-300 !border-none"
                            />
                        )}
                    </div>
                ) : (
                    value.predicates.map((predicate, index) => (
                        <div
                            key={index}
                            className="flex flex-col gap-3 p-3 bg-main/5 border border-main/15 rounded-dx transition-all hover:border-focus-300/40"
                        >
                            <div className="flex items-center justify-between gap-2 border-b border-main/10 pb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold bg-focus-300/20 text-focus-300 px-2 py-0.5 rounded">
                                        Regla #{index + 1}
                                    </span>
                                    <div className="w-64">
                                        <SelectBox
                                            items={PREDICATE_TYPES}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.type}
                                            onValueChanged={(e) => {
                                                if (e.event && e.value) {
                                                    handleTypeSwitch(index, e.value);
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                </div>

                                {!disabled && (
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={() => handleClonePredicate(index)}
                                            className="text-main/60 hover:text-focus-300 p-1 rounded hover:bg-main/10 transition-all"
                                            title="Duplicar Regla"
                                        >
                                            <i className="dx-icon-copy text-sm" />
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => handleRemovePredicate(index)}
                                            className="text-red-500 hover:text-red-600 p-1 rounded hover:bg-red-500/10 transition-all"
                                            title="Eliminar Regla"
                                        >
                                            <i className="dx-icon-trash text-sm" />
                                        </button>
                                    </div>
                                )}
                            </div>


                            {predicate.type === "purchase_exists" && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Comportamiento</label>
                                        <SelectBox
                                            items={EXISTS_OPS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.op}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, op: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Ventana de Tiempo</label>
                                        <SelectBox
                                            items={DAYS_OPTIONS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.window?.lastDays || 90}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, window: { lastDays: Number(e.value) } });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Categoría o Clúster de Ítems</label>
                                        <SelectBox
                                            items={[
                                                { id: '__all__', name: 'Cualquier producto / rubro' },
                                                ...categories.map(c => ({ id: `cat:${c.id}`, name: `Categoría: ${c.name}` })),
                                                ...itemClusters.map(i => ({ id: `cluster:${i.id}`, name: `Clúster de Ítems: ${i.name}` })),
                                            ]}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={
                                                predicate.scope?.productCategoryId
                                                    ? `cat:${predicate.scope.productCategoryId}`
                                                    : predicate.scope?.itemClusterId
                                                        ? `cluster:${predicate.scope.itemClusterId}`
                                                        : '__all__'
                                            }
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    const val = String(e.value || '__all__');
                                                    if (val.startsWith('cat:')) {
                                                        handlePredicateChange(index, { ...predicate, scope: { productCategoryId: val.replace('cat:', '') } });
                                                    } else if (val.startsWith('cluster:')) {
                                                        handlePredicateChange(index, { ...predicate, scope: { itemClusterId: val.replace('cluster:', '') } });
                                                    } else {
                                                        handlePredicateChange(index, { ...predicate, scope: {} });
                                                    }
                                                }
                                            }}
                                            disabled={disabled}
                                            searchEnabled={true}
                                            stylingMode="filled"
                                        />
                                    </div>
                                </div>
                            )}

                            {predicate.type === "purchase_agg" && (
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Métrica</label>
                                        <SelectBox
                                            items={AGG_METRICS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.metric}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, metric: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Operador</label>
                                        <SelectBox
                                            items={AGG_OPS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.op}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, op: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Valor Umbral</label>
                                        <NumberBox
                                            value={predicate.value}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, value: Number(e.value) });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                            format="#,##0.##"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Ventana de Días</label>
                                        <SelectBox
                                            items={DAYS_OPTIONS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.window?.lastDays || 90}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, window: { lastDays: Number(e.value) } });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                </div>
                            )}

                            {predicate.type === "customer_attr" && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Campo / Atributo</label>
                                        <SelectBox
                                            items={ATTR_FIELDS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.field}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, field: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Operador</label>
                                        <SelectBox
                                            items={[
                                                { id: 'in', name: 'Contenido en / Pertenece a' },
                                                { id: 'eq', name: 'Igual a' },
                                                { id: 'ne', name: 'Distinto de' },
                                            ]}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.op}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, op: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Valor / UUID</label>
                                        <TextBox
                                            value={Array.isArray(predicate.value) ? predicate.value.join(", ") : String(predicate.value || "")}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    const val = e.value || "";
                                                    handlePredicateChange(index, {
                                                        ...predicate,
                                                        value: predicate.op === "in" ? val.split(",").map((s: string) => s.trim()).filter(Boolean) : val
                                                    });
                                                }
                                            }}
                                            placeholder="Valor o ID a comparar"
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                </div>
                            )}

                            {(predicate.type === "in_cluster" || predicate.type === "not_in_cluster") && (
                                <div className="flex flex-col gap-1">
                                    <label className="text-[11px] font-semibold text-main/70">Seleccionar Clúster de Clientes</label>
                                    <SelectBox
                                        items={customerClusters}
                                        valueExpr="id"
                                        displayExpr="name"
                                        value={predicate.clusterId}
                                        onValueChanged={(e) => {
                                            if (e.event) {
                                                handlePredicateChange(index, { ...predicate, clusterId: e.value });
                                            }
                                        }}
                                        placeholder="Buscar clúster..."
                                        disabled={disabled}
                                        searchEnabled={true}
                                        stylingMode="filled"
                                    />
                                </div>
                            )}

                            {predicate.type === "purchase_compare_period" && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Métrica</label>
                                        <SelectBox
                                            items={AGG_METRICS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.metric}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, metric: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Comparación</label>
                                        <SelectBox
                                            items={[
                                                { id: 'prior_value', name: 'Mismo trimestre año pasado (Menor valor)' },
                                                { id: 'prior_ratio', name: 'Ratio / Variación porcentual' },
                                            ]}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.compare}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, compare: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[11px] font-semibold text-main/70">Operador</label>
                                        <SelectBox
                                            items={AGG_OPS}
                                            valueExpr="id"
                                            displayExpr="name"
                                            value={predicate.op}
                                            onValueChanged={(e) => {
                                                if (e.event) {
                                                    handlePredicateChange(index, { ...predicate, op: e.value });
                                                }
                                            }}
                                            disabled={disabled}
                                            stylingMode="filled"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>


            {!disabled && (
                <div className="flex flex-col items-start gap-1 pt-1">
                    <Button
                        text="Añadir Condición"
                        icon="add"
                        onClick={handleAddPredicate}
                        disabled={predicatesCount >= 5}
                        stylingMode="outlined"
                        className="!rounded-dx !text-xs !py-1.5 !px-3 !border-main/20 hover:!border-focus-300"
                    />
                    {predicatesCount >= 5 && (
                        <span className="text-[11px] text-main/50">
                            Has alcanzado el límite máximo de 5 condiciones.
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerRuleEditor;

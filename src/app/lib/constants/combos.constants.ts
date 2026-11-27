import { PROCUREMENT_TYPES_OPTIONS, PROCUREMENT_TYPES_LABELS } from "./product.constants";

export { PROCUREMENT_TYPES_OPTIONS, PROCUREMENT_TYPES_LABELS };

export const COMBO_PROCUREMENT_TYPES_LABELS = PROCUREMENT_TYPES_LABELS;

export const COMBO_TYPE_OPTIONS = [
    { value: "FIXED" as const, label: "Kit Fijo (Fixed Pack)" },
    { value: "DYNAMIC" as const, label: "Kit Dinámico (Selección Variable)" }
];

export const COMBO_TYPE_LABELS: Record<string, string> = {
    FIXED: "Kit Fijo",
    DYNAMIC: "Kit Dinámico"
};

export const COMBO_STATUS_LABELS: Record<string, string> = {
    ACTIVE: "Activo",
    INACTIVE: "Inactivo"
};

export const DEFAULT_COMBO_DESCRIPTIONS: Record<string, string> = {
    FIXED: "El kit fijo está compuesto por artículos predeterminados. Todos los ítems listados se incluirán en las cantidades exactas indicadas al comercializar el combo.",
    DYNAMIC: "El kit dinámico permite al cliente elegir entre un conjunto de artículos permitidos respetando las cantidades mínima y máxima configuradas, además de incluir componentes fijos si los hubiere."
};

export const DEFAULT_SALE_BILLING_DESCRIPTION = "El modo de venta determina cómo se comercializa y factura el producto o combo (por unidades, por peso o bajo modalidad dual).";


export const getProcurementTypeLabel = (type?: string | null): string => {
    if (!type) return "-";
    return PROCUREMENT_TYPES_LABELS[type] || type;
};


export const getComboTypeLabel = (type?: string | null): string => {
    if (!type) return "-";
    return COMBO_TYPE_LABELS[type] || type;
};


export const getComboStatusLabel = (isActive?: boolean | null): string => {
    return isActive ? "Activo" : "Inactivo";
};

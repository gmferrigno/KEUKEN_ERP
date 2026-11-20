/** Paso 3 (planes de pago) se agregará después. */
export const CUSTOMER_WIZARD_STEPS = [{ label: "Cliente" }, { label: "Dirección" }];

/** Primera dirección del cliente: entrega + facturación + ventas. */
export const FIRST_ADDRESS_TYPES = ["delivery", "invoice", "sales"];

/** Direcciones adicionales: solo entrega por defecto. */
export const EXTRA_ADDRESS_TYPES = ["delivery"];

export const CUSTOMER_CODE_PREFIX = "CLI-";

export const ADDRESS_TYPE_LABELS: Record<string, string> = {
    sales: "Ventas",
    delivery: "Entrega",
    invoice: "Facturación",
    other: "Otro",
};

export type AddressTypeRuleInput = {
    name?: string | null;
    type?: string[] | null;
    deliveryAddressId?: string | null;
};

export type AddressTypeRulesMode = "strict" | "draft";

/**
 * Reglas de tipos de dirección del cliente (alineadas a POST /customers/full):
 * - Varias addresses pueden incluir `invoice` (sin unicidad).
 * - Ventas (sales) requiere entrega: misma dirección con delivery, o deliveryAddressId.
 * - Entrega (delivery) requiere facturación: misma dirección con invoice, u otra con invoice.
 *
 * mode "draft": permite armar el set de a una en el wizard (sin exigir delivery/invoice cruzados).
 * mode "strict": reglas completas (Finalizar / guardado API).
 */
export function validateCustomerAddressTypeRules(
    addresses: AddressTypeRuleInput[],
    options?: { mode?: AddressTypeRulesMode }
): string | null {
    if (!addresses.length) return null;

    const mode = options?.mode ?? "strict";

    if (mode === "draft") {
        return null;
    }

    const hasInvoice = addresses.some((a) => a.type?.includes("invoice"));

    for (const address of addresses) {
        const types = address.type || [];
        const label = address.name?.trim() || "sin nombre";

        if (types.includes("sales") && !types.includes("delivery") && !address.deliveryAddressId) {
            return `La dirección "${label}" es de Ventas: incluya también Entrega, o indique una dirección de entrega`;
        }

        if (types.includes("delivery") && !types.includes("invoice") && !hasInvoice) {
            return `La dirección "${label}" es de Entrega: debe existir una dirección de facturación (en esta u otra)`;
        }
    }

    return null;
}

/**
 * Si hay exactamente una dirección de entrega en el set, vincula las de Ventas
 * que aún no tienen deliveryAddressId (flujo wizard: factura+ventas primero, entrega después).
 */
export function resolveDeferredDeliveryLinks<T extends AddressTypeRuleInput & { _key: string }>(
    addresses: T[]
): T[] {
    const deliveryKeys = addresses
        .filter((address) => address.type?.includes("delivery"))
        .map((address) => address._key);

    if (deliveryKeys.length !== 1) {
        return addresses;
    }

    const onlyDeliveryKey = deliveryKeys[0];

    return addresses.map((address) => {
        const types = address.type || [];
        if (
            types.includes("sales") &&
            !types.includes("delivery") &&
            !address.deliveryAddressId
        ) {
            return { ...address, deliveryAddressId: onlyDeliveryKey };
        }
        return address;
    });
}

export function addressHasType(types: string[] | null | undefined, type: string): boolean {
    return Array.isArray(types) && types.includes(type);
}

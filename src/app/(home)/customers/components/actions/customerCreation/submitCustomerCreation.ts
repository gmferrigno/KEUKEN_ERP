import { customersService } from "@repo/erp-services/partners/customers.service";
import type { AddressDraft, IFCustomerCreate } from "./customerWizard.types";

export type SubmitCustomerCreationResult = {
    customerId: string;
    createdAddressCount: number;
};

function resolveDeliveryAddressId(
    address: AddressDraft,
    all: AddressDraft[]
): string | null | undefined {
    const types = address.type || [];
    if (!types.includes("sales")) {
        return address.deliveryAddressId ?? null;
    }

    if (types.includes("delivery") && !address.deliveryAddressId) {
        return "self";
    }

    const ref = address.deliveryAddressId;
    if (!ref) return null;

    const target = all.find((item) => item._key === ref);
    if (target) {
        return `@${target._key}`;
    }

    return ref;
}

/**
 * POST /partners/customers/full — alta atómica cliente + direcciones.
 * Si falla cualquier paso, el backend hace rollback total (no hay altas parciales).
 */
export async function submitCustomerCreation(params: {
    customerDraft: IFCustomerCreate;
    addresses: AddressDraft[];
    token: string;
    companyId?: string;
}): Promise<SubmitCustomerCreationResult> {
    const { customerDraft, addresses, token, companyId } = params;

    const created = await customersService.createFull(
        {
            customer: customerDraft,
            addresses: addresses.map((address) => {
                const { _key, ...rest } = address;
                return {
                    ...rest,
                    clientKey: _key,
                    deliveryAddressId: resolveDeliveryAddressId(address, addresses),
                };
            }),
        },
        token,
        companyId
    );

    return {
        customerId: created.customer.id,
        createdAddressCount: created.addresses?.length ?? addresses.length,
    };
}

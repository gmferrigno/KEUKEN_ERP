import { customerAddressesService } from "@repo/erp-services/partners/customerAddresses.service";
import { customersService } from "@repo/erp-services/partners/customers.service";
import type { AddressDraft, IFCustomerCreate } from "./customerWizard.types";

export type SubmitCustomerCreationResult = {
    customerId: string;
    createdAddressCount: number;
    failedAddresses: { name: string; message: string }[];
};

/**
 * Flujo actual: POST customer + N addresses.
 * Cuando exista create-consumer-full, este es el único lugar a reemplazar.
 */
export async function submitCustomerCreation(params: {
    customerDraft: IFCustomerCreate;
    addresses: AddressDraft[];
    token: string;
    companyId?: string;
}): Promise<SubmitCustomerCreationResult> {
    const { customerDraft, addresses, token, companyId } = params;

    const created = await customersService.create(customerDraft, token, companyId);

    const failedAddresses: { name: string; message: string }[] = [];
    let createdAddressCount = 0;
    const pendingKeyToRealId = new Map<string, string>();

    // 1) Entregas primero (para poder linkear deliveryAddressId).
    // 2) Luego el resto, resolviendo keys temporales → ids reales.
    const deliveryAddresses = addresses.filter((address) =>
        address.type?.includes("delivery")
    );
    const otherAddresses = addresses.filter(
        (address) => !address.type?.includes("delivery")
    );

    const createOne = async (address: AddressDraft) => {
        const { _key, ...payload } = address;
        let deliveryAddressId = payload.deliveryAddressId ?? null;
        if (deliveryAddressId && pendingKeyToRealId.has(deliveryAddressId)) {
            deliveryAddressId = pendingKeyToRealId.get(deliveryAddressId)!;
        }

        const createdAddress = await customerAddressesService.create(
            created.id,
            { ...payload, deliveryAddressId },
            token,
            companyId
        );
        pendingKeyToRealId.set(_key, createdAddress.id);
        createdAddressCount += 1;
    };

    for (const address of [...deliveryAddresses, ...otherAddresses]) {
        try {
            await createOne(address);
        } catch (error) {
            console.error("Error creating address:", address.name, error);
            failedAddresses.push({
                name: address.name?.trim() || "sin nombre",
                message:
                    error instanceof Error
                        ? error.message
                        : "Error al crear dirección",
            });
        }
    }

    return {
        customerId: created.id,
        createdAddressCount,
        failedAddresses,
    };
}

"use client";

import { RefObject, useEffect, useMemo, useState } from "react";
import { Button } from "@repo/devextreme";
import AddressModal, {
    AddressInitialLocation,
    AddressModalHandle,
} from "../../../addresses/components/actions/addressModal";
import { formatAddressTypes } from "./customerWizard.helpers";
import {
    EXTRA_ADDRESS_TYPES,
    FIRST_ADDRESS_TYPES,
} from "./customerWizard.constants";
import type {
    IFCustomerAddressCreate,
    PendingAddress,
} from "./customerWizard.types";

export interface AddressStepSectionProps {
    customerName: string;
    pendingAddresses: PendingAddress[];
    isEditingAddress: boolean;
    addressFormRef: RefObject<AddressModalHandle | null>;
    addressFormKey: number;
    inheritedLocation: AddressInitialLocation | null;
    seedData: IFCustomerAddressCreate | null;
    extraDeliveryOptions: { id: string; label: string }[];
    onEdit: (address: PendingAddress) => void;
    onRemove: (key: string) => void;
    /** Misma acción que el toolbar "Agregar otra dirección". */
    onAddAddress: () => void;
}

/** Ventas sin Entrega en la misma dirección y sin deliveryAddressId. */
function needsDeliveryLink(types: string[] | null | undefined, deliveryAddressId?: string | null) {
    const nextTypes = types || [];
    return (
        nextTypes.includes("sales") &&
        !nextTypes.includes("delivery") &&
        !deliveryAddressId
    );
}

const AddressStepSection = ({
    customerName,
    pendingAddresses,
    isEditingAddress,
    addressFormRef,
    addressFormKey,
    inheritedLocation,
    seedData,
    extraDeliveryOptions,
    onEdit,
    onRemove,
    onAddAddress,
}: AddressStepSectionProps) => {
    const defaultType =
        pendingAddresses.length === 0 ? FIRST_ADDRESS_TYPES : EXTRA_ADDRESS_TYPES;

    const [formTypes, setFormTypes] = useState<string[]>(() => [
        ...(seedData?.type?.length ? seedData.type : defaultType),
    ]);

    // Al remount del form (agregar/editar), alinear el aviso con los tipos del seed.
    useEffect(() => {
        setFormTypes([...(seedData?.type?.length ? seedData.type : defaultType)]);
    }, [addressFormKey]); // eslint-disable-line react-hooks/exhaustive-deps -- solo al remount

    const showMissingDeliveryWarning = useMemo(() => {
        const hasDeliveryInPending = pendingAddresses.some((address) =>
            address.type?.includes("delivery")
        );

        const pendingNeedsDelivery =
            !hasDeliveryInPending &&
            pendingAddresses.some((address) =>
                needsDeliveryLink(address.type, address.deliveryAddressId)
            );

        const formNeedsDelivery =
            !hasDeliveryInPending && needsDeliveryLink(formTypes);

        return pendingNeedsDelivery || formNeedsDelivery;
    }, [pendingAddresses, formTypes]);

    return (
        <div className="flex flex-col gap-4">
            <p className="text-sm text-main/70">
                Direcciones para{" "}
                <span className="font-semibold text-main">{customerName}</span>
                . El cliente se crea al finalizar con al menos una dirección.
            </p>

            {showMissingDeliveryWarning && (
                <div
                    role="status"
                    className="rounded-dx border border-amber-600/35 bg-amber-500/15 px-3 py-2.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                >
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-main">
                            Falta una dirección de entrega
                        </p>
                        <p className="text-xs text-main/75 mt-1 leading-snug">
                            Tiene facturación/ventas sin entrega vinculada. Guarde esta
                            dirección y agregue una con tipo{" "}
                            <span className="font-semibold text-main">Entrega</span> antes de
                            finalizar (si hay una sola, se vincula automáticamente).
                        </p>
                    </div>
                    <Button
                        text={
                            isEditingAddress
                                ? "Guardar cambios"
                                : "Agregar otra dirección"
                        }
                        stylingMode="outlined"
                        onClick={onAddAddress}
                        className="!shrink-0 self-start sm:self-center"
                    />
                </div>
            )}

            {pendingAddresses.length > 0 && (
                <div className="rounded-dx border border-main/10 bg-main/5 p-3">
                    <p className="text-xs font-semibold text-main/80 mb-2">
                        Direcciones listas ({pendingAddresses.length})
                    </p>
                    <ul className="flex flex-col gap-2">
                        {pendingAddresses.map((address, index) => (
                            <li
                                key={address._key}
                                className="flex items-start justify-between gap-3 text-sm"
                            >
                                <div className="min-w-0">
                                    <p className="font-medium text-main truncate">
                                        {index + 1}. {address.name}
                                    </p>
                                    <p className="text-xs text-main/60 truncate">
                                        {formatAddressTypes(address.type)}
                                        {address.street ? ` · ${address.street}` : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <Button
                                        text="Editar"
                                        stylingMode="text"
                                        disabled={isEditingAddress}
                                        onClick={() => onEdit(address)}
                                    />
                                    <Button
                                        text="Quitar"
                                        stylingMode="text"
                                        onClick={() => onRemove(address._key)}
                                    />
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {isEditingAddress && (
                <p className="text-xs text-focus-300">
                    Editando dirección. Guarde los cambios o cancele la edición.
                </p>
            )}

            <AddressModal
                key={addressFormKey}
                ref={addressFormRef}
                embedded
                isOpen={true}
                defaultType={defaultType}
                initialLocation={inheritedLocation}
                seedData={seedData}
                extraDeliveryOptions={extraDeliveryOptions}
                onTypesChange={setFormTypes}
                onClose={() => undefined}
                onSuccess={() => undefined}
            />
        </div>
    );
};

export default AddressStepSection;

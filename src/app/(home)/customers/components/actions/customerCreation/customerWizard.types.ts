import { IFCustomerAddressCreate, IFCustomerCreate } from "@repo/api-contracts/erp";
import type { AddressInitialLocation } from "../../../addresses/components/actions/addressModal";

export type PendingAddress = IFCustomerAddressCreate & { _key: string };

export type AddressDraft = IFCustomerAddressCreate & { _key: string };

export interface CustomerCreationWizardProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export type CustomerDraftLocation = Pick<
    IFCustomerCreate,
    "countryIsoCode" | "stateCode" | "cityCode"
> & {
    zip?: string | null;
};

export type { AddressInitialLocation, IFCustomerAddressCreate, IFCustomerCreate };

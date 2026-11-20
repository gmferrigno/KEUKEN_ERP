import { customersService } from "@repo/erp-services/partners/customers.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import {
    ADDRESS_TYPE_LABELS,
    CUSTOMER_CODE_PREFIX,
} from "./customerWizard.constants";
import type {
    AddressInitialLocation,
    CustomerDraftLocation,
} from "./customerWizard.types";

/** Sugiere el próximo código según los existentes (ej. CLI-001 → CLI-002). */
export function suggestNextCustomerCode(
    codes: Array<string | null | undefined>,
    prefix = CUSTOMER_CODE_PREFIX
): string {
    const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`^${escaped}(\\d+)$`, "i");
    let max = 0;
    let width = 3;

    for (const code of codes) {
        const match = String(code || "").trim().match(re);
        if (!match) continue;
        const value = Number.parseInt(match[1], 10);
        if (!Number.isFinite(value)) continue;
        max = Math.max(max, value);
        width = Math.max(width, match[1].length);
    }

    return `${prefix}${String(max + 1).padStart(width, "0")}`;
}

export async function fetchSuggestedCustomerCode(
    token: string,
    companyId: string
): Promise<string> {
    const pageSize = 200;
    let offset = 0;
    let total = Infinity;
    const codes: string[] = [];

    while (offset < total && offset < 2000) {
        const response = await customersService.getAll(
            token,
            pageSize,
            offset,
            companyId
        );
        codes.push(...response.items.map((item) => item.code));
        total = response.metadata.totalItems ?? codes.length;
        offset += pageSize;
        if (!response.items.length) break;
    }

    return suggestNextCustomerCode(codes);
}

export async function resolveInheritedLocation(
    draft: CustomerDraftLocation,
    token: string | null | undefined,
    countries: any[]
): Promise<AddressInitialLocation | null> {
    if (!token || !draft.countryIsoCode) {
        return draft.zip ? { zip: draft.zip } : null;
    }

    try {
        let countryList = countries;
        if (!countryList.length) {
            countryList = (await countriesService.getAll(token, false, true)).items || [];
        }
        const country = countryList.find((c: any) => c.code === draft.countryIsoCode);
        if (!country?.id) {
            return draft.zip ? { zip: draft.zip } : null;
        }

        const statesRes = await statesService.getAll(token, country.code, false, true);
        const state = (statesRes.items || []).find((s: any) => s.code === draft.stateCode);
        if (!state?.id) {
            return {
                countryId: country.id,
                stateId: null,
                cityId: null,
                zip: draft.zip || "",
            };
        }

        const citiesRes = await citiesService.getAll(token, state.id, false, true);
        const city = (citiesRes.items || []).find((c: any) => c.code === draft.cityCode);

        return {
            countryId: country.id,
            stateId: state.id,
            cityId: city?.id ?? null,
            zip: draft.zip || "",
        };
    } catch (error) {
        console.error("Error resolving location from customer:", error);
        return draft.zip ? { zip: draft.zip } : null;
    }
}

export function formatAddressTypes(types: string[]) {
    return (types || []).map((t) => ADDRESS_TYPE_LABELS[t] || t).join(", ");
}

export function buildFirstAddressSeed(customerName: string) {
    return { name: `Sucursal ${customerName}` };
}

'use client';

import { useAuth } from '@/contexts/AuthContext';
import type {
    IFCustomerAddress,
    IFCustomerFull,
    IFOptionItem,
} from '@repo/api-contracts/erp';
import { customersService } from '@repo/erp-services/partners/customers.service';
import { priceListsService } from '@repo/erp-services/priceLists/priceLists.service';
import CustomStore from 'devextreme/data/custom_store';
import notify from 'devextreme/ui/notify';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PosOrderDestination } from '../types';
import {
    formatMissingList,
    listDeliveryAddresses,
    pickDeliveryAddress,
    pickSalesAddress,
    startOfToday,
    toIsoDate,
} from '../utils';

export function usePosSaleSetup() {
    const { token, currentCompany } = useAuth();

    const [orderDestination, setOrderDestination] =
        useState<PosOrderDestination>('reparto');
    const [deliveryDate, setDeliveryDate] = useState<Date | null>(() =>
        startOfToday()
    );

    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerLabel, setCustomerLabel] = useState('');
    const [customerFull, setCustomerFull] = useState<IFCustomerFull | null>(null);
    const [addressId, setAddressId] = useState<string | null>(null);
    const [selectedAddress, setSelectedAddress] =
        useState<IFCustomerAddress | null>(null);

    const [defaultPricelistId, setDefaultPricelistId] = useState<string | null>(
        null
    );
    const [pricelistOptions, setPricelistOptions] = useState<IFOptionItem[]>([]);

    const deliveryAddresses = useMemo(
        () => listDeliveryAddresses(customerFull?.addresses || []),
        [customerFull]
    );

    const missingSaleSetup = useMemo(() => {
        const missing: string[] = [];
        if (!customerId) missing.push('cliente');
        if (!defaultPricelistId) missing.push('lista de precios sugerida');
        if (orderDestination === 'reparto' && !toIsoDate(deliveryDate)) {
            missing.push('fecha de entrega');
        }
        return missing;
    }, [customerId, defaultPricelistId, orderDestination, deliveryDate]);

    const canStartSale = missingSaleSetup.length === 0;

    const ensureSaleSetup = useCallback(() => {
        if (canStartSale) return true;
        notify(
            `Completá ${formatMissingList(missingSaleSetup)} para continuar`,
            'warning',
            3000
        );
        return false;
    }, [canStartSale, missingSaleSetup]);

    const applyAddress = useCallback(
        (address: IFCustomerAddress | null, customer?: IFCustomerFull | null) => {
            setSelectedAddress(address);
            setAddressId(address?.id || null);

            const source = customer ?? customerFull;
            const inferredPricelist =
                address?.pricelistId || source?.customer.pricelistId || null;
            if (inferredPricelist) {
                setDefaultPricelistId(inferredPricelist);
            }
        },
        [customerFull]
    );

    const selectAddressById = useCallback(
        (id: string | null) => {
            if (!id || !customerFull) {
                applyAddress(null);
                return;
            }
            const address =
                customerFull.addresses?.find((a) => a.id === id) || null;
            applyAddress(address);
        },
        [customerFull, applyAddress]
    );

    const customersStore = useMemo(() => {
        return new CustomStore({
            key: 'id',
            byKey: async (key: string) => {
                if (!token || !key) return null;
                const full = await customersService.getFullById(
                    key,
                    token,
                    currentCompany?.id
                );
                return {
                    id: full.customer.id,
                    label: `${full.customer.code} — ${full.customer.name}`,
                    code: full.customer.code,
                } as IFOptionItem;
            },
            load: async (loadOptions) => {
                if (!token || !currentCompany?.id) return { data: [], totalCount: 0 };
                const search = String(loadOptions.searchValue || '').trim();
                const response = await customersService.getOptions(
                    {
                        companyId: currentCompany.id,
                        q: search || undefined,
                        limit: loadOptions.take || 30,
                        offset: loadOptions.skip || 0,
                        active: true,
                    },
                    token
                );
                return {
                    data: response.items,
                    totalCount: response.metadata.totalItems,
                };
            },
        });
    }, [token, currentCompany?.id]);

    useEffect(() => {
        if (!token || !currentCompany?.id) {
            setPricelistOptions([]);
            return;
        }
        let cancelled = false;
        priceListsService
            .getOptions(
                {
                    companyId: currentCompany.id,
                    operation: 'sale',
                    state: 'active',
                },
                token
            )
            .then((response) => {
                if (cancelled) return;
                setPricelistOptions(response.items || []);
            })
            .catch((error) => {
                console.error('Error loading pricelists for POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar las listas de precios',
                    'error',
                    3000
                );
            });
        return () => {
            cancelled = true;
        };
    }, [token, currentCompany?.id]);

    useEffect(() => {
        if (!defaultPricelistId || !token) return;
        if (pricelistOptions.some((o) => o.id === defaultPricelistId)) return;

        let cancelled = false;
        priceListsService
            .getById(defaultPricelistId, token)
            .then((full) => {
                if (cancelled) return;
                const list = full.pricelist;
                setPricelistOptions((prev) => {
                    if (prev.some((o) => o.id === list.id)) return prev;
                    return [
                        { id: list.id, label: list.name, code: list.name },
                        ...prev,
                    ];
                });
            })
            .catch(() => undefined);

        return () => {
            cancelled = true;
        };
    }, [defaultPricelistId, token, pricelistOptions]);

    useEffect(() => {
        if (!customerId || !token) {
            setCustomerFull(null);
            return;
        }

        let cancelled = false;
        const loadCustomer = async () => {
            try {
                const full = await customersService.getFullById(
                    customerId,
                    token,
                    currentCompany?.id
                );
                if (cancelled) return;
                setCustomerFull(full);
            } catch (error) {
                console.error('Error loading customer for POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo cargar el cliente',
                    'error',
                    3000
                );
            }
        };

        loadCustomer();
        return () => {
            cancelled = true;
        };
    }, [customerId, token, currentCompany?.id]);

    useEffect(() => {
        if (!customerFull) {
            setSelectedAddress(null);
            setAddressId(null);
            return;
        }

        if (orderDestination === 'reparto') {
            const deliveries = listDeliveryAddresses(customerFull.addresses || []);
            const stillValid =
                addressId && deliveries.some((a) => a.id === addressId)
                    ? customerFull.addresses?.find((a) => a.id === addressId) ||
                      null
                    : null;

            applyAddress(
                stillValid || pickDeliveryAddress(customerFull.addresses || []),
                customerFull
            );
            return;
        }

        applyAddress(
            pickSalesAddress(customerFull.addresses || []),
            customerFull
        );
        // addressId intencional fuera de deps: solo re-resolver al cambiar cliente/destino
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [orderDestination, customerFull, applyAddress]);

    const resetSaleSetup = useCallback(() => {
        setCustomerId(null);
        setCustomerLabel('');
        setCustomerFull(null);
        setAddressId(null);
        setSelectedAddress(null);
        setDefaultPricelistId(null);
        setOrderDestination('reparto');
        setDeliveryDate(startOfToday());
    }, []);

    return {
        orderDestination,
        setOrderDestination,
        deliveryDate,
        setDeliveryDate,
        customerId,
        setCustomerId,
        customerLabel,
        setCustomerLabel,
        customerFull,
        addressId,
        selectedAddress,
        deliveryAddresses,
        selectAddressById,
        defaultPricelistId,
        setDefaultPricelistId,
        pricelistOptions,
        customersStore,
        missingSaleSetup,
        canStartSale,
        ensureSaleSetup,
        resetSaleSetup,
    };
}

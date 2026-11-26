'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { IFPriceListCatalogItem } from '@repo/api-contracts/erp';
import { priceListsService } from '@repo/erp-services/priceLists/priceLists.service';
import notify from 'devextreme/ui/notify';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CartAddInput, PosCartLine } from '../types';
import {
    PAGE_SIZE,
    cartDisplayQty,
    cartLineKey,
    clampPct,
    lineNet,
    theoreticalBillingQty,
} from '../utils';

type UsePosCartArgs = {
    customerId: string | null;
    defaultPricelistId: string | null;
    ensureSaleSetup: () => boolean;
    onLineAdded?: () => void;
};

export function usePosCart({
    customerId,
    defaultPricelistId,
    ensureSaleSetup,
    onLineAdded,
}: UsePosCartArgs) {
    const { token } = useAuth();

    const [cart, setCart] = useState<PosCartLine[]>([]);
    const [orderDiscountPct, setOrderDiscountPct] = useState(0);
    const [orderDiscountAmount, setOrderDiscountAmount] = useState(0);

    const catalogCacheRef = useRef<Map<string, IFPriceListCatalogItem[]>>(
        new Map()
    );
    const priceLookupInFlight = useRef<Set<string>>(new Set());
    const onLineAddedRef = useRef(onLineAdded);
    onLineAddedRef.current = onLineAdded;

    const loadPricelistCatalog = useCallback(
        async (pricelistId: string): Promise<IFPriceListCatalogItem[]> => {
            if (!token) return [];

            const cached = catalogCacheRef.current.get(pricelistId);
            if (cached) return cached;

            while (priceLookupInFlight.current.has(pricelistId)) {
                await new Promise((r) => setTimeout(r, 200));
                const ready = catalogCacheRef.current.get(pricelistId);
                if (ready) return ready;
            }

            priceLookupInFlight.current.add(pricelistId);
            try {
                const allItems: IFPriceListCatalogItem[] = [];
                let offset = 0;

                while (true) {
                    const response = await priceListsService.getFull(
                        pricelistId,
                        token,
                        PAGE_SIZE,
                        offset
                    );
                    const page = response.items || [];
                    allItems.push(...page);
                    if (page.length < PAGE_SIZE) break;
                    offset += PAGE_SIZE;
                }

                catalogCacheRef.current.set(pricelistId, allItems);
                return allItems;
            } finally {
                priceLookupInFlight.current.delete(pricelistId);
            }
        },
        [token]
    );

    const resolvePriceFromList = useCallback(
        async (pricelistId: string, itemId: string): Promise<number | null> => {
            const catalog = await loadPricelistCatalog(pricelistId);
            const match = catalog.find((row) => row.itemId === itemId);
            if (!match) return null;
            return match.price ?? match.priceWithTax ?? null;
        },
        [loadPricelistCatalog]
    );

    const cartSubtotal = useMemo(
        () => cart.reduce((sum, line) => sum + lineNet(line), 0),
        [cart]
    );

    useEffect(() => {
        const pct = clampPct(orderDiscountPct);
        const nextAmount = Number(((cartSubtotal * pct) / 100).toFixed(2));
        setOrderDiscountAmount((prev) => (prev === nextAmount ? prev : nextAmount));
    }, [cartSubtotal, orderDiscountPct]);

    const effectiveOrderDiscount = useMemo(() => {
        return Math.min(
            cartSubtotal,
            cartSubtotal * (clampPct(orderDiscountPct) / 100)
        );
    }, [cartSubtotal, orderDiscountPct]);

    const cartTotal = useMemo(
        () => Math.max(0, cartSubtotal - effectiveOrderDiscount),
        [cartSubtotal, effectiveOrderDiscount]
    );

    const cartCount = useMemo(
        () => cart.reduce((sum, line) => sum + cartDisplayQty(line), 0),
        [cart]
    );

    const cartQtyByItemId = useMemo(() => {
        const map = new Map<string, number>();
        for (const line of cart) {
            map.set(
                line.itemId,
                (map.get(line.itemId) || 0) + cartDisplayQty(line)
            );
        }
        return map;
    }, [cart]);

    const cartQtyByPresentationId = useMemo(() => {
        const map = new Map<string, number>();
        for (const line of cart) {
            if (!line.presentationId) continue;
            map.set(
                line.presentationId,
                (map.get(line.presentationId) || 0) + cartDisplayQty(line)
            );
        }
        return map;
    }, [cart]);

    const addCartEntry = useCallback(
        async (input: CartAddInput) => {
            if (!customerId || !defaultPricelistId) {
                ensureSaleSetup();
                return;
            }

            const listId = defaultPricelistId;
            const isDual = Boolean(input.isDualUom);
            const entryQty = Math.max(1, input.quantity || 1);
            const ratio =
                input.uomRatio != null && Number(input.uomRatio) > 0
                    ? Number(input.uomRatio)
                    : null;
            const secQty = isDual ? entryQty : null;
            const billingQty = isDual
                ? input.productUomQty != null && Number(input.productUomQty) > 0
                    ? Number(input.productUomQty)
                    : theoreticalBillingQty(entryQty, ratio)
                : entryQty;
            const key = cartLineKey(input.itemId, input.presentationId);

            let unitPrice = 0;
            if (listId) {
                try {
                    const price = await resolvePriceFromList(listId, input.itemId);
                    if (price != null) unitPrice = price;
                } catch {
                    // Precio manual si la lista no responde
                }
            }

            const discountPct = clampPct(input.discountPct ?? 0);

            setCart((prev) => {
                const existing = prev.find((line) => line.key === key);
                if (existing) {
                    return prev.map((line) => {
                        if (line.key !== key) return line;
                        if (line.isDualUom || isDual) {
                            const nextSec =
                                (Number(line.secQuantity) || 0) +
                                (secQty || entryQty);
                            const nextBilling =
                                line.quantity +
                                (isDual
                                    ? billingQty
                                    : theoreticalBillingQty(
                                          entryQty,
                                          line.uomRatio ?? ratio
                                      ));
                            return {
                                ...line,
                                isDualUom: true,
                                secQuantity: nextSec,
                                quantity: nextBilling,
                                secUomId: line.secUomId || input.secUomId || null,
                                secUomName:
                                    line.secUomName || input.secUomName || null,
                                productUomId:
                                    line.productUomId ||
                                    input.productUomId ||
                                    null,
                                productUomName:
                                    line.productUomName ||
                                    input.productUomName ||
                                    null,
                                uomRatio: line.uomRatio ?? ratio,
                            };
                        }
                        return { ...line, quantity: line.quantity + entryQty };
                    });
                }
                return [
                    ...prev,
                    {
                        key,
                        itemId: input.itemId,
                        productId: input.productId || '',
                        productCode: input.productCode,
                        productDescription: input.productDescription,
                        presentationId: input.presentationId || null,
                        presentationName: input.presentationName || null,
                        barcode: input.barcode || null,
                        pricelistId: listId,
                        unitPrice,
                        discountPct,
                        quantity: billingQty,
                        productUomId: input.productUomId || null,
                        productUomName: input.productUomName || null,
                        isDualUom: isDual,
                        secQuantity: secQty,
                        secUomId: isDual ? input.secUomId || null : null,
                        secUomName: isDual ? input.secUomName || null : null,
                        uomRatio: isDual ? ratio : null,
                    },
                ];
            });
            onLineAddedRef.current?.();
        },
        [customerId, defaultPricelistId, ensureSaleSetup, resolvePriceFromList]
    );

    const updateLine = useCallback((key: string, patch: Partial<PosCartLine>) => {
        setCart((prev) =>
            prev
                .map((line) => {
                    if (line.key !== key) return line;
                    const next = { ...line, ...patch };

                    if (patch.secQuantity !== undefined && next.isDualUom) {
                        const sec = Math.max(0, Number(patch.secQuantity) || 0);
                        next.secQuantity = sec;
                        // Piezas son la fuente logística; recalcula kg teórico si no viene kg explícito.
                        if (patch.quantity === undefined) {
                            next.quantity = theoreticalBillingQty(
                                sec,
                                next.uomRatio
                            );
                        }
                    }

                    if (patch.discountPct !== undefined) {
                        next.discountPct = clampPct(patch.discountPct);
                    }
                    if (patch.unitPrice !== undefined) {
                        next.unitPrice = Math.max(0, patch.unitPrice || 0);
                    }
                    if (patch.quantity !== undefined) {
                        next.quantity = Math.max(0, Number(patch.quantity) || 0);
                    }

                    const removeDual =
                        next.isDualUom &&
                        ((next.secQuantity != null && next.secQuantity <= 0) ||
                            next.quantity <= 0);
                    const removeSimple =
                        !next.isDualUom &&
                        patch.quantity !== undefined &&
                        next.quantity <= 0;
                    if (removeDual || removeSimple) return null;

                    return next;
                })
                .filter(Boolean) as PosCartLine[]
        );
    }, []);

    const changeLinePricelist = useCallback(
        async (key: string, itemId: string, pricelistId: string | null) => {
            if (!pricelistId) {
                updateLine(key, { pricelistId: null });
                return;
            }

            try {
                const price = await resolvePriceFromList(pricelistId, itemId);
                if (price != null) {
                    updateLine(key, { pricelistId, unitPrice: price });
                    notify('Precio actualizado desde la lista', 'success', 1500);
                } else {
                    updateLine(key, { pricelistId });
                    notify(
                        'La lista no tiene precio para este producto; cargalo manualmente',
                        'warning',
                        3000
                    );
                }
            } catch (error) {
                updateLine(key, { pricelistId });
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudo obtener el precio de la lista',
                    'error',
                    3000
                );
            }
        },
        [resolvePriceFromList, updateLine]
    );

    const removeLine = useCallback((key: string) => {
        setCart((prev) => prev.filter((line) => line.key !== key));
    }, []);

    const clearCart = useCallback(() => {
        setCart([]);
        setOrderDiscountPct(0);
        setOrderDiscountAmount(0);
    }, []);

    return {
        cart,
        setCart,
        orderDiscountPct,
        setOrderDiscountPct,
        orderDiscountAmount,
        setOrderDiscountAmount,
        cartSubtotal,
        effectiveOrderDiscount,
        cartTotal,
        cartCount,
        cartQtyByItemId,
        cartQtyByPresentationId,
        addCartEntry,
        updateLine,
        changeLinePricelist,
        removeLine,
        clearCart,
    };
}

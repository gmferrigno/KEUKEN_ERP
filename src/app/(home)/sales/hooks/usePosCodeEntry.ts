'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { IFItem, IFPresentation, IFProduct } from '@repo/api-contracts/erp';
import { itemsService } from '@repo/erp-services/product_services/items.service';
import { productsService } from '@repo/erp-services/product_services/products.service';
import notify from 'devextreme/ui/notify';
import { useCallback, useRef, useState } from 'react';
import type { CartAddInput, PosCodeLookupMode } from '../types';
import { itemStubFromPresentations, resolvePosDualUom } from '../utils';

type UsePosCodeEntryArgs = {
    ensureSaleSetup: () => boolean;
    addCartEntry: (input: CartAddInput) => Promise<void>;
    entryDiscountPct: number;
};

export function usePosCodeEntry({
    ensureSaleSetup,
    addCartEntry,
    entryDiscountPct,
}: UsePosCodeEntryArgs) {
    const { token, currentCompany } = useAuth();

    const [codeLookupMode, setCodeLookupMode] =
        useState<PosCodeLookupMode>('item');
    const [codeInput, setCodeInput] = useState('');
    const [codeQty, setCodeQty] = useState(1);
    const [codeSearching, setCodeSearching] = useState(false);
    const [pendingItem, setPendingItem] = useState<IFItem | null>(null);
    const [pendingPresentations, setPendingPresentations] = useState<
        IFPresentation[]
    >([]);
    const codeInputRef = useRef<any>(null);
    const productCacheRef = useRef<Map<string, IFProduct>>(new Map());

    const clearPending = useCallback(() => {
        setPendingItem(null);
        setPendingPresentations([]);
    }, []);

    const resetCodeEntry = useCallback(() => {
        setCodeInput('');
        setCodeQty(1);
        clearPending();
    }, [clearPending]);

    const loadProduct = useCallback(
        async (productId: string | null | undefined): Promise<IFProduct | null> => {
            if (!token || !productId) return null;
            const cached = productCacheRef.current.get(productId);
            if (cached) return cached;
            try {
                const product = await productsService.getById(
                    productId,
                    token,
                    currentCompany?.id
                );
                productCacheRef.current.set(productId, product);
                return product;
            } catch (error) {
                console.error('Error loading product for POS dual UoM:', error);
                return null;
            }
        },
        [token, currentCompany?.id]
    );

    const buildCartInput = useCallback(
        async ({
            item,
            presentation,
            quantity,
            discountPct,
            fallbackCode,
        }: {
            item?: IFItem | null;
            presentation?: IFPresentation | null;
            quantity: number;
            discountPct?: number;
            fallbackCode?: string;
        }): Promise<CartAddInput | null> => {
            const itemId = presentation?.itemId || item?.id;
            if (!itemId) {
                notify('No se pudo identificar el ítem', 'error', 3000);
                return null;
            }

            const productId = presentation?.productId || item?.productId || null;
            const product = await loadProduct(productId);
            const dual = resolvePosDualUom({ item, presentation, product });

            if (dual.isDualUom && !dual.uomRatio) {
                notify(
                    'Ítem catch-weight sin ratio pieza→kg; configurá uom_ratio en la presentación',
                    'warning',
                    4000
                );
            }

            return {
                itemId,
                productId,
                productCode:
                    presentation?.itemSku ||
                    presentation?.productCode ||
                    item?.sku ||
                    presentation?.barcode ||
                    fallbackCode ||
                    '',
                productDescription:
                    presentation?.itemDisplayName ||
                    presentation?.itemName ||
                    presentation?.productName ||
                    presentation?.name ||
                    item?.itemDisplayName ||
                    item?.itemName ||
                    item?.productName ||
                    item?.sku ||
                    'Producto',
                presentationId: presentation?.id || null,
                presentationName: presentation?.name || null,
                barcode: presentation?.barcode || null,
                quantity,
                discountPct,
                isDualUom: dual.isDualUom,
                productUomId: dual.productUomId,
                productUomName: dual.productUomName,
                secUomId: dual.secUomId,
                secUomName: dual.secUomName,
                uomRatio: dual.uomRatio,
            };
        },
        [loadProduct]
    );

    const addFromPresentation = useCallback(
        async (
            presentation: IFPresentation,
            quantity: number,
            item?: IFItem | null,
            discountPct?: number
        ) => {
            if (!ensureSaleSetup()) return;
            if (!presentation.itemId) {
                notify('La presentación no tiene ítem asociado', 'error', 3000);
                return;
            }
            const input = await buildCartInput({
                item,
                presentation,
                quantity,
                discountPct,
            });
            if (!input) return;
            await addCartEntry(input);
            clearPending();
            setCodeInput('');
            setCodeQty(1);
            notify(
                input.isDualUom
                    ? 'Producto catch-weight agregado (piezas + kg teóricos)'
                    : 'Producto agregado',
                'success',
                1200
            );
            setTimeout(() => codeInputRef.current?.instance?.()?.focus?.(), 50);
        },
        [addCartEntry, ensureSaleSetup, clearPending, buildCartInput]
    );

    const addItemFromCatalog = useCallback(
        async (item: IFItem) => {
            if (!token) return;
            if (!ensureSaleSetup()) return;

            try {
                setCodeSearching(true);
                clearPending();

                const presentationsRes = await itemsService.getPresentations(
                    item.id,
                    token,
                    currentCompany?.id
                );
                const presentations = (presentationsRes.items || []).filter(
                    (p) => p.active !== false
                );

                if (!presentations.length) {
                    const input = await buildCartInput({
                        item,
                        quantity: 1,
                        discountPct: entryDiscountPct,
                    });
                    if (!input) return;
                    await addCartEntry(input);
                    notify('Producto agregado (sin presentaciones)', 'success', 1200);
                    return;
                }

                if (presentations.length === 1) {
                    await addFromPresentation(
                        presentations[0],
                        1,
                        item,
                        entryDiscountPct
                    );
                    return;
                }

                setPendingItem(item);
                setPendingPresentations(presentations);
            } catch (error) {
                console.error('Error loading presentations from catalog:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar las presentaciones',
                    'error',
                    3000
                );
            } finally {
                setCodeSearching(false);
            }
        },
        [
            token,
            currentCompany?.id,
            ensureSaleSetup,
            addCartEntry,
            addFromPresentation,
            entryDiscountPct,
            clearPending,
            buildCartInput,
        ]
    );

    const handleCodeSearch = useCallback(
        async (codeOverride?: string, qtyOverride?: number) => {
            if (!token || !currentCompany?.id) return;
            if (!ensureSaleSetup()) return;

            const liveCode =
                codeOverride ??
                codeInputRef.current?.instance?.()?.option?.('text') ??
                codeInputRef.current?.instance?.()?.option?.('value') ??
                codeInput;
            const code = String(liveCode || '').trim();
            if (!code) {
                notify(
                    codeLookupMode === 'barcode'
                        ? 'Ingresá un código de barras'
                        : 'Ingresá un código de ítem',
                    'warning',
                    2000
                );
                return;
            }
            setCodeInput(code);
            const qty = Math.max(1, qtyOverride ?? codeQty ?? 1);

            setCodeSearching(true);
            clearPending();

            try {
                if (codeLookupMode === 'barcode') {
                    const byBarcode = await itemsService.getByBarcode(
                        code,
                        token,
                        currentCompany.id
                    );
                    await addFromPresentation(
                        byBarcode,
                        qty,
                        null,
                        entryDiscountPct
                    );
                    return;
                }

                // El path acepta id o SKU: no hace falta item-by-sku antes.
                const presentationsRes = await itemsService.getPresentations(
                    code,
                    token,
                    currentCompany.id
                );
                const presentations = (presentationsRes.items || []).filter(
                    (p) => p.active !== false
                );

                if (!presentations.length) {
                    // Sin presentaciones: fallback al ítem para poder cargarlo igual.
                    const item = await itemsService.getItembySku(
                        code,
                        token,
                        currentCompany.id
                    );
                    const input = await buildCartInput({
                        item,
                        quantity: qty,
                        discountPct: entryDiscountPct,
                        fallbackCode: code,
                    });
                    if (!input) return;
                    await addCartEntry(input);
                    setCodeInput('');
                    setCodeQty(1);
                    notify('Producto agregado (sin presentaciones)', 'success', 1500);
                    return;
                }

                if (presentations.length === 1) {
                    await addFromPresentation(
                        presentations[0],
                        qty,
                        null,
                        entryDiscountPct
                    );
                    return;
                }

                setPendingItem(itemStubFromPresentations(presentations, code));
                setPendingPresentations(presentations);
            } catch (error) {
                console.error('Error searching code in POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : codeLookupMode === 'barcode'
                          ? 'No se encontró el código de barras'
                          : 'No se encontró el código de ítem',
                    'error',
                    3500
                );
            } finally {
                setCodeSearching(false);
            }
        },
        [
            token,
            currentCompany?.id,
            codeInput,
            codeQty,
            entryDiscountPct,
            codeLookupMode,
            ensureSaleSetup,
            addFromPresentation,
            addCartEntry,
            clearPending,
            buildCartInput,
        ]
    );

    return {
        codeLookupMode,
        setCodeLookupMode,
        codeInput,
        setCodeInput,
        codeQty,
        setCodeQty,
        codeSearching,
        pendingItem,
        pendingPresentations,
        codeInputRef,
        clearPending,
        resetCodeEntry,
        addFromPresentation,
        addItemFromCatalog,
        handleCodeSearch,
    };
}

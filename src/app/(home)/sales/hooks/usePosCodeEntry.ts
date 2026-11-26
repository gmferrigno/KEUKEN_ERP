'use client';

import { useAuth } from '@/contexts/AuthContext';
import type { IFItem, IFPresentation } from '@repo/api-contracts/erp';
import { itemsService } from '@repo/erp-services/product_services/items.service';
import notify from 'devextreme/ui/notify';
import { useCallback, useRef, useState } from 'react';
import type { CartAddInput, PosCodeLookupMode } from '../types';

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

    const clearPending = useCallback(() => {
        setPendingItem(null);
        setPendingPresentations([]);
    }, []);

    const resetCodeEntry = useCallback(() => {
        setCodeInput('');
        setCodeQty(1);
        clearPending();
    }, [clearPending]);

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
            await addCartEntry({
                itemId: presentation.itemId,
                productId: presentation.productId || item?.productId,
                productCode:
                    presentation.itemSku ||
                    presentation.productCode ||
                    item?.sku ||
                    presentation.barcode ||
                    '',
                productDescription:
                    presentation.itemDisplayName ||
                    presentation.itemName ||
                    presentation.productName ||
                    presentation.name ||
                    item?.itemName ||
                    'Producto',
                presentationId: presentation.id,
                presentationName: presentation.name,
                barcode: presentation.barcode,
                quantity,
                discountPct,
            });
            clearPending();
            setCodeInput('');
            setCodeQty(1);
            notify('Producto agregado', 'success', 1200);
            setTimeout(() => codeInputRef.current?.instance?.()?.focus?.(), 50);
        },
        [addCartEntry, ensureSaleSetup, clearPending]
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
                    await addCartEntry({
                        itemId: item.id,
                        productId: item.productId,
                        productCode: item.sku || '',
                        productDescription:
                            item.itemDisplayName ||
                            item.itemName ||
                            item.productName ||
                            item.sku,
                        quantity: 1,
                        discountPct: entryDiscountPct,
                    });
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

                const item = await itemsService.getItembySku(
                    code,
                    token,
                    currentCompany.id
                );
                const presentationsRes = await itemsService.getPresentations(
                    item.id,
                    token,
                    currentCompany.id
                );
                const presentations = (presentationsRes.items || []).filter(
                    (p) => p.active !== false
                );

                if (!presentations.length) {
                    await addCartEntry({
                        itemId: item.id,
                        productId: item.productId,
                        productCode: item.sku || code,
                        productDescription:
                            item.itemDisplayName ||
                            item.itemName ||
                            item.productName ||
                            item.sku,
                        quantity: qty,
                        discountPct: entryDiscountPct,
                    });
                    setCodeInput('');
                    setCodeQty(1);
                    notify('Producto agregado (sin presentaciones)', 'success', 1500);
                    return;
                }

                if (presentations.length === 1) {
                    await addFromPresentation(
                        presentations[0],
                        qty,
                        item,
                        entryDiscountPct
                    );
                    return;
                }

                setPendingItem(item);
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

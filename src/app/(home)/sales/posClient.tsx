'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { canDo } from '@repo/access';
import type {
    IFCustomerAddress,
    IFCustomerFull,
    IFItem,
    IFOptionItem,
    IFPresentation,
    IFPriceListCatalogItem,
} from '@repo/api-contracts/erp';
import { Button, SelectBox } from '@repo/devextreme';
import { customersService } from '@repo/erp-services/partners/customers.service';
import { itemsService } from '@repo/erp-services/product_services/items.service';
import { priceListsService } from '@repo/erp-services/priceLists/priceLists.service';
import { saleOrdersService } from '@repo/erp-services/priceLists/saleOrders.service';
import CustomStore from 'devextreme/data/custom_store';
import notify from 'devextreme/ui/notify';
import NumberBox from 'devextreme-react/number-box';
import TextBox from 'devextreme-react/text-box';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

type PosViewMode = 'catalog' | 'code';

type PosCartLine = {
    key: string;
    itemId: string;
    productId: string;
    productCode: string;
    productDescription: string;
    presentationId: string | null;
    presentationName: string | null;
    barcode: string | null;
    pricelistId: string | null;
    unitPrice: number;
    discountPct: number;
    quantity: number;
};

type CartAddInput = {
    itemId: string;
    productId?: string | null;
    productCode: string;
    productDescription: string;
    presentationId?: string | null;
    presentationName?: string | null;
    barcode?: string | null;
    quantity?: number;
};

const PAGE_SIZE = 500;

const currencyFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
});

const clampPct = (value: number) => Math.min(100, Math.max(0, value || 0));

const lineGross = (line: PosCartLine) => line.unitPrice * line.quantity;

const lineNet = (line: PosCartLine) =>
    lineGross(line) * (1 - clampPct(line.discountPct) / 100);

const cartLineKey = (itemId: string, presentationId?: string | null) =>
    presentationId ? `${itemId}:${presentationId}` : itemId;

const pickSalesAddress = (addresses: IFCustomerAddress[]): IFCustomerAddress | null => {
    if (!addresses.length) return null;
    const sales = addresses.find((a) => a.active && a.type?.includes('sales'));
    if (sales) return sales;
    const delivery = addresses.find((a) => a.active && a.type?.includes('delivery'));
    if (delivery) return delivery;
    return addresses.find((a) => a.active) || addresses[0] || null;
};

const PosClient = () => {
    const { token, loading, currentCompany, permissions, isSuperAdmin } = useAuth();
    const { currentBranch } = useBranch();

    const [viewMode, setViewMode] = useState<PosViewMode>('catalog');

    const [customerId, setCustomerId] = useState<string | null>(null);
    const [customerLabel, setCustomerLabel] = useState('');
    const [customerFull, setCustomerFull] = useState<IFCustomerFull | null>(null);
    const [addressId, setAddressId] = useState<string | null>(null);

    const [defaultPricelistId, setDefaultPricelistId] = useState<string | null>(null);
    const [pricelistOptions, setPricelistOptions] = useState<IFOptionItem[]>([]);

    const [products, setProducts] = useState<IFItem[]>([]);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productSearch, setProductSearch] = useState('');

    const [codeInput, setCodeInput] = useState('');
    const [codeQty, setCodeQty] = useState(1);
    const [codeSearching, setCodeSearching] = useState(false);
    const [pendingItem, setPendingItem] = useState<IFItem | null>(null);
    const [pendingPresentations, setPendingPresentations] = useState<IFPresentation[]>([]);

    const [cart, setCart] = useState<PosCartLine[]>([]);
    const [orderDiscountPct, setOrderDiscountPct] = useState(0);
    const [orderDiscountAmount, setOrderDiscountAmount] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const catalogCacheRef = useRef<Map<string, IFPriceListCatalogItem[]>>(new Map());
    const priceLookupInFlight = useRef<Set<string>>(new Set());
    const codeInputRef = useRef<any>(null);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const customersStore = useMemo(() => {
        return new CustomStore({
            key: 'id',
            byKey: async (key: string) => {
                if (!token || !key) return null;
                const full = await customersService.getFullById(key, token, currentCompany?.id);
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
            .getAll(token, currentCompany.id, 200, 0, { operation: 'sale' })
            .then((response) => {
                if (cancelled) return;
                setPricelistOptions(
                    (response.items || []).map((list) => ({
                        id: list.id,
                        label: list.name,
                        code: list.name,
                        meta: { state: list.state },
                    }))
                );
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
                    return [{ id: list.id, label: list.name, code: list.name }, ...prev];
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
            setAddressId(null);
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

                const address = pickSalesAddress(full.addresses || []);
                setAddressId(address?.id || null);

                const inferredPricelist =
                    address?.pricelistId || full.customer.pricelistId || null;
                if (inferredPricelist) {
                    setDefaultPricelistId(inferredPricelist);
                }
            } catch (error) {
                console.error('Error loading customer for POS:', error);
                notify(
                    error instanceof Error ? error.message : 'No se pudo cargar el cliente',
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
        if (viewMode !== 'catalog' || !token || !currentCompany?.id) {
            return;
        }

        let cancelled = false;
        const loadProducts = async () => {
            try {
                setProductsLoading(true);
                const allItems: IFItem[] = [];
                let offset = 0;
                let totalItems = Infinity;

                while (!cancelled && offset < totalItems) {
                    const response = await itemsService.getAll(
                        currentCompany.id,
                        {
                            limit: PAGE_SIZE,
                            offset,
                            search: productSearch.trim() || undefined,
                        },
                        token,
                        false
                    );
                    const page = response.items || [];
                    allItems.push(...page);
                    totalItems = response.metadata?.totalItems ?? allItems.length;
                    if (page.length < PAGE_SIZE) break;
                    offset += PAGE_SIZE;
                }

                if (cancelled) return;
                setProducts(allItems);
            } catch (error) {
                console.error('Error loading products for POS:', error);
                notify(
                    error instanceof Error
                        ? error.message
                        : 'No se pudieron cargar los productos',
                    'error',
                    3000
                );
                setProducts([]);
            } finally {
                if (!cancelled) setProductsLoading(false);
            }
        };

        const timer = window.setTimeout(loadProducts, productSearch.trim() ? 300 : 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [viewMode, token, currentCompany?.id, productSearch]);

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

    const effectiveOrderDiscount = useMemo(() => {
        const fromPct = cartSubtotal * (clampPct(orderDiscountPct) / 100);
        const amount = Math.max(0, orderDiscountAmount || 0);
        return Math.min(cartSubtotal, Math.max(fromPct, amount));
    }, [cartSubtotal, orderDiscountPct, orderDiscountAmount]);

    const cartTotal = useMemo(
        () => Math.max(0, cartSubtotal - effectiveOrderDiscount),
        [cartSubtotal, effectiveOrderDiscount]
    );

    const cartCount = useMemo(
        () => cart.reduce((sum, line) => sum + line.quantity, 0),
        [cart]
    );

    const addCartEntry = useCallback(
        async (input: CartAddInput) => {
            const listId = defaultPricelistId;
            const qty = Math.max(1, input.quantity || 1);
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

            setCart((prev) => {
                const existing = prev.find((line) => line.key === key);
                if (existing) {
                    return prev.map((line) =>
                        line.key === key
                            ? { ...line, quantity: line.quantity + qty }
                            : line
                    );
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
                        discountPct: 0,
                        quantity: qty,
                    },
                ];
            });
        },
        [defaultPricelistId, resolvePriceFromList]
    );

    const addItemFromCatalog = useCallback(
        async (item: IFItem) => {
            await addCartEntry({
                itemId: item.id,
                productId: item.productId,
                productCode: item.sku || '',
                productDescription:
                    item.itemDisplayName || item.itemName || item.productName || item.sku,
                quantity: 1,
            });
        },
        [addCartEntry]
    );

    const addFromPresentation = useCallback(
        async (presentation: IFPresentation, quantity: number, item?: IFItem | null) => {
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
            });
            setPendingItem(null);
            setPendingPresentations([]);
            setCodeInput('');
            setCodeQty(1);
            notify('Producto agregado', 'success', 1200);
            setTimeout(() => codeInputRef.current?.instance?.()?.focus?.(), 50);
        },
        [addCartEntry]
    );

    const handleCodeSearch = useCallback(async () => {
        if (!token || !currentCompany?.id) return;
        const code = codeInput.trim();
        if (!code) {
            notify('Ingresá un código o código de barras', 'warning', 2000);
            return;
        }
        const qty = Math.max(1, codeQty || 1);

        setCodeSearching(true);
        setPendingItem(null);
        setPendingPresentations([]);

        try {
            // 1) Código de barras → presentación directa
            try {
                const byBarcode = await itemsService.getByBarcode(
                    code,
                    token,
                    currentCompany.id
                );
                await addFromPresentation(byBarcode, qty);
                return;
            } catch {
                // No es barcode; seguir con SKU/código de producto
            }

            // 2) Código de producto/SKU → listar presentaciones
            const item = await itemsService.getItembySku(code, token, currentCompany.id);
            const presentationsRes = await itemsService.getPresentations(
                item.id,
                token,
                currentCompany.id
            );
            const presentations = (presentationsRes.items || []).filter((p) => p.active !== false);

            if (!presentations.length) {
                await addCartEntry({
                    itemId: item.id,
                    productId: item.productId,
                    productCode: item.sku || code,
                    productDescription:
                        item.itemDisplayName || item.itemName || item.productName || item.sku,
                    quantity: qty,
                });
                setCodeInput('');
                setCodeQty(1);
                notify('Producto agregado (sin presentaciones)', 'success', 1500);
                return;
            }

            if (presentations.length === 1) {
                await addFromPresentation(presentations[0], qty, item);
                return;
            }

            setPendingItem(item);
            setPendingPresentations(presentations);
        } catch (error) {
            console.error('Error searching code in POS:', error);
            notify(
                error instanceof Error
                    ? error.message
                    : 'No se encontró el código ni el código de barras',
                'error',
                3500
            );
        } finally {
            setCodeSearching(false);
        }
    }, [
        token,
        currentCompany?.id,
        codeInput,
        codeQty,
        addFromPresentation,
        addCartEntry,
    ]);

    const updateLine = useCallback((key: string, patch: Partial<PosCartLine>) => {
        setCart((prev) =>
            prev
                .map((line) => {
                    if (line.key !== key) return line;
                    const next = { ...line, ...patch };
                    if (patch.quantity !== undefined && (!patch.quantity || patch.quantity <= 0)) {
                        return null;
                    }
                    if (patch.discountPct !== undefined) {
                        next.discountPct = clampPct(patch.discountPct);
                    }
                    if (patch.unitPrice !== undefined) {
                        next.unitPrice = Math.max(0, patch.unitPrice || 0);
                    }
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

    const clearSale = useCallback(() => {
        setCart([]);
        setCustomerId(null);
        setCustomerLabel('');
        setCustomerFull(null);
        setAddressId(null);
        setDefaultPricelistId(null);
        setProductSearch('');
        setCodeInput('');
        setCodeQty(1);
        setPendingItem(null);
        setPendingPresentations([]);
        setOrderDiscountPct(0);
        setOrderDiscountAmount(0);
    }, []);

    const handleConfirm = async () => {
        if (!token || !currentCompany?.id) return;
        if (!canModify) {
            notify('No tenés permisos para registrar una venta', 'warning', 3000);
            return;
        }
        if (!customerId) {
            notify('Seleccioná un cliente', 'warning', 2500);
            return;
        }
        if (!cart.length) {
            notify('Agregá al menos un producto', 'warning', 2500);
            return;
        }

        const footerPct = clampPct(orderDiscountPct);

        try {
            setSubmitting(true);
            const result = await saleOrdersService.create(
                {
                    customerId,
                    customerAddressId: addressId,
                    pricelistId: defaultPricelistId,
                    branchId: currentBranch?.id || null,
                    taxData: null,
                    lines: cart.map((line) => {
                        const linePct = clampPct(line.discountPct);
                        const discountData: Array<{
                            type: 'negociado';
                            percent: number;
                            displayScope: 'line' | 'footer';
                        }> = [];

                        if (linePct > 0) {
                            discountData.push({
                                type: 'negociado',
                                percent: linePct,
                                displayScope: 'line',
                            });
                        }
                        if (footerPct > 0) {
                            discountData.push({
                                type: 'negociado',
                                percent: footerPct,
                                displayScope: 'footer',
                            });
                        }

                        return {
                            itemId: line.itemId,
                            name: line.productDescription || line.productCode,
                            productUomQty: line.quantity,
                            pricelistId: line.pricelistId,
                            presentationId: line.presentationId,
                            priceUnitRegular: line.unitPrice > 0 ? line.unitPrice : null,
                            discountData: discountData.length ? discountData : null,
                        };
                    }),
                },
                token,
                currentCompany.id
            );

            notify(
                result.name
                    ? `Venta ${result.name} creada (${result.state})`
                    : result.message || 'Venta creada',
                'success',
                4000
            );

            if (result.saleOrderId) {
                window.open(`/priceLists/saleOrderDetail?id=${result.saleOrderId}`, '_blank');
            }

            clearSale();
        } catch (error) {
            console.error('Error creating POS sale:', error);
            notify(
                error instanceof Error ? error.message : 'No se pudo registrar la venta',
                'error',
                4000
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="flex flex-col w-full h-full min-h-0 gap-3 overflow-hidden">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 shrink-0">
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-main/70">Cliente</label>
                    <SelectBox
                        dataSource={customersStore}
                        valueExpr="id"
                        displayExpr="label"
                        value={customerId}
                        onValueChanged={(e) => {
                            setCustomerId(e.value || null);
                            const item = e.component.option('selectedItem') as IFOptionItem | null;
                            setCustomerLabel(item?.label || '');
                            setCart([]);
                            setOrderDiscountPct(0);
                            setOrderDiscountAmount(0);
                        }}
                        placeholder="Buscar cliente..."
                        searchEnabled
                        searchExpr={['label', 'code']}
                        showClearButton
                        stylingMode="filled"
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                    {customerLabel && customerFull && (
                        <p className="text-[11px] text-main/55 truncate">
                            {customerFull.addresses?.length
                                ? `${customerFull.addresses.length} dirección(es)`
                                : 'Sin direcciones'}
                            {addressId ? ' · dirección de venta lista' : ''}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-main/70">
                        Lista de precios (sugerida)
                    </label>
                    <SelectBox
                        dataSource={pricelistOptions}
                        valueExpr="id"
                        displayExpr="label"
                        value={defaultPricelistId}
                        onValueChanged={(e) => setDefaultPricelistId(e.value || null)}
                        placeholder="Opcional al agregar productos..."
                        searchEnabled
                        searchExpr={['label', 'code']}
                        showClearButton
                        stylingMode="filled"
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>

                <div className="flex flex-col gap-1 justify-end">
                    <div className="flex items-center gap-2 h-[36px] px-3 rounded-dx bg-main/5 border border-main/10 text-sm">
                        <i className="dx-icon dx-icon-home text-main/60" />
                        <span className="truncate text-main/80">
                            {currentBranch?.name || 'Sin sucursal seleccionada'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3 overflow-hidden">
                <section className="flex flex-col min-h-0 rounded-dx border border-main/10 bg-primary-500/40 overflow-hidden">
                    <div className="flex items-center gap-2 p-2 border-b border-main/10 shrink-0">
                        <div className="inline-flex rounded-dx border border-main/15 overflow-hidden">
                            <button
                                type="button"
                                onClick={() => setViewMode('catalog')}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                    viewMode === 'catalog'
                                        ? 'bg-focus-500/20 text-main'
                                        : 'text-main/60 hover:bg-main/10'
                                }`}
                            >
                                Catálogo
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode('code')}
                                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                                    viewMode === 'code'
                                        ? 'bg-focus-500/20 text-main'
                                        : 'text-main/60 hover:bg-main/10'
                                }`}
                            >
                                Código / Cantidad
                            </button>
                        </div>
                        <span className="ml-auto text-[11px] text-main/50">
                            {viewMode === 'catalog'
                                ? productsLoading
                                    ? 'Cargando...'
                                    : `${products.length} productos`
                                : 'SKU o código de barras'}
                        </span>
                    </div>

                    {viewMode === 'catalog' ? (
                        <>
                            <div className="p-2 border-b border-main/10 shrink-0">
                                <TextBox
                                    value={productSearch}
                                    onValueChanged={(e) => setProductSearch(e.value || '')}
                                    placeholder="Buscar producto por SKU o nombre..."
                                    stylingMode="filled"
                                    mode="search"
                                    showClearButton
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                            </div>
                            <div className="flex-1 min-h-0 overflow-y-auto p-2">
                                {!productsLoading && products.length === 0 && (
                                    <div className="h-full min-h-[160px] flex items-center justify-center text-sm text-main/50">
                                        No hay productos para mostrar
                                    </div>
                                )}
                                <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
                                    {products.map((item) => (
                                        <button
                                            key={item.id}
                                            type="button"
                                            onClick={() => addItemFromCatalog(item)}
                                            className="text-left p-2.5 rounded-dx border border-main/10 bg-variant/40 hover:bg-focus-500/10 hover:border-focus-500/30 transition-colors cursor-pointer"
                                        >
                                            <div className="text-[11px] font-medium text-main/55 truncate">
                                                {item.sku || item.id}
                                            </div>
                                            <div className="text-sm font-semibold text-main line-clamp-2 min-h-[2.4rem]">
                                                {item.itemDisplayName ||
                                                    item.itemName ||
                                                    item.productName ||
                                                    'Sin descripción'}
                                            </div>
                                            <div className="mt-1.5 flex justify-end text-[11px] text-main/60">
                                                <span className="inline-flex items-center gap-1">
                                                    <i className="dx-icon dx-icon-plus" />
                                                    Agregar
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
                            <div className="grid grid-cols-[1fr_110px_auto] gap-2 items-end">
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase tracking-wide text-main/45">
                                        Código / barras
                                    </label>
                                    <TextBox
                                        ref={codeInputRef}
                                        value={codeInput}
                                        onValueChanged={(e) => setCodeInput(e.value || '')}
                                        placeholder="SKU o código de barras"
                                        stylingMode="filled"
                                        onKeyDown={(e: any) => {
                                            if (e.event?.key === 'Enter') {
                                                e.event.preventDefault();
                                                handleCodeSearch();
                                            }
                                        }}
                                        elementAttr={{ class: 'rounded-dx' }}
                                    />
                                </div>
                                <div className="flex flex-col gap-1">
                                    <label className="text-[10px] uppercase tracking-wide text-main/45">
                                        Cantidad
                                    </label>
                                    <NumberBox
                                        value={codeQty}
                                        min={1}
                                        step={1}
                                        showSpinButtons
                                        stylingMode="filled"
                                        onValueChanged={(e) =>
                                            setCodeQty(Math.max(1, Number(e.value) || 1))
                                        }
                                        onKeyDown={(e: any) => {
                                            if (e.event?.key === 'Enter') {
                                                e.event.preventDefault();
                                                handleCodeSearch();
                                            }
                                        }}
                                        elementAttr={{ class: 'rounded-dx' }}
                                    />
                                </div>
                                <Button
                                    text={codeSearching ? '...' : 'Agregar'}
                                    icon="search"
                                    type="default"
                                    stylingMode="contained"
                                    height={36}
                                    disabled={codeSearching || !codeInput.trim()}
                                    onClick={handleCodeSearch}
                                />
                            </div>

                            <p className="text-[11px] text-main/50">
                                Si es código de barras, se agrega directo. Si es código de
                                producto, se listan las presentaciones.
                            </p>

                            {pendingItem && pendingPresentations.length > 0 && (
                                <div className="flex flex-col gap-2">
                                    <div className="text-sm font-medium text-main">
                                        Presentaciones de{' '}
                                        <span className="text-focus-400">
                                            {pendingItem.sku || pendingItem.itemName}
                                        </span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        {pendingPresentations.map((pres) => (
                                            <button
                                                key={pres.id}
                                                type="button"
                                                onClick={() =>
                                                    addFromPresentation(
                                                        pres,
                                                        codeQty,
                                                        pendingItem
                                                    )
                                                }
                                                className="text-left px-3 py-2 rounded-dx border border-main/10 bg-variant/40 hover:bg-focus-500/10 hover:border-focus-500/30 transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-semibold text-main truncate">
                                                            {pres.name}
                                                        </div>
                                                        <div className="text-[11px] text-main/55 truncate">
                                                            {[
                                                                pres.barcode
                                                                    ? `Barras: ${pres.barcode}`
                                                                    : null,
                                                                pres.uomName
                                                                    ? `UdM: ${pres.uomName}`
                                                                    : null,
                                                                pres.packagingLevelName ||
                                                                    pres.packagingLevelCode,
                                                            ]
                                                                .filter(Boolean)
                                                                .join(' · ')}
                                                        </div>
                                                    </div>
                                                    <i className="dx-icon dx-icon-plus text-main/60" />
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </section>

                <section className="flex flex-col min-h-0 rounded-dx border border-main/10 bg-primary-900/20 overflow-hidden">
                    <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-main/10 shrink-0">
                        <div>
                            <h3 className="text-sm font-semibold text-main">Carrito</h3>
                            <p className="text-[11px] text-main/55">
                                {cartCount} ítem(s) · {cart.length} línea(s)
                            </p>
                        </div>
                        <Button
                            text="Vaciar"
                            icon="trash"
                            stylingMode="text"
                            disabled={!cart.length || submitting}
                            onClick={() => {
                                setCart([]);
                                setOrderDiscountPct(0);
                                setOrderDiscountAmount(0);
                            }}
                        />
                    </div>

                    <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5">
                        {!cart.length && (
                            <div className="flex-1 flex items-center justify-center text-sm text-main/50">
                                Agregá productos desde el catálogo o por código
                            </div>
                        )}

                        {cart.map((line) => (
                            <div
                                key={line.key}
                                className="rounded-dx border border-main/10 bg-variant/30 px-2 py-1.5 flex flex-col gap-1"
                            >
                                <div className="flex items-center gap-2 min-w-0">
                                    <div className="min-w-0 flex-1">
                                        <div className="text-xs font-medium text-main truncate">
                                            <span className="text-main/55 mr-1">
                                                {line.productCode}
                                            </span>
                                            {line.productDescription}
                                        </div>
                                        {(line.presentationName || line.barcode) && (
                                            <div className="text-[10px] text-main/45 truncate">
                                                {[
                                                    line.presentationName,
                                                    line.barcode
                                                        ? `CB: ${line.barcode}`
                                                        : null,
                                                ]
                                                    .filter(Boolean)
                                                    .join(' · ')}
                                            </div>
                                        )}
                                    </div>
                                    <span className="text-xs font-semibold text-main whitespace-nowrap">
                                        {currencyFmt.format(lineNet(line))}
                                    </span>
                                    <button
                                        type="button"
                                        className="p-0.5 rounded hover:bg-main/10 text-main/50"
                                        onClick={() => removeLine(line.key)}
                                        aria-label="Quitar"
                                    >
                                        <i className="dx-icon dx-icon-close text-sm" />
                                    </button>
                                </div>

                                <div className="grid grid-cols-[minmax(0,1.4fr)_64px_78px_58px] gap-1 items-center">
                                    <SelectBox
                                        dataSource={pricelistOptions}
                                        valueExpr="id"
                                        displayExpr="label"
                                        value={line.pricelistId}
                                        onValueChanged={(e) =>
                                            changeLinePricelist(
                                                line.key,
                                                line.itemId,
                                                e.value || null
                                            )
                                        }
                                        placeholder="Lista"
                                        searchEnabled
                                        showClearButton
                                        stylingMode="filled"
                                        height={28}
                                        elementAttr={{ class: 'rounded-dx text-xs' }}
                                    />
                                    <NumberBox
                                        value={line.quantity}
                                        min={1}
                                        step={1}
                                        showSpinButtons
                                        stylingMode="filled"
                                        height={28}
                                        onValueChanged={(e) =>
                                            updateLine(line.key, {
                                                quantity: Number(e.value) || 0,
                                            })
                                        }
                                        elementAttr={{ class: 'rounded-dx' }}
                                    />
                                    <NumberBox
                                        value={line.unitPrice}
                                        min={0}
                                        format="#,##0.00"
                                        stylingMode="filled"
                                        height={28}
                                        onValueChanged={(e) =>
                                            updateLine(line.key, {
                                                unitPrice: Number(e.value) || 0,
                                            })
                                        }
                                        elementAttr={{ class: 'rounded-dx' }}
                                    />
                                    <NumberBox
                                        value={line.discountPct}
                                        min={0}
                                        max={100}
                                        format="#0'%'"
                                        stylingMode="filled"
                                        height={28}
                                        onValueChanged={(e) =>
                                            updateLine(line.key, {
                                                discountPct: Number(e.value) || 0,
                                            })
                                        }
                                        elementAttr={{ class: 'rounded-dx' }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="px-2.5 py-2 border-t border-main/10 shrink-0 flex flex-col gap-2 bg-primary-500/50">
                        <div className="flex items-center justify-between text-xs">
                            <span className="text-main/70">Subtotal</span>
                            <span className="font-medium text-main">
                                {currencyFmt.format(cartSubtotal)}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-1.5">
                            <NumberBox
                                value={orderDiscountPct}
                                min={0}
                                max={100}
                                format="#0.##'%'"
                                stylingMode="filled"
                                height={30}
                                disabled={!cart.length}
                                placeholder="Dto %"
                                onValueChanged={(e) => {
                                    const pct = clampPct(Number(e.value) || 0);
                                    setOrderDiscountPct(pct);
                                    setOrderDiscountAmount(
                                        Number(((cartSubtotal * pct) / 100).toFixed(2))
                                    );
                                }}
                                elementAttr={{ class: 'rounded-dx' }}
                            />
                            <NumberBox
                                value={orderDiscountAmount}
                                min={0}
                                max={cartSubtotal || undefined}
                                format="#,##0.00"
                                stylingMode="filled"
                                height={30}
                                disabled={!cart.length}
                                placeholder="Dto $"
                                onValueChanged={(e) => {
                                    const amount = Math.max(0, Number(e.value) || 0);
                                    setOrderDiscountAmount(amount);
                                    setOrderDiscountPct(
                                        cartSubtotal > 0
                                            ? clampPct((amount / cartSubtotal) * 100)
                                            : 0
                                    );
                                }}
                                elementAttr={{ class: 'rounded-dx' }}
                            />
                        </div>

                        {effectiveOrderDiscount > 0 && (
                            <div className="flex items-center justify-between text-xs">
                                <span className="text-main/70">Descuento</span>
                                <span className="font-medium text-focus-400">
                                    −{currencyFmt.format(effectiveOrderDiscount)}
                                </span>
                            </div>
                        )}

                        <div className="flex items-end justify-between">
                            <span className="text-sm text-main/70">Total</span>
                            <span className="text-xl font-bold text-main tracking-tight">
                                {currencyFmt.format(cartTotal)}
                            </span>
                        </div>
                        <Button
                            text={submitting ? 'Registrando...' : 'Confirmar venta'}
                            icon="check"
                            type="default"
                            stylingMode="contained"
                            height={38}
                            disabled={
                                submitting ||
                                !customerId ||
                                !cart.length ||
                                !canModify
                            }
                            onClick={handleConfirm}
                            elementAttr={{ class: 'rounded-dx font-semibold' }}
                        />
                        <Button
                            text="Ver pedidos"
                            icon="orderedlist"
                            stylingMode="text"
                            height={30}
                            onClick={() => {
                                window.open('/priceLists/saleOrders', '_blank');
                            }}
                        />
                    </div>
                </section>
            </div>
        </div>
    );
};

export default PosClient;

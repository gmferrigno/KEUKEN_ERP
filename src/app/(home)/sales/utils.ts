import type {
    IFCategory,
    IFCustomerAddress,
    IFItem,
    IFPresentation,
    IFProduct,
} from '@repo/api-contracts/erp';
import type { PosCartLine } from './types';

export const PAGE_SIZE = 500;

export const currencyFmt = new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
});

export const clampPct = (value: number) => Math.min(100, Math.max(0, value || 0));

export const lineGross = (line: PosCartLine) => line.unitPrice * line.quantity;

export const lineNet = (line: PosCartLine) =>
    lineGross(line) * (1 - clampPct(line.discountPct) / 100);

export const cartLineKey = (itemId: string, presentationId?: string | null) =>
    presentationId ? `${itemId}:${presentationId}` : itemId;

export const isCatchWeightBillingMode = (
    code: string | null | undefined
): boolean => code === 'by_weight_and_unit';

export const resolveUomRatio = (
    presentation?: Pick<IFPresentation, 'uomRatio' | 'factor' | 'ratio'> | null,
    item?: Pick<IFItem, 'uomRatio'> | null
): number | null => {
    const candidates = [
        presentation?.uomRatio,
        presentation?.factor,
        presentation?.ratio,
        item?.uomRatio,
    ];
    for (const raw of candidates) {
        const n = Number(raw);
        if (Number.isFinite(n) && n > 0) return n;
    }
    return null;
};

/** kg teóricos = piezas × ratio. */
export const theoreticalBillingQty = (
    secQty: number,
    ratio: number | null | undefined
): number => {
    const pieces = Math.max(0, Number(secQty) || 0);
    const r = Number(ratio);
    if (!Number.isFinite(r) || r <= 0) return pieces;
    return Number((pieces * r).toFixed(4));
};

export type PosDualUomContext = {
    isDualUom: boolean;
    uomRatio: number | null;
    secUomId: string | null;
    secUomName: string | null;
    productUomId: string | null;
    productUomName: string | null;
};

/**
 * Dual/catch-weight: producto `by_weight_and_unit` (o legado `isDualUom`).
 * sec_uom: presentation.uom → product.defaultSecUom → item.secUom.
 */
export const resolvePosDualUom = ({
    item,
    presentation,
    product,
}: {
    item?: IFItem | null;
    presentation?: IFPresentation | null;
    product?: IFProduct | null;
}): PosDualUomContext => {
    const modeCode =
        product?.saleBillingModeCode ||
        product?.saleBillingMode?.code ||
        null;
    const isDualUom =
        isCatchWeightBillingMode(modeCode) ||
        Boolean(product?.saleBillingMode?.requiresSecondaryUom) ||
        Boolean(item?.isDualUom);

    const uomRatio = resolveUomRatio(presentation, item);

    return {
        isDualUom,
        uomRatio,
        secUomId:
            presentation?.uomId ||
            product?.defaultSecUomId ||
            item?.secUomId ||
            null,
        secUomName:
            presentation?.uomName ||
            product?.defaultSecUomName ||
            item?.secUomName ||
            null,
        productUomId: product?.uomId || null,
        productUomName: product?.uomName || null,
    };
};

/** Cantidad “visible” en badges (piezas en dual, facturación en el resto). */
export const cartDisplayQty = (line: PosCartLine): number =>
    line.isDualUom ? Number(line.secQuantity) || 0 : line.quantity;

/**
 * Stub mínimo de ítem a partir de presentaciones (cuando se resolvió por SKU
 * sin pasar por item-by-sku).
 */
export const itemStubFromPresentations = (
    presentations: IFPresentation[],
    skuFallback: string
): IFItem => {
    const first = presentations[0];
    return {
        id: first?.itemId || '',
        productId: first?.productId || '',
        productName: first?.productName || '',
        companyId: null,
        sku: first?.itemSku || skuFallback,
        itemName:
            first?.itemName ||
            first?.itemDisplayName ||
            first?.productName ||
            skuFallback,
        itemDisplayName: first?.itemDisplayName ?? null,
        active: true,
        costMethod: '',
        isDualUom: false,
        attributes: {},
        wheight: 0,
        volume: 0,
        palletUnits: 0,
        palletUomId: null,
        minDaysToExpiryReception: 0,
        minDaysToExpiryOrder: 0,
    };
};

export const startOfToday = () => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
};

/** Serializa fecha local a `yyyy-MM-dd` para `delivery_date`. */
export const toIsoDate = (
    value: Date | string | number | null | undefined
): string | null => {
    if (value == null || value === '') return null;
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
};

export const pickSalesAddress = (
    addresses: IFCustomerAddress[]
): IFCustomerAddress | null => {
    if (!addresses.length) return null;
    const sales = addresses.find((a) => a.active && a.type?.includes('sales'));
    if (sales) return sales;
    const delivery = addresses.find(
        (a) => a.active && a.type?.includes('delivery')
    );
    if (delivery) return delivery;
    return addresses.find((a) => a.active) || addresses[0] || null;
};

/** Direcciones activas tipadas como delivery. */
export const listDeliveryAddresses = (
    addresses: IFCustomerAddress[]
): IFCustomerAddress[] =>
    (addresses || []).filter(
        (a) => a.active && a.type?.includes('delivery')
    );

/** Preferencia para reparto: delivery → sales → activa. */
export const pickDeliveryAddress = (
    addresses: IFCustomerAddress[]
): IFCustomerAddress | null => {
    if (!addresses.length) return null;
    const delivery = listDeliveryAddresses(addresses)[0];
    if (delivery) return delivery;
    const sales = addresses.find((a) => a.active && a.type?.includes('sales'));
    if (sales) return sales;
    return addresses.find((a) => a.active) || addresses[0] || null;
};

export const formatCustomerAddress = (
    address: IFCustomerAddress | null | undefined
): string => {
    if (!address) return '';
    const parts = [
        address.name,
        address.street,
        address.cityName,
        address.stateName,
        address.zip,
    ]
        .map((part) => String(part || '').trim())
        .filter(Boolean);
    // Evita "Nombre · Nombre" si street vacío y name es lo único útil.
    return Array.from(new Set(parts)).join(' · ');
};

export const formatMissingList = (missing: string[]) =>
    missing.length > 1
        ? `${missing.slice(0, -1).join(', ')} y ${missing[missing.length - 1]}`
        : missing[0] || '';

/** Incluye la categoría raíz y todas sus descendientes. */
export const collectCategoryTreeIds = (
    categories: IFCategory[],
    rootId: string
): string[] => {
    const ids = new Set<string>([rootId]);
    let grew = true;
    while (grew) {
        grew = false;
        for (const cat of categories) {
            if (cat.parentId && ids.has(cat.parentId) && !ids.has(cat.id)) {
                ids.add(cat.id);
                grew = true;
            }
        }
    }
    return Array.from(ids);
};

/** Filtro DevExtreme para `categoryId` (soporta OR de varias / subcategorías). */
export const buildCategoryIdFilter = (categoryIds: string[]) => {
    if (!categoryIds.length) return null;
    if (categoryIds.length === 1) return ['categoryId', '=', categoryIds[0]];
    return categoryIds.reduce<any[]>((acc, id, index) => {
        const clause = ['categoryId', '=', id];
        if (index === 0) return [clause];
        return [...acc, 'or', clause];
    }, []);
};

/** Match local de búsqueda de catálogo (SKU / nombre). */
export const matchesCatalogSearch = (
    item: {
        sku?: string | null;
        itemName?: string | null;
        itemDisplayName?: string | null;
        productName?: string | null;
    },
    query: string
) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return [item.sku, item.itemName, item.itemDisplayName, item.productName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
};

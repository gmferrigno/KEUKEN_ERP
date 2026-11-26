import type { IFCustomerAddress, IFCategory } from '@repo/api-contracts/erp';
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

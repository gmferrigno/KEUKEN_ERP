export type PosViewMode = 'catalog' | 'code';
export type PosCodeLookupMode = 'item' | 'barcode';
/** Destino operativo del pedido (legado: preparar/reparto vs retiro mostrador). */
export type PosOrderDestination = 'reparto' | 'mostrador';

export type PosCartLine = {
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

export type CartAddInput = {
    itemId: string;
    productId?: string | null;
    productCode: string;
    productDescription: string;
    presentationId?: string | null;
    presentationName?: string | null;
    barcode?: string | null;
    quantity?: number;
    /** Dto % al agregar; el del carrito sirve para corregir después. */
    discountPct?: number;
};

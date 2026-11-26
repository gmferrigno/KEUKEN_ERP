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
    /** Cantidad de facturación (`product_uom_qty`). En catch-weight: kg. */
    quantity: number;
    productUomId: string | null;
    productUomName: string | null;
    /** Catch-weight / dual: piezas logísticas (`sec_uom_*`). */
    isDualUom: boolean;
    secQuantity: number | null;
    secUomId: string | null;
    secUomName: string | null;
    /** kg teóricos por pieza (presentation/item). */
    uomRatio: number | null;
};

export type CartAddInput = {
    itemId: string;
    productId?: string | null;
    productCode: string;
    productDescription: string;
    presentationId?: string | null;
    presentationName?: string | null;
    barcode?: string | null;
    /**
     * Cantidad de entrada.
     * Dual/catch-weight: piezas (`sec_uom_qty`).
     * Resto: facturación (`product_uom_qty`).
     */
    quantity?: number;
    /** Dto % al agregar; el del carrito sirve para corregir después. */
    discountPct?: number;
    isDualUom?: boolean;
    productUomId?: string | null;
    productUomName?: string | null;
    secUomId?: string | null;
    secUomName?: string | null;
    uomRatio?: number | null;
    /** Override de kg facturables al agregar dual (si no, qty × ratio). */
    productUomQty?: number | null;
};

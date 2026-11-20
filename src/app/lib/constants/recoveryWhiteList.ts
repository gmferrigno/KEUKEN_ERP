/**
 * Lista blanca de rutas de la aplicación que poseen Modo Papelera (Recovery Mode).
 * Evalúa si la ruta activa del navegador admite borrado lógico y recuperación.
 */
export const RECOVERY_WHITE_LIST: string[] = [
    '/products',
    '/productsv2',
    '/products/categories',
    '/products/brands',
    '/products/uom-categories',
    '/products/uoms',
    '/products/presentations',
    '/products/items',
    '/stock/serial-numbers',
    '/structure/establishments',
    '/structure/logisticCenters',
    '/priceLists',
    '/priceLists/pricePolicies',
    '/providers/articleHandling',
    '/providers/suppliers',
    '/logistics/routes',
    '/logistics/zones',
    '/logistics/vehicles',
    '/priceLists/listTypes',
    '/delivery',
    '/delivery/routes',
    '/delivery/zones',
    '/delivery/vehicles',
    '/providers',
    '/priceLists/paymentMethods',
    '/priceLists/paymentTerms',
    '/localization/countries',
    '/localization/states',
    '/localization/cities',
    '/customers',
    '/customers/addresses',
    '/accounting/cashRegisters',
    '/structure/branches',
];

/**
 * Mapeo centralizado de esquemas y tablas para la restauración de registros en Modo Papelera.
 */
export const RECOVERY_ENTITIES = {
    ACCOUNT_PAYMENT_TERM: { schema: 'accounting', table: 'account_payment_term' },
    PAYMENT_METHOD: { schema: 'accounting', table: 'payment_method' },
    PRICE_LIST_TYPE: { schema: 'commercial', table: 'pricelist_type' },
    LOGISTICS_CENTERS: { schema: 'common', table: 'logistics_center' },
    ESTABLISHMENTS: { schema: 'common', table: 'establishment' },
    SERIAL_NUMBER: { schema: 'wms', table: 'serial_number' },
    PRODUCT_CATEGORY: { schema: 'common', table: 'product_category' },
    UOM: { schema: 'common', table: 'uom' },
    PRODUCT: { schema: 'common', table: 'product' },
    UOM_CATEGORY: { schema: 'common', table: 'uom_category' },
    ITEM_PRESENTATION: { schema: 'common', table: 'item_presentation' },
    ITEM: { schema: 'common', table: 'item' },
    PRODUCT_BRAND: { schema: 'common', table: 'product_brand' },
    SUPPLIERS: { schema: 'common', table: 'supplier' },
    METADATA_ATTRIBUTE: { schema: 'common', table: 'metadata_attribute' },
    SALE_BILLING_MODE: { schema: 'common', table: 'sale_billing_mode' },
    CUSTOMER: { schema: 'common', table: 'customer' },
    TAX_CATEGORIES: { schema: 'partners', table: 'tax-categories' },
    TEMPERATURE_CLASS: { schema: 'common', table: 'handling_temperature_class' },
    HAZARD_CLASS: { schema: 'common', table: 'handling_hazard_class' },
    LOGISTIC_PROFILE: { schema: 'common', table: 'handling_logistics_profile' },
    SEGREGATION_GROUP: { schema: 'common', table: 'handling_segregation_group' },
    FRAGILITY_CLASSES: { schema: 'common', table: 'handling_fragility_class' },
    COUNTRIES: { schema: 'common', table: 'country' },
    CITIES: { schema: 'common', table: 'city' },
    STATES: { schema: 'common', table: 'state' },
    ZONE: { schema: 'common', table: 'zone' },
    ROUTE: { schema: 'wms', table: 'delivery_route' },
    VEHICLE: { schema: 'wms', table: 'vehicle' },
    CASH_REGISTER: { schema: 'common', table: 'cash_register' },
    BRANCHES: { schema: 'common', table: 'branch' },
} as const;

/**
 * Valida si la ruta indicada coincide exactamente con alguna de la lista blanca de Modo Papelera.
 */
export function isPathInRecoveryWhiteList(pathname: string): boolean {
    if (!pathname) return false;
    // Normalizar la ruta eliminando la barra final si existe
    const normalizedPath = pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;

    return RECOVERY_WHITE_LIST.some(route => {
        const normalizedRoute = route.length > 1 && route.endsWith('/') ? route.slice(0, -1) : route;
        return normalizedPath.toLowerCase() === normalizedRoute.toLowerCase();
    });
}

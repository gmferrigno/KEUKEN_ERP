
export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
    asset: 'Activo',
    liability: 'Pasivo',
    equity: 'Patrimonio',
    income: 'Ingreso',
    expense: 'Egreso',
    order: 'Orden',
};

export const TAX_USE_OPTIONS = [
    { id: 'sale', name: 'Venta' },
    { id: 'purchase', name: 'Compra' },
    { id: 'none', name: 'Ninguno' }
];

export const TAX_USE_LABELS: Record<string, string> = {
    sale: 'Venta',
    purchase: 'Compra',
    none: 'Ninguno'
};

export const TAX_AMOUNT_TYPE_OPTIONS = [
    { id: 'percent', name: 'Porcentaje' },
    { id: 'fixed', name: 'Monto Fijo' }
];

export const TAX_AMOUNT_TYPE_LABELS: Record<string, string> = {
    percent: 'Porcentaje',
    fixed: 'Monto Fijo'
};

export const TAX_SCOPE_OPTIONS = [
    { id: 'line', name: 'Línea' },
    { id: 'footer', name: 'Pie' }
];

export const TAX_SCOPE_LABELS: Record<string, string> = {
    line: 'Línea',
    footer: 'Pie'
};

export const TAX_RATE_STORAGE_OPTIONS = [
    { id: 'effective', name: 'Efectivo' },
    { id: 'nominal', name: 'Nominal' }
];

export const TAX_NOMINAL_BASIS_OPTIONS = [
    { id: 'exclusive', name: 'Excluido' },
    { id: 'inclusive', name: 'Incluido' }
];

export const TAX_BASE_CALCULATION_OPTIONS = [
    { id: 'net', name: 'Neto' },
    { id: 'net_plus_taxes', name: 'Neto + Impuestos' },
    { id: 'net_plus_iva', name: 'Neto + IVA' },
    { id: 'total', name: 'Total' }
];

export const TAX_BASE_CALCULATION_LABELS: Record<string, string> = {
    net: 'Neto',
    net_plus_taxes: 'Neto + Impuestos',
    net_plus_iva: 'Neto + IVA',
    total: 'Total'
};


import { IAppRoute } from "./getRoutes";

export interface ICustomDataRoute {
    icon: string;
    text: string;
    position?: number;
    parentSubText?: string;
    hideMainSubRoute?: boolean;
}

export type TRouteKey =
    'default' | 'users' | 'me' | 'sales' | 'groups' | 'by-role' | 'stock' | 'warehouses' |
    'products' | 'uoms' | 'categories' | 'providers' | 'keysmanager' | 'refused' |
    'accounting' | 'brands' | 'countries' | 'states' | 'cities' |
    'taxcategories' | 'currencies' | 'paymentmethods' | 'paymentterms' | 'periods' |
    'cashregisters' | 'delivery' | 'routes' | 'zones' | 'vehicles' | 'documents' |
    'pricelists' | 'listtypes' | 'pricepolicies' | 'saleorders' | 'salesroutes' |
    'salebillingmodes' | 'uom-categories' | 'sales-channels' | 'price-segments' | 'productdetail' | 'taxes' |
    'serial-numbers' | 'consignments' | 'partners' | 'customers' | 'addresses' | 'commercial-platforms' |
    'articlehandling' | 'metadata' | 'pricelistdetail' | 'saleorderdetail' | 'system' |
    'audit' | 'localization' | 'structure' | 'branches' | 'establishments' | 'logisticcenters' | 'audiences' | 'details' | 'mapa' | 'companies' | 'combos' |
    'sysadmin' | 'licenses' | 'firebird' |
    'inbound-receipts' | 'packages' | 'issuance-config';

export type TCustomDataRoutes = Record<TRouteKey, ICustomDataRoute>;


export const CustomDataRoutes: TCustomDataRoutes = {

    sysadmin: {
        icon: 'preferences',
        text: 'SysAdmin',
        position: 45,
        hideMainSubRoute: true,
        parentSubText: 'Empresas'
    },
    companies: {
        icon: 'home',
        text: 'Empresas',
        position: 5
    },
    licenses: {
        icon: 'key',
        text: 'Licencias',
        position: 10
    },
    firebird: {
        icon: 'fields',
        text: 'Firebird',
        position: 20
    },


    structure: {
        icon: 'hierarchy',
        text: 'Jerarquía',
        position: 6,
        hideMainSubRoute: true
    },
    branches: {
        icon: 'home',
        text: 'Sucursales',
        position: 10
    },
    establishments: {
        icon: 'home',
        text: 'Establecimientos',
        position: 20
    },
    logisticcenters: {
        icon: 'car',
        text: 'Centros Logísticos',
        position: 30
    },

    default: {
        icon: 'search',
        text: 'Misc',
        position: 999
    },
    users: {
        icon: 'group',
        text: 'Usuarios',
        position: 100,
        parentSubText: 'Listado de Usuarios'
    },
    groups: {
        icon: 'group',
        text: 'Grupos',
        position: 110
    },
    'by-role': {
        icon: 'card',
        text: 'Por Rol',
        position: 115
    },
    me: {
        icon: 'accountbox',
        text: 'Mi Cuenta',
        position: 120
    },
    accounting: {
        icon: 'bookmark',
        text: 'Contabilidad',
        position: 200,
        parentSubText: 'Libro Contable'
    },
    periods: {
        icon: 'calendar',
        text: 'Periodos',
        position: 210
    },
    cashregisters: {
        icon: 'money',
        text: 'Cajas',
        position: 215
    },
    taxes: {
        icon: 'percent',
        text: 'Impuestos',
        position: 220
    },
    sales: {
        icon: 'cart',
        text: 'Punto de Venta',
        position: 8
    },
    stock: {
        icon: 'packagebox',
        text: 'Stock',
        position: 3
    },
    warehouses: {
        icon: 'home',
        text: 'Depósitos',
        position: 1
    },
    products: {
        icon: 'box',
        text: 'Productos',
        position: 2,
        parentSubText: 'Listado de Artículos'
    },
    articlehandling: {
        icon: 'servicebell',
        text: 'Manejo de Artículos',
        position: 3,
        parentSubText: 'Proveedores'
    },
    productdetail: {
        icon: 'card',
        text: 'Detalle de Producto',
        position: 10
    },
    combos: {
        icon: 'gift',
        text: 'Combos',
        position: 15,
        parentSubText: 'Gestión de Combos'
    },
    categories: {
        icon: 'tags',
        text: 'Categorías',
        position: 110
    },
    partners: {
        icon: 'group',
        text: 'Partners',
        position: 10
    },
    customers: {
        icon: 'user',
        text: 'Clientes',
        position: 15,
        parentSubText: 'Listado de Clientes',
    },
    addresses: {
        icon: 'map',
        text: 'Direcciones',
        position: 20,
    },
    uoms: {
        icon: 'selectall',
        text: 'Unidades de Medida',
        position: 120
    },
    'uom-categories': {
        icon: 'tags',
        text: 'Categorías de Medida',
        position: 130
    },
    brands: {
        icon: 'bookmark',
        text: 'Marcas',
        position: 120
    },
    providers: {
        icon: 'group',
        text: 'Configuraciones',
        position: 70,
        parentSubText: 'Proveedores'
    },
    localization: {
        icon: 'globe',
        text: 'Localización',
        position: 5,
        hideMainSubRoute: true
    },
    countries: {
        icon: 'flag',
        text: 'Países',
        position: 10
    },
    states: {
        icon: 'map',
        text: 'Provincias',
        position: 20
    },
    cities: {
        icon: 'home',
        text: 'Ciudades',
        position: 30
    },
    currencies: {
        icon: 'money',
        text: 'Monedas',
        position: 40
    },
    taxcategories: {
        icon: 'localatm',
        text: 'Categorías de Impuesto',
        position: 50
    },
    paymentmethods: {
        icon: 'money',
        text: 'Métodos de Pago',
        position: 80
    },
    paymentterms: {
        icon: 'money',
        text: 'Términos de Pago',
        position: 85
    },
    metadata: {
        icon: 'fields',
        text: 'Metadatos',
        position: 12
    },
    keysmanager: {
        icon: 'key',
        text: 'Claves de Usuario',
        position: 142
    },
    refused: {
        icon: 'lock',
        text: 'Acceso Denegado',
        position: 998
    },
    delivery: {
        icon: 'car',
        text: 'Logística',
        position: 15,
        parentSubText: 'Ruta'
    },
    routes: {
        icon: 'map',
        text: 'Rutas',
        position: 1
    },
    zones: {
        icon: 'globe',
        text: 'Zonas',
        position: 2
    },
    vehicles: {
        icon: 'car',
        text: 'Vehículos',
        position: 3
    },
    documents: {
        icon: 'doc',
        text: 'Documentos',
        position: 225
    },
    'issuance-config': {
        icon: 'preferences',
        text: 'Reglas de Emisión',
        position: 230
    },
    pricelists: {
        icon: 'money',
        text: 'Comercial',
        position: 10,
        parentSubText: 'Listas de Precios'
    },
    pricelistdetail: {
        icon: 'money',
        text: 'Gestionar Listas de Precios',
        position: 15
    },
    audiences: {
        icon: 'tags',
        text: 'Agrupadores',
        position: 18
    },
    details: {
        icon: 'card',
        text: 'Detalle de Grupo',
        position: 19
    },
    listtypes: {
        icon: 'tags',
        text: 'Tipos de Listas',
        position: 20
    },
    pricepolicies: {
        icon: 'percent',
        text: 'Politicas de Precios',
        position: 30
    },
    saleorders: {
        icon: 'cart',
        text: 'Pedidos de Venta',
        position: 40
    },
    saleorderdetail: {
        icon: 'cart',
        text: 'Detalle del Pedido de Venta',
        position: 45
    },
    salesroutes: {
        icon: 'map',
        text: 'Rutas de Venta',
        position: 50
    },
    salebillingmodes: {
        icon: 'selectall',
        text: 'Modos de Venta',
        position: 70
    },
    'sales-channels': {
        icon: 'share',
        text: 'Canales de Venta',
        position: 75
    },
    'price-segments': {
        icon: 'hierarchy',
        text: 'Segmentos de Precio',
        position: 76
    },
    'serial-numbers': {
        icon: 'barcode',
        text: 'Números de Serie',
        position: 80
    },
    consignments: {
        icon: 'box',
        text: 'Consignaciones',
        position: 90
    },
    'inbound-receipts': {
        icon: 'product',
        text: 'Recepciones de Entrada',
        position: 72
    },
    packages: {
        icon: 'box',
        text: 'Bultos WMS',
        position: 5
    },
    'commercial-platforms': {
        icon: 'globe',
        text: 'Plataformas Comerciales',
        position: 20
    },
    system: {
        icon: 'preferences',
        text: 'Sistema',
        position: 140,
        parentSubText: 'Claves de Configuración'
    },
    audit: {
        icon: 'event',
        text: 'Auditoría',
        position: 145
    },
    mapa: {
        icon: 'map',
        text: 'Mapa',
        position: 150
    }
}

export function getCustomData(routeKey: string): ICustomDataRoute {
    const cleanKey = routeKey?.trim().toLowerCase();

    if (cleanKey && cleanKey in CustomDataRoutes) {
        return CustomDataRoutes[cleanKey as TRouteKey];
    }
    return CustomDataRoutes.default;
}

export const getRouteByPath = (routes: IAppRoute[], pathname: string) =>
    routes.find(r => pathname === r.path || pathname.startsWith(r.path + '/'));

export const getParentChain = (routes: IAppRoute[], route?: IAppRoute) => {
    const chain: string[] = [];
    let current = route;

    while (current?.parentId) {
        chain.push(current.parentId);
        current = routes.find(r => r.id === current!.parentId);
    }

    return chain;
};


export const IGNORED_ROUTE_KEYS = ['login', 'refused', 'api', '_not-found', 'home', '[id]'];
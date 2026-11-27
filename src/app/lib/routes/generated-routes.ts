export const ROUTES = [
  {
    "id": "(account)/activate",
    "parentId": "(account)",
    "path": "/activate",
    "routeKey": "activate"
  },
  {
    "id": "accounting",
    "path": "/accounting",
    "routeKey": "accounting"
  },
  {
    "id": "accounting/cashRegisters",
    "parentId": "accounting",
    "path": "/accounting/cashRegisters",
    "routeKey": "cashregisters"
  },
  {
    "id": "accounting/documents",
    "parentId": "accounting",
    "path": "/accounting/documents",
    "routeKey": "documents"
  },
  {
    "id": "accounting/issuance-config",
    "parentId": "accounting",
    "path": "/accounting/issuance-config",
    "routeKey": "issuance-config"
  },
  {
    "id": "accounting/periods",
    "parentId": "accounting",
    "path": "/accounting/periods",
    "routeKey": "periods"
  },
  {
    "id": "accounting/taxes",
    "parentId": "accounting",
    "path": "/accounting/taxes",
    "routeKey": "taxes"
  },
  {
    "id": "audiences",
    "path": "/audiences",
    "routeKey": "audiences"
  },
  {
    "id": "customers",
    "path": "/customers",
    "routeKey": "customers"
  },
  {
    "id": "delivery",
    "path": "/delivery",
    "routeKey": "delivery"
  },
  {
    "id": "delivery/vehicles",
    "parentId": "delivery",
    "path": "/delivery/vehicles",
    "routeKey": "vehicles"
  },
  {
    "id": "delivery/zones",
    "parentId": "delivery",
    "path": "/delivery/zones",
    "routeKey": "zones"
  },
  {
    "id": "localization",
    "path": "/localization",
    "routeKey": "localization"
  },
  {
    "id": "localization/cities",
    "parentId": "localization",
    "path": "/localization/cities",
    "routeKey": "cities"
  },
  {
    "id": "localization/countries",
    "parentId": "localization",
    "path": "/localization/countries",
    "routeKey": "countries"
  },
  {
    "id": "localization/currencies",
    "parentId": "localization",
    "path": "/localization/currencies",
    "routeKey": "currencies"
  },
  {
    "id": "localization/states",
    "parentId": "localization",
    "path": "/localization/states",
    "routeKey": "states"
  },
  {
    "id": "localization/taxCategories",
    "parentId": "localization",
    "path": "/localization/taxCategories",
    "routeKey": "taxcategories"
  },
  {
    "id": "mapa",
    "path": "/mapa",
    "routeKey": "mapa"
  },
  {
    "id": "priceLists",
    "path": "/priceLists",
    "routeKey": "pricelists"
  },
  {
    "id": "priceLists/commercial-platforms",
    "parentId": "priceLists",
    "path": "/priceLists/commercial-platforms",
    "routeKey": "commercial-platforms"
  },
  {
    "id": "priceLists/listTypes",
    "parentId": "priceLists",
    "path": "/priceLists/listTypes",
    "routeKey": "listtypes"
  },
  {
    "id": "priceLists/paymentMethods",
    "parentId": "priceLists",
    "path": "/priceLists/paymentMethods",
    "routeKey": "paymentmethods"
  },
  {
    "id": "priceLists/paymentTerms",
    "parentId": "priceLists",
    "path": "/priceLists/paymentTerms",
    "routeKey": "paymentterms"
  },
  {
    "id": "priceLists/priceListDetail",
    "parentId": "priceLists",
    "path": "/priceLists/priceListDetail",
    "routeKey": "pricelistdetail"
  },
  {
    "id": "priceLists/pricePolicies",
    "parentId": "priceLists",
    "path": "/priceLists/pricePolicies",
    "routeKey": "pricepolicies"
  },
  {
    "id": "priceLists/saleOrderDetail",
    "parentId": "priceLists",
    "path": "/priceLists/saleOrderDetail",
    "routeKey": "saleorderdetail"
  },
  {
    "id": "priceLists/saleOrders",
    "parentId": "priceLists",
    "path": "/priceLists/saleOrders",
    "routeKey": "saleorders"
  },
  {
    "id": "priceLists/sales-channels",
    "parentId": "priceLists",
    "path": "/priceLists/sales-channels",
    "routeKey": "sales-channels"
  },
  {
    "id": "priceLists/salesRoutes",
    "parentId": "priceLists",
    "path": "/priceLists/salesRoutes",
    "routeKey": "salesroutes"
  },
  {
    "id": "products",
    "path": "/products",
    "routeKey": "products"
  },
  {
    "id": "products/brands",
    "parentId": "products",
    "path": "/products/brands",
    "routeKey": "brands"
  },
  {
    "id": "products/categories",
    "parentId": "products",
    "path": "/products/categories",
    "routeKey": "categories"
  },
  {
    "id": "products/combos",
    "parentId": "products",
    "path": "/products/combos",
    "routeKey": "combos"
  },
  {
    "id": "products/productDetail",
    "parentId": "products",
    "path": "/products/productDetail",
    "routeKey": "productdetail"
  },
  {
    "id": "products/saleBillingModes",
    "parentId": "products",
    "path": "/products/saleBillingModes",
    "routeKey": "salebillingmodes"
  },
  {
    "id": "products/uom-categories",
    "parentId": "products",
    "path": "/products/uom-categories",
    "routeKey": "uom-categories"
  },
  {
    "id": "products/uoms",
    "parentId": "products",
    "path": "/products/uoms",
    "routeKey": "uoms"
  },
  {
    "id": "productsv2",
    "path": "/productsv2",
    "routeKey": "productsv2"
  },
  {
    "id": "providers",
    "path": "/providers",
    "routeKey": "providers"
  },
  {
    "id": "providers/articleHandling",
    "parentId": "providers",
    "path": "/providers/articleHandling",
    "routeKey": "articlehandling"
  },
  {
    "id": "providers/inbound-receipts",
    "parentId": "providers",
    "path": "/providers/inbound-receipts",
    "routeKey": "inbound-receipts"
  },
  {
    "id": "providers/metadata",
    "parentId": "providers",
    "path": "/providers/metadata",
    "routeKey": "metadata"
  },
  {
    "id": "stock",
    "path": "/stock",
    "routeKey": "stock"
  },
  {
    "id": "stock/consignments",
    "parentId": "stock",
    "path": "/stock/consignments",
    "routeKey": "consignments"
  },
  {
    "id": "stock/serial-numbers",
    "parentId": "stock",
    "path": "/stock/serial-numbers",
    "routeKey": "serial-numbers"
  },
  {
    "id": "structure",
    "path": "/structure",
    "routeKey": "structure"
  },
  {
    "id": "structure/branches",
    "parentId": "structure",
    "path": "/structure/branches",
    "routeKey": "branches"
  },
  {
    "id": "structure/establishments",
    "parentId": "structure",
    "path": "/structure/establishments",
    "routeKey": "establishments"
  },
  {
    "id": "structure/logisticCenters",
    "parentId": "structure",
    "path": "/structure/logisticCenters",
    "routeKey": "logisticcenters"
  },
  {
    "id": "sysAdmin",
    "path": "/sysAdmin",
    "routeKey": "sysadmin"
  },
  {
    "id": "sysAdmin/companies",
    "parentId": "sysAdmin",
    "path": "/sysAdmin/companies",
    "routeKey": "companies"
  },
  {
    "id": "sysAdmin/firebird",
    "parentId": "sysAdmin",
    "path": "/sysAdmin/firebird",
    "routeKey": "firebird"
  },
  {
    "id": "sysAdmin/licenses",
    "parentId": "sysAdmin",
    "path": "/sysAdmin/licenses",
    "routeKey": "licenses"
  },
  {
    "id": "system",
    "path": "/system",
    "routeKey": "system"
  },
  {
    "id": "system/audit",
    "parentId": "system",
    "path": "/system/audit",
    "routeKey": "audit"
  },
  {
    "id": "system/keysManager",
    "parentId": "system",
    "path": "/system/keysManager",
    "routeKey": "keysmanager"
  },
  {
    "id": "users",
    "path": "/users",
    "routeKey": "users"
  },
  {
    "id": "users/by-role",
    "parentId": "users",
    "path": "/users/by-role",
    "routeKey": "by-role"
  },
  {
    "id": "users/groups",
    "parentId": "users",
    "path": "/users/groups",
    "routeKey": "groups"
  },
  {
    "id": "users/me",
    "parentId": "users",
    "path": "/users/me",
    "routeKey": "me"
  },
  {
    "id": "warehouses",
    "path": "/warehouses",
    "routeKey": "warehouses"
  },
  {
    "id": "warehouses/packages",
    "parentId": "warehouses",
    "path": "/warehouses/packages",
    "routeKey": "packages"
  }
];
export const FIRST_LEVEL_ROUTES = [
  {
    "id": "accounting",
    "path": "/accounting",
    "routeKey": "accounting"
  },
  {
    "id": "audiences",
    "path": "/audiences",
    "routeKey": "audiences"
  },
  {
    "id": "customers",
    "path": "/customers",
    "routeKey": "customers"
  },
  {
    "id": "delivery",
    "path": "/delivery",
    "routeKey": "delivery"
  },
  {
    "id": "localization",
    "path": "/localization",
    "routeKey": "localization"
  },
  {
    "id": "mapa",
    "path": "/mapa",
    "routeKey": "mapa"
  },
  {
    "id": "priceLists",
    "path": "/priceLists",
    "routeKey": "pricelists"
  },
  {
    "id": "products",
    "path": "/products",
    "routeKey": "products"
  },
  {
    "id": "productsv2",
    "path": "/productsv2",
    "routeKey": "productsv2"
  },
  {
    "id": "providers",
    "path": "/providers",
    "routeKey": "providers"
  },
  {
    "id": "stock",
    "path": "/stock",
    "routeKey": "stock"
  },
  {
    "id": "structure",
    "path": "/structure",
    "routeKey": "structure"
  },
  {
    "id": "sysAdmin",
    "path": "/sysAdmin",
    "routeKey": "sysadmin"
  },
  {
    "id": "system",
    "path": "/system",
    "routeKey": "system"
  },
  {
    "id": "users",
    "path": "/users",
    "routeKey": "users"
  },
  {
    "id": "warehouses",
    "path": "/warehouses",
    "routeKey": "warehouses"
  }
];

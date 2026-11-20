import { TFProductModuleCode, TFQuotaCode } from "@repo/api-contracts/erp";

export const PRODUCT_MODULES: { id: TFProductModuleCode; name: string }[] = [
    { id: "core", name: "Core" },
    { id: "catalog", name: "Catálogo" },
    { id: "commercial", name: "Comercial" },
    { id: "procurement", name: "Compras" },
    { id: "logistics", name: "Logística" },
    { id: "wms", name: "WMS" },
    { id: "accounting", name: "Contabilidad" },
    { id: "treasury", name: "Tesorería" },
    { id: "billing", name: "Facturación" },
    { id: "maps", name: "Mapas" },
    { id: "legacy", name: "Legacy" },
];

export const QUOTA_CODES: { id: TFQuotaCode; name: string }[] = [
    { id: "logistics_centers", name: "Centros logísticos" },
    { id: "cashiers", name: "Cajeros" },
    { id: "salespeople", name: "Vendedores" },
];

export const FIREBIRD_CHARSETS = [
    { id: "WIN1252", name: "WIN1252" },
    { id: "UTF8", name: "UTF8" },
    { id: "NONE", name: "NONE" },
];

export const LICENSE_STATUS_LABELS: Record<string, string> = {
    active: "Activa",
    superseded: "Reemplazada",
    expired: "Vencida",
    revoked: "Revocada",
};

export const LICENSE_WARNING_LABELS: Record<string, string> = {
    not_yet_valid: "Aún no vigente",
    expiring_soon: "Por vencer",
    in_grace: "En gracia",
    grace_ended: "Gracia finalizada",
};

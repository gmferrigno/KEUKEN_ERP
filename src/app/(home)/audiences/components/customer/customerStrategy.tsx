import React from "react";
import { IClusterStrategy } from "../strategy/types";
import { customerClustersService } from "@repo/erp-services/audiences/customerClusters.service";
import { customersService } from "@repo/erp-services/partners/customers.service";
import { clusterRulesService } from "@repo/erp-services/audiences/clusterRules.service";
import { CustomerRuleEditor } from "./customerRuleEditor";
import { IFCustomerCluster } from "@repo/api-contracts/erp";
import { IFCustomerRuleSet } from "@repo/api-contracts/erp";
import { CUSTOMERS_ORGIN_LABELS } from "@/app/lib/constants/audiences.constants";

export const customerStrategy: IClusterStrategy<IFCustomerCluster, any, IFCustomerRuleSet> = {
    entityType: 'customer',

    entityLabel: {
        singular: 'cliente',
        plural: 'clientes',
    },
    clusterEntityLabel: 'Clúster de Clientes',
    managerTitle: 'Agrupar Clientes en un Clúster',
    managerSubtitle: 'Selecciona un clúster de clientes existente o crea uno nuevo para incorporar los registros seleccionados.',
    addMembersTitle: 'Añadir Clientes al Clúster',
    addMembersSearchPlaceholder: 'Buscar clientes...',
    addMembersGridId: 'add-customer-cluster-members-grid',
    rulesTitle: 'Reglas Dinámicas de Clientes',
    rulesSubtitle: 'Define condiciones basadas en atributos comerciales, compras históricas o pertenencia a otros clústeres.',
    membersExportFileName: 'Miembros_Clientes',
    emptySelectDescription: 'Seleccione un clúster de clientes en el desplegable superior para ver y gestionar sus miembros.',

    getById: (id, token, companyId) => customerClustersService.getById(id, token, companyId),
    update: (id, data, token, companyId) => customerClustersService.update(id, data, token, companyId),
    delete: (id, token, companyId) => customerClustersService.delete(id, token, companyId),
    getAllClusters: async (token, companyId) => {
        const res = await customerClustersService.getAll(200, 0, token, companyId, true);
        return res.items || [];
    },
    getClusterOptions: async (token, companyId) => {
        const res = await customerClustersService.getAll(200, 0, token, companyId);
        return (res.items || []).map(c => ({
            id: c.id,
            name: c.name,
            code: c.code,
            kind: c.kind,
            memberCount: c.memberCount,
            excludedCount: c.excludedCount,
        }));
    },
    createAndAddMembers: async (data, memberIds, token, companyId) => {
        if (!companyId) throw new Error("Debe seleccionar una compañía activa");
        const newCluster = await customerClustersService.create({
            code: data.code,
            name: data.name,
            description: data.description || null,
            kind: (data.kind as any) || 'static',
            ruleSet: data.ruleSet || null,
            refreshMode: 'manual',
            companyId,
        }, token, companyId);

        if (memberIds && memberIds.length > 0) {
            return await customerClustersService.addMembers(newCluster.id, memberIds, token, companyId);
        }
        return { detail: "Clúster de clientes creado exitosamente" };
    },

    membersKeyExpr: 'customerId',
    membersColumns: [
        {
            dataField: 'customerId',
            caption: 'ID Cliente',
            visible: false,
        },
        {
            dataField: 'customerRef',
            caption: 'Código / Ref',
            width: 130,
        },
        {
            dataField: 'customerName',
            caption: 'Nombre del Cliente',
        },
        {
            dataField: 'source',
            caption: 'Origen',
            width: 150,
            customizeText: (cellInfo: any) => CUSTOMERS_ORGIN_LABELS[cellInfo.value] || cellInfo.value || '',
        },
        {
            dataField: 'includedAt',
            caption: 'Fecha de Inclusión',
            dataType: 'datetime',
            format: 'dd/MM/yyyy HH:mm',
            width: 180,
        }
    ],
    getMembers: (clusterId, limit, offset, token, companyId, excluded) =>
        customerClustersService.getMembers(clusterId, limit, offset, token, companyId, excluded),
    removeMember: (clusterId, memberId, token, companyId) =>
        customerClustersService.removeMember(clusterId, memberId, token, companyId),
    removeMembers: (clusterId, memberIds, token, companyId) =>
        customerClustersService.removeMembers(clusterId, memberIds, token, companyId),

    addMembersColumns: [
        {
            dataField: 'id',
            caption: 'ID',
            visible: false,
        },
        {
            dataField: 'code',
            caption: 'Código / Ref',
            width: 130,
        },
        {
            dataField: 'name',
            caption: 'Nombre del Cliente',
        },
        {
            dataField: 'taxId',
            caption: 'ID Fiscal (CUIT/RUT)',
            width: 160,
        },
        {
            dataField: 'email',
            caption: 'Email',
            width: 200,
        },
    ],
    loadAvailableMembers: async (limit, offset, token, companyId) => {
        const response = await customersService.getAll(token, limit, offset, companyId);
        return {
            data: response.items || [],
            totalCount: response.metadata?.totalItems ?? 0,
        };
    },
    addMembers: (clusterId, memberIds, token, companyId) =>
        customerClustersService.addMembers(clusterId, memberIds, token, companyId),

    supportsExclusion: true,
    excludeMember: (clusterId, memberId, token, companyId) =>
        customerClustersService.excludeMember(clusterId, memberId, token, companyId),
    includeMember: (clusterId, memberId, token, companyId) =>
        customerClustersService.includeMember(clusterId, memberId, token, companyId),


    supportsRules: true,
    supportsPreview: true,
    supportsSummary: true,
    RuleEditorComponent: CustomerRuleEditor,
    getDefaultRuleSet: (): IFCustomerRuleSet => ({
        version: 1,
        combinator: "and",
        predicates: [
            {
                type: "purchase_exists",
                op: "any",
                window: { lastDays: 90 },
                scope: {},
            }
        ],
        universe: {
            activeOnly: true,
        }
    }),
    validateRuleSet: (ruleSet: IFCustomerRuleSet) => {
        if (!ruleSet || !ruleSet.predicates || ruleSet.predicates.length === 0) {
            return {
                isValid: false,
                errorMessage: "El clúster dinámico/híbrido requiere al menos una regla o condición.",
            };
        }
        for (const p of ruleSet.predicates) {
            if (p.type === "customer_attr") {
                if (!p.field) return { isValid: false, errorMessage: "Debe indicar el campo en la condición de atributo" };
                if (p.value === undefined || p.value === "") return { isValid: false, errorMessage: "Debe especificar un valor para la condición de atributo" };
            }
            if (p.type === "purchase_agg") {
                if (p.value === undefined || isNaN(p.value)) return { isValid: false, errorMessage: "Debe especificar un valor numérico para la condición de compras" };
            }
            if (p.type === "in_cluster" || p.type === "not_in_cluster") {
                if (!p.clusterId) return { isValid: false, errorMessage: "Debe seleccionar el clúster relacionado" };
            }
            if (p.type === "purchase_exists" || p.type === "purchase_agg" || p.type === "purchase_compare_period") {
                if (!p.scope || (!p.scope.itemClusterId && !p.scope.productCategoryId && !p.scope.productId && !p.scope.itemId && (!p.scope.itemIds || p.scope.itemIds.length === 0))) {
                    return { isValid: false, errorMessage: "Debe seleccionar un filtro (clúster, categoría o ítem) en la condición de compra." };
                }
            }
        }
        return { isValid: true };
    },

    refreshCluster: (clusterId, token, companyId) =>
        clusterRulesService.refreshCustomerCluster(clusterId, companyId, token),
    getSummary: (clusterId, lookbackDays, companyId, token) =>
        clusterRulesService.getCustomerClusterSummary(clusterId, lookbackDays, companyId, token),
};

export default customerStrategy;

import React from "react";
import { IClusterStrategy } from "../strategy/types";
import { itemClustersService } from "@repo/erp-services/audiences/itemClusters.service";
import { itemsService } from "@repo/erp-services/product_services/items.service";
import { clusterRulesService } from "@repo/erp-services/audiences/clusterRules.service";
import { ItemRuleEditor } from "./itemRuleEditor";
import { IFItemCluster } from "@repo/api-contracts/erp";
import { IFItemRuleSet } from "@repo/api-contracts/erp";
import { ITEMS_ORGIN_LABELS } from "@/app/lib/constants/audiences.constants";

export const itemStrategy: IClusterStrategy<IFItemCluster, any, IFItemRuleSet> = {
    entityType: 'item',

    entityLabel: {
        singular: 'ítem',
        plural: 'ítems',
    },
    clusterEntityLabel: 'Clúster de Ítems',
    managerTitle: 'Agrupar Ítems en un Clúster',
    managerSubtitle: 'Selecciona un clúster de ítems existente o crea uno nuevo para incorporar los registros seleccionados.',
    addMembersTitle: 'Añadir Ítems al Clúster',
    addMembersSearchPlaceholder: 'Buscar ítems...',
    addMembersGridId: 'add-item-cluster-members-grid',
    rulesTitle: 'Reglas de Expansión de Ítems',
    rulesSubtitle: 'Define la expansión del clúster según categorías o relaciones de ítems.',
    membersExportFileName: 'Miembros_Items',
    emptySelectDescription: 'Seleccione un clúster de ítems en el desplegable superior para ver y gestionar sus miembros.',

    getById: (id, token, companyId) => itemClustersService.getById(id, token, companyId),
    update: (id, data, token, companyId) => itemClustersService.update(id, data, token, companyId),
    delete: (id, token, companyId) => itemClustersService.delete(id, token, companyId),
    getAllClusters: async (token, companyId) => {
        const res = await itemClustersService.getAll(200, 0, token, companyId, true);
        return res.items || [];
    },
    getClusterOptions: async (token, companyId) => {
        const res = await itemClustersService.getAll(200, 0, token, companyId);
        return (res.items || []).map(i => ({
            id: i.id,
            name: i.name,
            code: i.code,
            kind: i.kind,
            memberCount: i.memberCount,
            excludedCount: i.excludedCount,
        }));
    },
    createAndAddMembers: async (data, memberIds, token, companyId) => {
        if (!companyId) throw new Error("Debe seleccionar una compañía activa");
        const newCluster = await itemClustersService.create({
            code: data.code,
            name: data.name,
            description: data.description || null,
            kind: (data.kind as any) || 'static',
            ruleSet: data.ruleSet || null,
            refreshMode: 'manual',
            companyId,
        }, token, companyId);

        if (memberIds && memberIds.length > 0) {
            return await itemClustersService.addMembers(newCluster.id, memberIds, token, companyId);
        }
        return { detail: "Clúster de ítems creado exitosamente" };
    },

    membersKeyExpr: 'itemId',
    membersColumns: [
        {
            dataField: 'itemId',
            caption: 'ID Ítem',
            visible: false,
        },
        {
            dataField: 'itemRef',
            caption: 'SKU / Ref',
            width: 130,
        },
        {
            dataField: 'itemName',
            caption: 'Nombre del Ítem',
        },
        {
            dataField: 'source',
            caption: 'Origen',
            width: 150,
            customizeText: (cellInfo: any) => ITEMS_ORGIN_LABELS[cellInfo.value] || cellInfo.value || '',
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
        itemClustersService.getMembers(clusterId, limit, offset, token, companyId, excluded),
    removeMember: (clusterId, memberId, token, companyId) =>
        itemClustersService.removeMember(clusterId, memberId, token, companyId),
    removeMembers: (clusterId, memberIds, token, companyId) =>
        itemClustersService.removeMembers(clusterId, memberIds, token, companyId),

    addMembersColumns: [
        {
            dataField: 'id',
            caption: 'ID',
            visible: false,
        },
        {
            dataField: 'sku',
            caption: 'SKU / Ref',
            width: 140,
        },
        {
            dataField: 'itemName',
            caption: 'Nombre de Ítem',
        },
        {
            dataField: 'productName',
            caption: 'Producto',
            width: 200,
        },
    ],
    loadAvailableMembers: async (limit, offset, token, companyId) => {
        const response = await itemsService.getAll(companyId, { limit, offset }, token, false);
        return {
            data: response.items || [],
            totalCount: response.metadata?.totalItems ?? 0,
        };
    },
    addMembers: (clusterId, memberIds, token, companyId) =>
        itemClustersService.addMembers(clusterId, memberIds, token, companyId),

    supportsExclusion: true,
    excludeMember: (clusterId, memberId, token, companyId) =>
        itemClustersService.excludeMember(clusterId, memberId, token, companyId),
    includeMember: (clusterId, memberId, token, companyId) =>
        itemClustersService.includeMember(clusterId, memberId, token, companyId),

    supportsRules: true,
    supportsPreview: false,
    supportsSummary: false,
    RuleEditorComponent: ItemRuleEditor,
    getDefaultRuleSet: (): IFItemRuleSet => ({
        scope: {},
    }),
    validateRuleSet: (ruleSet: IFItemRuleSet) => {
        if (!ruleSet || !ruleSet.scope) {
            return { isValid: false, errorMessage: "Debe definir el scope de expansión para el clúster de ítems." };
        }
        const hasScope = Boolean(
            ruleSet.scope.productCategoryId ||
            ruleSet.scope.productId ||
            ruleSet.scope.itemId ||
            (ruleSet.scope.itemIds && ruleSet.scope.itemIds.length > 0) ||
            ruleSet.scope.itemClusterId
        );
        if (!hasScope) {
            return { isValid: false, errorMessage: "Debe seleccionar una categoría, producto o clúster base." };
        }
        return { isValid: true };
    },

    refreshCluster: (clusterId, token, companyId) =>
        clusterRulesService.refreshItemCluster(clusterId, companyId, token),
};

export default itemStrategy;

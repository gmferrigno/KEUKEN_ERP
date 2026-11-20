'use client';

import { useRecovery } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";

import { canDo } from "@repo/access";
import { pricePoliciesService } from "@repo/erp-services/priceLists/pricePolicies.service";
import { salesChannelsService } from "@repo/erp-services/salesChannels.service";
import { IFSalesChannel } from "@repo/api-contracts/erp";
import { commercialPlatformsService } from "@repo/erp-services/partners/commercialPlatforms.service";
import { IFCommercialPlatform } from "@repo/api-contracts/erp";
import { PRICELIST_OPERATION_LABELS, PRICELIST_OPERATION_OPTIONS } from "@/app/lib/constants/priceList.constants";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'pricepolicies-grid' });

const PricePoliciesClient = () => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [salesChannels, setSalesChannels] = useState<IFSalesChannel[]>([]);
    const [commercialPlatforms, setCommercialPlatforms] = useState<IFCommercialPlatform[]>([]);

    useEffect(() => {
        const loadSalesChannels = async () => {
            if (!token) return;
            try {
                const response = await salesChannelsService.getAll(token, 500, 0);
                setSalesChannels(response.items);
            } catch (error) {
                console.error("Error loading sales channels for lookup:", error);
            }
        };
        loadSalesChannels();
    }, [token]);

    useEffect(() => {
        const loadCommercialPlatforms = async () => {
            if (!token) return;
            try {
                const response = await commercialPlatformsService.getAll({
                    limit: 500,
                    offset: 0,
                    companyId: currentCompany?.id || undefined
                }, token);
                setCommercialPlatforms(response.items);
            } catch (error) {
                console.error("Error loading commercial platforms for lookup:", error);
            }
        };
        loadCommercialPlatforms();
    }, [token, currentCompany?.id]);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                if (!currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const response = await pricePoliciesService.getAll(
                        token,
                        currentCompany.id,
                        take,
                        skip
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading price policies:', error);
                    const errorMessage = error instanceof Error && error.message 
                        ? error.message 
                        : 'Error al cargar las políticas de precios';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: 'id',
            caption: 'ID',
            allowEditing: false,
            visible: false,
        },
        {
            dataField: 'pricelistName',
            caption: 'Nombre de lista',
            allowEditing: false,
        },
        {
            dataField: 'code',
            caption: 'Código',
            allowEditing: false,
        },
        {
            dataField: 'pricelistId',
            caption: 'ID Lista de Precios',
            allowEditing: false,
            visible: false,
        },
        {
            dataField: 'salesChannelId',
            caption: 'Canal de Ventas',
            allowEditing: false,
            calculateDisplayValue: (rowData: any) => {
                const channel = salesChannels.find(c => c.id === rowData.salesChannelId);
                return channel ? channel.name : 'Sin canal';
            },
            lookup: {
                dataSource: salesChannels,
                valueExpr: 'id',
                displayExpr: 'name'
            }
        },
        {
            dataField: 'pricelistOperation',
            caption: 'Operación',
            allowEditing: false,
            calculateDisplayValue: (rowData: any) => {
                return PRICELIST_OPERATION_LABELS[rowData.pricelistOperation] || rowData.pricelistOperation || 'No posee';
            },
            lookup: {
                dataSource: PRICELIST_OPERATION_OPTIONS,
                valueExpr: 'id',
                displayExpr: 'name'
            }
        },
        {
            dataField: 'commercialPlatformId',
            caption: 'Plataforma',
            allowEditing: false,
            calculateDisplayValue: (rowData: any) => {
                if (!rowData.commercialPlatformId) return 'No posee';
                const platform = commercialPlatforms.find(p => p.id === rowData.commercialPlatformId);
                return platform ? platform.name : 'No posee';
            },
            lookup: {
                dataSource: commercialPlatforms,
                valueExpr: 'id',
                displayExpr: 'name'
            }
        },
        {
            dataField: 'active',
            caption: 'Activo',
            allowEditing: false,
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        }
    ], [salesChannels, commercialPlatforms]);

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose text-[200px]! text-focus-500/20!" />
                <p className="text-2xl font-bold text-main/60">No tienes permiso para acceder a esta página</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                        ref={gridRef}
                        gridId="pricepolicies-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={{ paging: true, filtering: false, sorting: false }}
                        columns={columns}
                        columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={{ enabled: true, pageSize: 50, pageSizes: [20, 50, 100] }}
                        sorting={{ mode: 'multiple' }}
                        filterRow={true}
                        headerFilter={true}
                        filterPanel={true}
                        grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                        groupPanel={true}
                        searchPanel={{
                            visible: true,
                            width: 350,
                            placeholder: 'Buscar políticas...',
                            highlightSearchText: true
                        }}
                        noDataText="No se encontraron políticas de precios"
                        selection={{ mode: 'none' }}
                        editing={{
                            mode: 'cell',
                            allowAdding: false,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                        }}
                        export={{
                            enabled: true,
                            fileName: 'PoliticasDePrecios',
                            allowExportSelectedData: true,
                            formats: ['xlsx']
                        }}
                        columnChooser={true}
                        columnFixing={true}
                        summary={{
                            totalItems: [
                                {
                                    column: 'id',
                                    summaryType: 'count',
                                    displayFormat: 'Total: {0} políticas'
                                },
                            ],
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'pricepolicies-grid',
                            savingTimeout: 1000,
                            customLoad,
                            customSave,
                        }}
                        scrolling={{ mode: 'standard' }}
                    />
                </div>
            </div>
        </div>
    );
};

export default PricePoliciesClient;

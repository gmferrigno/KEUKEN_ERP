'use client';

import { stockService } from "@repo/erp-services/stock.service";
import { IFStockByLotsParams } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { formatQualityState } from "@/lib/utils/formatter.helper";
import CustomStore from "devextreme/data/custom_store";
import { useMemo, useRef } from "react";


const StockByAllList = () => {
    const gridRef = useRef<any>(null);
    const expiringBeforeRef = useRef<Date | null>(null);

    const { customLoad, customSave } = createGridStateStorage({ gridId: 'stock-all' });

    const { token, currentCompany } = useAuth();

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'virtualId',
            load: async (loadOptions: any) => {
                const searchParams: IFStockByLotsParams = {
                    limit: loadOptions.take || 20,
                    offset: loadOptions.skip || 0,
                    expiringBefore: expiringBeforeRef.current?.toISOString()
                };

                try {
                    const response = await stockService.getAll(searchParams, token, currentCompany?.id);
                    const itemsWithId = response.items.map((item: any) => ({
                        ...item,
                        virtualId: item.id
                    }));

                    return {
                        data: itemsWithId,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error) {
                    console.error("Error loading stock:", error);
                    throw "Error al cargar datos";
                }
            }
        });
    }, [token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: "itemSku",
            caption: "SKU",
            defaultWidth: 150,
            minWidth: 50,
            alignment: "left",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `<span class="px-1.5 py-0 bg-primary-950/40 text-[11px] text-main rounded-full font-mono uppercase">${escapeHtmlValue(options.value)}</span>`;
            }
        },
        {
            dataField: "productName",
            caption: "Producto",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            minWidth: 250,
        },
        {
            dataField: "warehouseName",
            caption: "Almacén",
            defaultWidth: 180,
            minWidth: 50,
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <div class="flex items-center gap-1.5 text-[11px] leading-tight opacity-90">
                        <i class="dx-icon-home text-[12px] text-focus-400"></i>
                        <span class="uppercase tracking-tight">${escapeHtmlValue(options.value ?? '-')}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "locationPath",
            caption: "Ubicación",
            defaultWidth: 220,
            minWidth: 50,
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                const path = escapeHtmlValue(options.value || 'N/A');
                container.innerHTML = `
                    <div class="flex items-center gap-1.5 text-[11px] leading-tight">
                        <i class="dx-icon-folder text-[12px] text-focus-400/60"></i>
                        <span class="font-medium">${path}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "batchName",
            caption: "Lote",
            defaultWidth: 140,
            minWidth: 50,
            alignment: "center",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                const batch = escapeHtmlValue(options.value || 'Sin asignar');
                const opacity = options.value ? 'opacity-100' : 'opacity-30 italic';
                container.innerHTML = `
                    <span class="inline-flex items-center justify-center px-1.5 py-[1px] bg-main/5 rounded border border-main/20 text-[11px] leading-none ${opacity}">
                        ${batch}
                    </span>
                `;
            }
        },
        {
            dataField: "quantity",
            caption: "Stock Físico",
            defaultWidth: 140,
            minWidth: 50,
            alignment: "left",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <span class="text-[12px] font-medium">${escapeHtmlValue(options.value ?? 0)} <span class="text-[10px] opacity-40 font-normal ml-0.5">${escapeHtmlValue(options.data.uomName ?? '-')}</span></span>
                `;
            }
        },
        {
            dataField: "available",
            caption: "Disponible",
            defaultWidth: 140,
            minWidth: 50,
            alignment: "left",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <span class="text-[12px] font-medium">${escapeHtmlValue(options.value ?? 0)} <span class="text-[10px] opacity-40 font-normal ml-0.5">${escapeHtmlValue(options.data.uomName ?? '-')}</span></span>
                `;
            }
        },
        {
            dataField: "qualityState",
            caption: "Calidad",
            defaultWidth: 130,
            minWidth: 50,
            alignment: "center",
            allowSorting: true,
            allowFiltering: true,
            allowHeaderFiltering: true,
            lookup: {
                dataSource: [
                    { value: 'good', text: 'Bueno' },
                    { value: 'quarantine', text: 'Cuarentena' },
                    { value: 'scrap', text: 'Scrap' }
                ],
                valueExpr: 'value',
                displayExpr: 'text'
            },
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <span class="text-[12px] text-focus-100 font-medium">${escapeHtmlValue(formatQualityState(options.value))}</span>
                `;
            }
        }
    ], []);

    return (
        <div className="w-full h-full relative flex flex-col min-h-0">
            <GenericDataGrid
                ref={gridRef}
                dataSource={dataSource}
                columns={columns}
                gridId="stock"
                remoteOperations={{
                    filtering: true,
                    paging: true,
                    sorting: true
                }}
                className="custom-grid-styles"
                keyExpr="virtualId"
                allowColumnResizing={true}
                columnResizingMode="nextColumn"
                sorting={{ mode: 'multiple' }}
                columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                width="100%"
                columnAutoWidth={false}
                showBorders={true}
                filterRow={true}
                headerFilter={true}
                filterPanel={true}
                stateStoring={{
                    enabled: true,
                    customLoad: customLoad,
                    customSave: customSave,
                }}
                searchPanel={{
                    visible: false,
                    width: 240,
                    placeholder: "Buscar stock...",
                    highlightSearchText: true
                }}
                columnChooser={true}
                paging={{
                    enabled: true,
                    pageSize: 20,
                    pageSizes: [10, 20, 50, 100]
                }}
                export={{
                    enabled: true,
                    fileName: 'Stock',
                    allowExportSelectedData: true,
                    formats: ['xlsx']
                }}
                showDefaultToolbarItems={true}
                toolbarItems={[
                    { name: 'exportButton', location: 'after' },
                    { name: 'columnChooserButton', location: 'after' },
                    { name: 'searchPanel', location: 'after' },
                ]}
            >
            </GenericDataGrid>
        </div>
    );
};

export default StockByAllList;

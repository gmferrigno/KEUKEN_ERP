'use client';

import { stockService } from "@repo/erp-services/stock.service";
import { IFStockSummaryParams } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { useMemo, useRef, useState } from "react";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'stock-sum-resume' });

const StockSumResume = () => {
    const gridRef = useRef<any>(null);
    const { token, currentCompany } = useAuth();
    const [level, setLevel] = useState<"warehouse" | "company">("warehouse");

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'virtualId',
            load: async (loadOptions: any) => {
                const searchParams: IFStockSummaryParams = {
                    level,
                    groupBy: "item",
                    expiringDays: 30,
                    limit: loadOptions.take || 20,
                    offset: loadOptions.skip || 0,
                };

                try {
                    const response = await stockService.getStockSummary(searchParams, token, currentCompany?.id);
                    const itemsWithId = response.items.map((item: any, index: number) => ({
                        ...item,
                        virtualId: `${item.companyId || ''}-${item.warehouseId || ''}-${item.itemId || ''}-${index}`
                    }));

                    return {
                        data: itemsWithId,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error) {
                    console.error("Error loading stock summary resume:", error);
                    throw "Error al cargar datos";
                }
            }
        });
    }, [token, currentCompany?.id, level]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const baseCols: IGenericDataGridColumn[] = [
            {
                dataField: "companyName",
                caption: "Compañía",
                defaultWidth: 180,
                minWidth: 100,
                allowSorting: true,
                allowFiltering: true,
                allowHeaderFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `
                        <div class="flex items-center gap-1.5 text-[11px] leading-tight opacity-90">
                            <i class="dx-icon-building text-[12px] text-focus-400"></i>
                            <span class="uppercase tracking-tight font-medium">${escapeHtmlValue(options.value ?? '-')}</span>
                        </div>
                    `;
                }
            }
        ];

        if (level === "warehouse") {
            baseCols.push({
                dataField: "warehouseName",
                caption: "Almacén",
                defaultWidth: 160,
                minWidth: 100,
                allowSorting: true,
                allowFiltering: true,
                allowHeaderFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `
                        <div class="flex items-center gap-1.5 text-[11px] leading-tight opacity-90">
                            <i class="dx-icon-home text-[12px] text-focus-400"></i>
                            <span class="uppercase tracking-tight font-medium">${escapeHtmlValue(options.value ?? '-')}</span>
                        </div>
                    `;
                }
            });
        }

        baseCols.push(
            {
                dataField: "itemSku",
                caption: "SKU",
                defaultWidth: 140,
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
                minWidth: 200,
            },
            {
                dataField: "uomName",
                caption: "U.M.",
                defaultWidth: 80,
                alignment: "center",
                allowSorting: true,
                allowFiltering: true,
            },
            {
                dataField: "totalQuantity",
                caption: "Stock Total",
                defaultWidth: 120,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `<span class="text-[12px] font-semibold">${escapeHtmlValue(options.value ?? 0)}</span>`;
                }
            },
            {
                dataField: "totalAvailable",
                caption: "Disp. Total",
                defaultWidth: 120,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `<span class="text-[12px] font-semibold text-emerald-400/80">${escapeHtmlValue(options.value ?? 0)}</span>`;
                }
            },
            {
                dataField: "totalAvailableGood",
                caption: "Disp. Buen Estado",
                defaultWidth: 140,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `<span class="text-[12px] font-semibold text-emerald-400">${escapeHtmlValue(options.value ?? 0)}</span>`;
                }
            },
            {
                dataField: "totalReservedQuantity",
                caption: "Reservado",
                defaultWidth: 120,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    container.innerHTML = `<span class="text-[12px] font-medium opacity-80">${escapeHtmlValue(options.value ?? 0)}</span>`;
                }
            },
            {
                dataField: "totalGood",
                caption: "Bueno",
                defaultWidth: 110,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
            },
            {
                dataField: "totalQuarantine",
                caption: "Cuarentena",
                defaultWidth: 110,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const val = options.value ?? 0;
                    const cls = val > 0 ? 'text-amber-400 font-medium' : 'opacity-40';
                    container.innerHTML = `<span class="text-[12px] ${cls}">${escapeHtmlValue(val)}</span>`;
                }
            },
            {
                dataField: "totalScrap",
                caption: "Scrap",
                defaultWidth: 100,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const val = options.value ?? 0;
                    const cls = val > 0 ? 'text-rose-400 font-medium' : 'opacity-40';
                    container.innerHTML = `<span class="text-[12px] ${cls}">${escapeHtmlValue(val)}</span>`;
                }
            },
            {
                dataField: "totalExpiring",
                caption: "Próx. a Vencer",
                defaultWidth: 130,
                alignment: "right",
                allowSorting: true,
                allowFiltering: true,
                cellTemplate: (container: HTMLElement, options: any) => {
                    const val = options.value ?? 0;
                    const cls = val > 0 ? 'text-amber-300 font-medium' : 'opacity-40';
                    container.innerHTML = `<span class="text-[12px] ${cls}">${escapeHtmlValue(val)}</span>`;
                }
            }
        );

        return baseCols;
    }, [level]);

    return (
        <div className="w-full h-full relative flex flex-col min-h-0">
            <GenericDataGrid
                ref={gridRef}
                dataSource={dataSource}
                columns={columns}
                gridId="stock-sum-resume"
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
                    placeholder: "Buscar resumen de stock...",
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
                    fileName: 'ResumenStock',
                    allowExportSelectedData: true,
                    formats: ['xlsx']
                }}
                showDefaultToolbarItems={true}
                toolbarItems={[
                    {
                        location: 'before',
                        widget: 'dxButtonGroup',
                        options: {
                            items: [
                                { text: 'Por Almacén', value: 'warehouse' },
                                { text: 'Por Compañía', value: 'company' },
                            ],
                            keyExpr: 'value',
                            selectedItemKeys: [level],
                            onItemClick: (e: any) => {
                                if (e.itemData?.value && e.itemData.value !== level) {
                                    setLevel(e.itemData.value);
                                }
                            },
                            stylingMode: 'outlined',
                        }
                    },
                    { name: 'exportButton', location: 'after' },
                    { name: 'columnChooserButton', location: 'after' },
                    { name: 'searchPanel', location: 'after' },
                ]}
            />
        </div>
    );
};

export default StockSumResume;

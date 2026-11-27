'use client';

import { stockService } from "@repo/erp-services/stock.service";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { useMemo, useRef } from "react";

const extractSearchValue = (filter: any): string | null => {
    if (!filter || !Array.isArray(filter)) return null;

    if (filter.length === 3 && typeof filter[0] === 'string' && typeof filter[2] === 'string') {
        const op = filter[1];
        if (op === 'contains' || op === '=' || op === 'startswith' || op === 'searchValue') {
            return filter[2];
        }
    }

    for (const item of filter) {
        if (Array.isArray(item)) {
            const val = extractSearchValue(item);
            if (val) return val;
        }
    }
    return null;
};

const StockByLocationList = () => {
    const gridRef = useRef<any>(null);

    const { token, currentCompany } = useAuth();

    const { customLoad, customSave } = createGridStateStorage({ gridId: 'stock-by-location' });

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'virtualId',
            load: async (loadOptions: any) => {
                const locationToSearch = extractSearchValue(loadOptions.filter) || "";

                if (!locationToSearch || locationToSearch.trim() === '') {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const response = await stockService.getStockByLocation(locationToSearch, token, currentCompany?.id);
                    const itemsWithId = response.lines.map((item: any) => ({
                        ...item,
                        locationPath: response.locationPath,
                        locationName: response.locationName,
                        virtualId: item.id
                    }));

                    return {
                        data: itemsWithId,
                        totalCount: itemsWithId.length
                    };
                } catch (error) {
                    console.error("Error loading stock by location:", error);
                    return { data: [], totalCount: 0 };
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
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                const value = options.value || 'N/A';
                container.innerHTML = `<span class="px-1.5 py-0 bg-primary-500/40 text-[11px] text-variant rounded-full font-mono uppercase tracking-tighter">${escapeHtmlValue(value)}</span>`;
            }
        },
        {
            dataField: "itemName",
            caption: "Producto",
            allowSorting: false,
            minWidth: 250,
            cellTemplate: (container: HTMLElement, options: any) => {
                const value = options.value || 'N/A';
                const productName = options.data.productName || '';
                container.innerHTML = `
                    <div class="flex flex-col gap-0">
                        <span class="font-semibold text-[11px] leading-tight">${escapeHtmlValue(value)}</span>
                        <span class="text-[9px] leading-tight opacity-40 uppercase tracking-tight">${escapeHtmlValue(productName)}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "itemId",
            caption: "ID",
            defaultWidth: 220,
            minWidth: 50,
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                const path = options.value || 'N/A';
                container.innerHTML = `
                    <div class="flex items-center gap-1.5 text-[11px] leading-tight">
                        <i class="dx-icon-folder text-[12px] text-focus-400/60"></i>
                        <span class="font-medium">${escapeHtmlValue(path)}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "locationPath",
            caption: "Ubicación",
            defaultWidth: 220,
            minWidth: 50,
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                const path = options.value || 'N/A';
                container.innerHTML = `
                    <div class="flex items-center gap-1.5 text-[11px] leading-tight">
                        <i class="dx-icon-folder text-[12px] text-focus-400/60"></i>
                        <span class="font-medium">${escapeHtmlValue(path)}</span>
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
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                const batch = options.value || 'Sin asignar';
                const opacity = options.value ? 'opacity-100' : 'opacity-30 italic';
                container.innerHTML = `
                    <span class="inline-flex items-center justify-center px-1.5 py-[1px] bg-main/5 rounded border border-main/10 text-[11px] leading-none ${opacity}">
                        ${escapeHtmlValue(batch)}
                    </span>
                `;
            }
        },
        {
            dataField: "quantity",
            caption: "Stock Físico",
            alignment: "left",
            defaultWidth: 140,
            minWidth: 50,
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <span class="text-[12px] font-medium">${escapeHtmlValue(options.value ?? 0)} <span class="text-[10px] opacity-40 font-normal ml-0.5">${escapeHtmlValue(options.data.uomName || '')}</span></span>
                `;
            }
        },
        {
            dataField: "available",
            caption: "Disponible",
            defaultWidth: 140,
            minWidth: 50,
            alignment: "left",
            allowSorting: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `
                    <span class="text-[12px] font-medium">${escapeHtmlValue(options.value ?? 0)} <span class="text-[10px] opacity-40 font-normal ml-0.5">${escapeHtmlValue(options.data.uomName || '')}</span></span>
                `;
            }
        },
    ], []);

    return (
        <div className="w-full h-full relative flex flex-col min-h-0">
            <GenericDataGrid
                ref={gridRef}
                dataSource={dataSource}
                columns={columns}
                gridId="stock-by-location"
                remoteOperations={{
                    filtering: true,
                    paging: false,
                    sorting: false
                }}
                className="custom-grid-styles"
                keyExpr="virtualId"
                allowColumnResizing={true}
                columnResizingMode="nextColumn"
                width="100%"
                columnAutoWidth={false}
                showBorders={true}
                stateStoring={{
                    enabled: true,
                    customLoad: customLoad,
                    customSave: customSave,
                }}
                searchPanel={{
                    visible: true,
                    width: 280,
                    placeholder: "Buscar ubicación o patrón...",
                    highlightSearchText: false
                }}
                filterRow={false}
                headerFilter={false}
                columnChooser={true}
                paging={{
                    enabled: true,
                    pageSize: 20,
                    pageSizes: [10, 20, 50, 100]
                }}
                showDefaultToolbarItems={true}
                toolbarItems={[
                    { name: 'exportButton', location: 'after' },
                    { name: 'columnChooserButton', location: 'after' },
                    { name: 'searchPanel', location: 'after' }
                ]}
            >
            </GenericDataGrid>
        </div>
    );
};

export default StockByLocationList;

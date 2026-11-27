'use client';

import { documentsService } from "@repo/erp-services/documents.service";
import { parseDevExtremeFilterToBackend } from "@repo/api-contracts/erp";
import { IBDocumentsListParams } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useMemo, useRef, useState } from "react";
const { customLoad, customSave } = createGridStateStorage({ gridId: 'documents-grid' });

const DocumentsClient = () => {
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [refreshVersion] = useState(0);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                const dxFilter = loadOptions.filter;
                const parsedFilter = parseDevExtremeFilterToBackend(dxFilter);

                const searchParams: IBDocumentsListParams = {
                    limit: loadOptions.take || 20,
                    offset: loadOptions.skip || 0,
                    ...parsedFilter
                };

                if (currentCompany?.id && !searchParams.company_id) {
                    searchParams.company_id = currentCompany.id;
                }

                try {
                    const response = await documentsService.getAll(searchParams, token, currentCompany?.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading documents:', error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : 'Error al cargar los documentos';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
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
            dataField: 'companyId',
            caption: 'Compañía',
            visible: false,
        },
        {
            dataField: 'unDocumentTypeCode',
            caption: 'Tipo Doc. (UN)',
            dataType: 'number',
            width: 130,
            alignment: 'center',
        },
        {
            dataField: 'documentNumber',
            caption: 'Número Documento',
            allowSorting: true,
            alignment: 'left',
        },
        {
            dataField: 'dispatchCode',
            caption: 'Código Despacho',
            allowSorting: true,
            alignment: 'left',
        },
        {
            dataField: 'issueDate',
            caption: 'Fecha Emisión',
            dataType: 'date',
            format: 'yyyy-MM-dd',
            width: 130,
            alignment: 'center',
        },
        {
            dataField: 'currencyCode',
            caption: 'Moneda',
            width: 90,
            alignment: 'center',
        },
        {
            dataField: 'customerId',
            caption: 'ID Cliente',
            visible: false,
        },
        {
            dataField: 'supplierId',
            caption: 'ID Proveedor',
            visible: false,
        },
        {
            dataField: 'status',
            caption: 'Estado',
            width: 120,
            alignment: 'center',
            cellTemplate: (container: HTMLElement, options: any) => {
                const status = options.value || 'N/A';
                const statusUpper = status.toUpperCase();
                let text = 'SIN DEFINIR';
                let bgClass = 'bg-gray-500/20 text-gray-500 dark:text-gray-400 border-gray-500/20';

                if (statusUpper === 'VALIDATED') {
                    text = 'VALIDADO';
                    bgClass = 'bg-focus-500/20 text-focus-100 border-focus-500/30';
                }

                container.innerHTML = `<span class="px-1.5 py-0.5 text-[10px] font-semibold rounded-[3px] border uppercase tracking-wider ${bgClass}">${escapeHtmlValue(text)}</span>`;
            }
        },
        {
            dataField: 'totalPayable',
            caption: 'Total a Pagar',
            dataType: 'number',
            format: { type: 'fixedPoint', precision: 2 },
            alignment: 'right',
            width: 140,
            cellTemplate: (container: HTMLElement, options: any) => {
                const value = options.value || 0;
                const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: options.data.currencyCode || 'ARS' }).format(value);
                container.innerHTML = `<span class="font-mono font-semibold text-emerald-600 dark:text-emerald-400">${escapeHtmlValue(formatted)}</span>`;
            }
        },
        {
            dataField: 'isPaid',
            caption: 'Pagado',
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'hasDiscounts',
            caption: 'Tiene Desc.',
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'discountTotal',
            caption: 'Descuento Total',
            dataType: 'number',
            format: { type: 'fixedPoint', precision: 2 },
            alignment: 'right',
            width: 130,
            cellTemplate: (container: HTMLElement, options: any) => {
                const value = options.value || 0;
                const formatted = new Intl.NumberFormat('es-AR', { style: 'currency', currency: options.data.currencyCode || 'ARS' }).format(value);
                container.innerHTML = `<span class="font-mono text-gray-500">${escapeHtmlValue(formatted)}</span>`;
            }
        }
    ], []);

    return (
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="documents-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    remoteOperations={true}
                    columns={columns}
                    columnDefaults={{ allowFiltering: true, allowHeaderFiltering: true }}
                    allowColumnReordering={true}
                    allowColumnResizing={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={{ enabled: true, pageSize: 20, pageSizes: [10, 20, 50, 100] }}
                    sorting={{ mode: 'multiple' }}
                    filterRow={true}
                    headerFilter={true}
                    filterPanel={true}
                    grouping={{ autoExpandAll: false, contextMenuEnabled: true }}
                    groupPanel={true}
                    searchPanel={{
                        visible: true,
                        width: 350,
                        placeholder: 'Buscar documentos...',
                        highlightSearchText: true
                    }}
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: false,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                    }}
                    export={{
                        enabled: true,
                        fileName: 'Documentos',
                        allowExportSelectedData: true,
                        formats: ['xlsx']
                    }}
                    columnChooser={true}
                    columnFixing={true}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'documents-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard' }}
                />
            </div>
        </div>
    );
};

export default DocumentsClient;

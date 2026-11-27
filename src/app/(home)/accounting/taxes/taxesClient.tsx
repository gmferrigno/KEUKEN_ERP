'use client';

import { taxesService } from "@repo/erp-services/accountant/taxes.service";
import { IFTax } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { TAX_USE_LABELS, TAX_AMOUNT_TYPE_LABELS, TAX_SCOPE_LABELS } from "@/app/lib/constants/accounting.constants";
import { useMemo, useRef, useState } from "react";
import TaxCreationModal from "./components/actions/taxCreationModal";
import TaxDetail from "./components/actions/taxDetail";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'taxes-grid' });

const TaxesClient = () => {
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTax, setSelectedTax] = useState<IFTax | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [detailData, setDetailData] = useState<IFTax | null>(null);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                if (!currentCompany?.id) {
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
                try {
                    const response = await taxesService.getAll(token, currentCompany.id);
                    return {
                        data: response.items,
                        totalCount: response.total
                    };
                } catch (error: any) {
                    console.error('Error loading taxes:', error);
                    notify(error?.message || 'Error al cargar los impuestos', 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id]);

    const handleDeactivateTax = async (e: any) => {
        if (!currentCompany) return;

        try {
            const data = e?.data || e?.row?.data || e;
            if (!data?.id) return;

            if (data.active === false) {
                notify("El impuesto ya se encuentra inactivo", "info", 3000);
                return;
            }

            await taxesService.update(data.id, { active: false }, token, currentCompany.id);
            setRefreshVersion(prev => prev + 1);
            notify("Impuesto desactivado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deactivating tax:", error);
            notify(error?.message || "Error al desactivar el impuesto", "error", 3000);
        }
    };

    const columns: IGenericDataGridColumn[] = [
        {
            dataField: 'id',
            caption: 'ID',
            allowEditing: false,
            visible: false,
        },
        {
            dataField: 'name',
            caption: 'Nombre',
            allowSorting: true,
            validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
        },
        {
            dataField: 'amountType',
            caption: 'Tipo de Importe',
            allowSorting: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `<span>${escapeHtmlValue(TAX_AMOUNT_TYPE_LABELS[options.value] || options.value || '')}</span>`;
            }
        },
        {
            dataField: 'amount',
            caption: 'Importe / Alícuota',
            dataType: 'number',
            allowSorting: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                const row = options.data;
                const displayValue = row?.amountType === 'percent'
                    ? `${(options.value * 100).toFixed(2)}%`
                    : options.value;
                container.innerHTML = `<span>${escapeHtmlValue(displayValue)}</span>`;
            }
        },
        {
            dataField: 'typeTaxUse',
            caption: 'Aplicación / Uso',
            allowSorting: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `<span>${escapeHtmlValue(TAX_USE_LABELS[options.value] || options.value || '')}</span>`;
            }
        },
        {
            dataField: 'taxScope',
            caption: 'Ámbito',
            allowSorting: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `<span>${escapeHtmlValue(TAX_SCOPE_LABELS[options.value] || options.value || '')}</span>`;
            }
        },
        {
            dataField: 'active',
            caption: 'Activo',
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        }
    ];

    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full flex-1 min-h-0">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="taxes-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    remoteOperations={false}
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
                        placeholder: 'Buscar impuestos...',
                        highlightSearchText: true
                    }}
                    noDataText="No se encontraron impuestos"
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: true,
                        allowDetail: true,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedTax(null);
                            setIsModalOpen(true);
                        },
                        onEdit: (data) => {
                            setSelectedTax(data);
                            setIsModalOpen(true);
                        },
                        onDelete: (e) => handleDeactivateTax(e),
                        onViewDetails: (data) => {
                            setDetailData(data);
                            setIsDetailModalOpen(true);
                        }
                    }}
                    export={{
                        enabled: true,
                        fileName: 'Impuestos',
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
                                displayFormat: 'Total: {0} impuestos'
                            },
                        ],
                    }}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'taxes-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard' }}
                    onRowRemoved={handleDeactivateTax}
                />
            </div>
            <TaxCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedTax(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                }}
                initialData={selectedTax}
            />
            <TaxDetail
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setDetailData(null);
                }}
                data={detailData}
            />
        </div>
    );
};

export default TaxesClient;

'use client';

import { periodsService } from "@repo/erp-services/accountant/periods.service";
import { IFPeriod } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useMemo, useRef, useState } from "react";
import PeriodCreationModal from "./periodCreationModal";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'periods-grid' });

const PeriodsClient = () => {
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedPeriod, setSelectedPeriod] = useState<IFPeriod | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

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
                    const response = await periodsService.getAll(token, currentCompany.id);
                    return {
                        data: response,
                        totalCount: response.length
                    };
                } catch (error: any) {
                    console.error('Error loading periods:', error);
                    const errorMessage = error instanceof Error && error.message 
                        ? error.message 
                        : 'Error al cargar los periodos';
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
            dataField: 'name',
            caption: 'Nombre',
            allowSorting: true,
            validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
        },
        {
            dataField: 'dateStart',
            caption: 'Fecha Inicio',
            dataType: 'date',
            format: 'dd/MM/yyyy',
            allowSorting: true,
        },
        {
            dataField: 'dateStop',
            caption: 'Fecha Fin',
            dataType: 'date',
            format: 'dd/MM/yyyy',
            allowSorting: true,
        },
        {
            dataField: 'state',
            caption: 'Estado',
            width: 120,
            alignment: 'center',
            cellTemplate: (container: HTMLElement, options: any) => {
                const state = options.value;
                const isClosed = state === 'closed';
                const label = isClosed ? 'Cerrado' : 'Abierto';
                const textClass = isClosed ? 'text-focus-500' : 'text-focus-300';
                container.innerHTML = `<span class="text-xs font-medium ${textClass}">${escapeHtmlValue(label)}</span>`;
            }
        }
    ], []);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full flex-1 min-h-0">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="periods-grid"
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
                        placeholder: 'Buscar periodos...',
                        highlightSearchText: true
                    }}
                    noDataText="No se encontraron periodos"
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: true,
                        allowUpdating: true,
                        allowDeleting: false,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedPeriod(null);
                            setIsModalOpen(true);
                        },
                        onEdit: (data) => {
                            setSelectedPeriod(data);
                            setIsModalOpen(true);
                        }
                    }}
                    export={{
                        enabled: true,
                        fileName: 'Periodos',
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
                                displayFormat: 'Total: {0} periodos'
                            },
                        ],
                    }}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'periods-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard' }}
                />
            </div>
            <PeriodCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedPeriod(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                }}
                initialData={selectedPeriod}
            />
        </div>
    );
};

export default PeriodsClient;

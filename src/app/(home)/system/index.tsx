'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { systemService } from "@repo/erp-services/system.service";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import saveAs from "file-saver";
import { useMemo, useRef, useState, useCallback } from "react";
import SystemSettingModal from "./components/systemSettingModal";
import { IFSystemSetting } from "@repo/api-contracts/erp";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'system-grid' });

const SystemClient = () => {
    const { token, permissions, loading } = useAuth();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSetting, setSelectedSetting] = useState<IFSystemSetting | null>(null);
    const [testingStates, setTestingStates] = useState<Record<string, 'UNKNOWN' | 'TESTING' | 'ACTIVO' | 'INACTIVO'>>({});

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['system'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifySystem, permissions) : false;
    }, [permissions]);

    const handleTestConnection = useCallback(async (data: IFSystemSetting) => {
        const key = data.key;
        setTestingStates(prev => ({ ...prev, [key]: 'TESTING' }));
        try {
            const res = await systemService.testConnection(key, token);
            const status = res.ok ? 'ACTIVO' : 'INACTIVO';
            setTestingStates(prev => ({ ...prev, [key]: status }));
            notify(`Conexión probada para ${key}: ${status} (latencia: ${res.latency_ms}ms)`, res.ok ? 'success' : 'error', 3000);
        } catch (error: unknown) {
            setTestingStates(prev => ({ ...prev, [key]: 'INACTIVO' }));
            const msg = error instanceof Error && error.message ? error.message : `Error al conectar con ${key}`;
            notify(msg, 'error', 3000);
        }
    }, [token]);

    const actions = useMemo(() => [
        {
            icon: 'edit',
            hint: 'Editar',
            onClick: (data: IFSystemSetting) => {
                setSelectedSetting(data);
                setIsModalOpen(true);
            },
            visible: (data: any) => {
                const item = data?.row?.data ?? data;
                return !!(canModify && item && !item.isReadOnly);
            }
        },
        {
            icon: 'tel',
            hint: 'Probar Conexión (CHECK_CONN)',
            onClick: (data: IFSystemSetting) => {
                handleTestConnection(data);
            },
            visible: (data: any) => {
                const item = data?.row?.data ?? data;
                return !!(canModify && item);
            }
        }
    ], [canModify, handleTestConnection]);

    const handleExport = async () => {
        try {
            const blob = await systemService.export(token);
            saveAs(blob, 'claves.csv');
            notify('Claves exportadas exitosamente', 'success', 3000);
        } catch (error: unknown) {
            console.error('Error exporting keys:', error);
            const msg = error instanceof Error && error.message ? error.message : 'Error al exportar las claves';
            notify(msg, 'error', 3000);
        }
    };

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'key',
            load: async () => {
                try {
                    const data = await systemService.getAll(token);
                    return {
                        data: data,
                        totalCount: data.length
                    };
                } catch (error: unknown) {
                    console.error('Error loading system settings:', error);
                    const msg = error instanceof Error && error.message ? error.message : 'Error al cargar las claves';
                    notify(msg, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [token]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: 'key',
            caption: 'Clave',
            allowSorting: true,
            allowEditing: false,
        },
        {
            dataField: 'category',
            caption: 'Categoría',
            allowSorting: true,
            allowEditing: false,
        },
        {
            dataField: 'description',
            caption: 'Descripción',
            allowSorting: false,
            allowEditing: false,
        },
        {
            dataField: 'value',
            caption: 'Valor',
            allowSorting: true,
            allowEditing: false,
            cellTemplate: (container: HTMLElement, options: { data: IFSystemSetting; value?: string }) => {
                if (options.data.isSecret) {
                    container.innerHTML = `<span class="opacity-50 italic font-mono">••••••••</span>`;
                } else {
                    container.innerText = options.value || '';
                }
            }
        },
        {
            dataField: 'dataType',
            caption: 'Tipo de Dato',
            allowSorting: true,
            allowEditing: false,
        },
        {
            dataField: 'isReadOnly',
            caption: 'Lectura sola',
            allowEditing: false,
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'isSecret',
            caption: 'Secreto',
            allowEditing: false,
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'status',
            caption: 'Estado',
            alignment: 'center',
            allowSorting: false,
            allowEditing: false,
            cellTemplate: (container: HTMLElement, options: { data: IFSystemSetting }) => {
                const state = testingStates[options.data.key] || 'UNKNOWN';
                
                let badgeClass = "bg-gray-500/10 text-gray-500 border border-gray-500/20";
                let text = "DESCONOCIDO";
                
                if (state === 'TESTING') {
                    badgeClass = "bg-main/10 text-main border border-main/20 animate-pulse";
                    text = "PROBANDO...";
                } else if (state === 'ACTIVO') {
                    badgeClass = "bg-focus-300/10 text-focus-300 border border-focus-300/20";
                    text = "ACTIVO";
                } else if (state === 'INACTIVO') {
                    badgeClass = "bg-focus-500/10 text-focus-500 border border-focus-500/20";
                    text = "INACTIVO";
                }
                
                container.innerHTML = `<span class="px-2 py-0.5 text-xs font-semibold rounded ${badgeClass}">${escapeHtmlValue(text)}</span>`;
            }
        },
        {
            dataField: 'updatedAt',
            caption: 'Actualizado el',
            dataType: 'datetime',
            allowEditing: false,
        }
    ], [testingStates]);

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose !text-[200px] !text-focus-500/20" />
                <p className="text-2xl font-bold text-main/60">No tienes permiso para acceder a esta página</p>
            </div>
        );
    }

    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full flex-1 min-h-0">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="system-grid"
                    keyExpr="key"
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
                        placeholder: 'Buscar claves...',
                        highlightSearchText: true
                    }}
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: canModify,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedSetting(null);
                            setIsModalOpen(true);
                        }
                    }}
                    actions={actions}
                    export={{
                        enabled: true,
                        fileName: 'Claves',
                        allowExportSelectedData: true,
                        formats: ['xlsx']
                    }}
                    columnChooser={true}
                    columnFixing={true}
                    summary={{
                        totalItems: [
                            {
                                column: 'key',
                                summaryType: 'count',
                                displayFormat: 'Total: {0} configuraciones'
                            },
                        ],
                    }}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'system-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard' }}
                    onToolbarPreparing={(e) => {
                        const items = e.toolbarOptions.items;
                        const exportItem = items.find((item: { name?: string }) => item.name === 'exportButton');
                        if (exportItem) {
                            const index = items.indexOf(exportItem);
                            if (index !== -1) {
                                items.splice(index, 1, {
                                    location: 'after',
                                    widget: 'dxButton',
                                    name: 'customExportButton',
                                    options: {
                                        icon: 'export',
                                        hint: 'Exportar a CSV',
                                        onClick: handleExport
                                    }
                                });
                            }
                        }
                    }}
                />
            </div>
            <SystemSettingModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedSetting(null);
                }}
                onSuccess={() => {
                    gridRef.current?.refresh();
                }}
                initialData={selectedSetting}
            />
        </div>
    );
};

export default SystemClient;

'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { commonService } from "@repo/erp-services/common.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { currenciesService } from "@repo/erp-services/payments_services/currencies.service";
import { IFCurrency } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import CountryCreationModal from "../components/actions/countryCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'countries-grid' });

const CountriesClient = () => {
    const { token, permissions, loading, includeInactive, isSuperAdmin } = useAuth();
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [currencies, setCurrencies] = useState<IFCurrency[]>([]);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['countries'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyCountries, permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        const fetchCurrencies = async () => {
            try {
                const response = await currenciesService.getAll(token, false, true);
                setCurrencies(response.items);
            } catch (error) {
                console.error("Error fetching currencies:", error);
            }
        };
        fetchCurrencies();
    }, [token]);

    useEffect(() => {
        setRefreshVersion(prev => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, [isRecoveryMode, recoveryVisibility]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                try {
                    const response = await countriesService.getAll(token, includeInactive);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading countries:', error);
                    notify(error?.message || 'Error al cargar los países', 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, includeInactive, isRecoveryMode, recoveryVisibility]);

    const handleRowInserted = async (e: any) => {
        try {
            await countriesService.create(e.data, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("País creado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating country:", error);
            notify(error?.message || "Error al crear el país", "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.data };
            await countriesService.update(updatedData.id, updatedData, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("País actualizado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating country:", error);
            notify(error?.message || "Error al actualizar el país", "error", 3000);
        }
    };

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await countriesService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("País eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting country:", error);
            notify(error?.message || "Error al eliminar el país", "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.COUNTRIES.schema, RECOVERY_ENTITIES.COUNTRIES.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("País restaurado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar el país:", error);
            notify(error?.message || "Error al restaurar el país", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedCountry(data);
                setIsModalOpen(true);
            },
            visible: (e: any) => !isRecoveryMode && canModify,
        },
        {
            icon: "trash",
            hint: "Eliminar",
            onClick: (data: any) => handleRowRemoved(data),
            visible: (e: any) => !isRecoveryMode && e.active && canModify,
        },
        {
            icon: "revert",
            hint: "Restaurar",
            onClick: (data: any) => handleRestore(data),
            visible: (e: any) => isRecoveryMode && isSuperAdmin,
        }
    ], [isRecoveryMode, canModify, isSuperAdmin, token]);

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: 'id',
                caption: 'ID',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'code',
                caption: 'Código',
                width: 100,
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El código es obligatorio' }],
            },
            {
                dataField: 'name',
                caption: 'Nombre',
                allowSorting: true,
                validationRules: [{ type: 'required', message: 'El nombre es obligatorio' }],
            },
            {
                dataField: 'currencyId',
                caption: 'Moneda',
                lookup: {
                    dataSource: currencies,
                    valueExpr: 'id',
                    displayExpr: (item: IFCurrency) => item ? `${item.name} (${item.symbol})` : ""
                }
            },
            {
                dataField: 'phoneCode',
                caption: 'Código Teléfonico',
                dataType: 'number',
                width: 120,
            },
            {
                dataField: 'active',
                caption: 'Activo',
                width: 100,
                alignment: 'center',
                visible: includeInactive,
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                )
            }
        ];

        if (isRecoveryMode) {
            cols.push(
                {
                    dataField: 'deletedAt',
                    caption: 'Fecha Eliminación',
                    dataType: 'datetime',
                    format: 'dd/MM/yyyy HH:mm',
                    width: 160,
                },
                {
                    dataField: 'deletedByName',
                    caption: 'Eliminado Por',
                    width: 150,
                }
            );
        }

        return cols;
    }, [currencies, includeInactive, isRecoveryMode]);

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
                            recoveryVisibility={recoveryVisibility}
                    ref={gridRef}
                    gridId="countries-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    remoteOperations={false}
                    columns={columns}
                    actions={actions}
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
                        placeholder: 'Buscar países...',
                        highlightSearchText: true
                    }}
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: isRecoveryMode ? false : canModify,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                        onAdd: () => {
                            setSelectedCountry(null);
                            setIsModalOpen(true);
                        }
                    }}
                    export={{
                        enabled: true,
                        fileName: 'Paises',
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
                                displayFormat: 'Total: {0} países'
                            },
                        ],
                    }}
                    stateStoring={{
                        enabled: true,
                        type: 'custom',
                        storageKey: 'countries-grid',
                        savingTimeout: 1000,
                        customLoad,
                        customSave,
                    }}
                    scrolling={{ mode: 'standard' }}
                    onRowRemoved={handleRowRemoved}
                    onRowInserted={handleRowInserted}
                    onRowUpdated={handleRowUpdated}
                />
            </div>
            <CountryCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedCountry(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedCountry}
            />
        </div>
    );
};

export default CountriesClient;

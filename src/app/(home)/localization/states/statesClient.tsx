'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { commonService } from "@repo/erp-services/common.service";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { IFCountry } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn, SelectBox } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import StateCreationModal from "../components/actions/stateCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'states-grid' });

const StatesClient = () => {
    const { token, permissions, loading, includeInactive, isSuperAdmin } = useAuth();
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedState, setSelectedState] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [countries, setCountries] = useState<IFCountry[]>([]);
    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['states'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyStates, permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await countriesService.getAll(token, false, true);
                setCountries(response.items);
            } catch (error) {
                console.error("Error fetching countries:", error);
                notify("Error al cargar los países", "error", 3000);
            }
        };
        fetchCountries();
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
                if (!selectedCountryCode) {
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
                try {
                    const response = await statesService.getAll(token, selectedCountryCode, includeInactive);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading states:', error);
                    notify(error?.message || 'Error al cargar las provincias', 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, selectedCountryCode, includeInactive, isRecoveryMode, recoveryVisibility]);

    const handleRowInserted = async (e: any) => {
        try {
            await statesService.create(e.data, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Provincia creada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating state:", error);
            notify(error?.message || "Error al crear la provincia", "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.data };
            await statesService.update(updatedData.id, updatedData, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Provincia actualizada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating state:", error);
            notify(error?.message || "Error al actualizar la provincia", "error", 3000);
        }
    };

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await statesService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Provincia eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting state:", error);
            notify(error?.message || "Error al eliminar la provincia", "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.STATES.schema, RECOVERY_ENTITIES.STATES.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Provincia restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar la provincia:", error);
            notify(error?.message || "Error al restaurar la provincia", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedState(data);
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
                dataField: 'countryCode',
                caption: 'País',
                width: 80,
            },
            {
                dataField: 'code',
                caption: 'Código',
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
    }, [includeInactive, isRecoveryMode]);

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
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="mb-1.5 w-full flex flex-col items-end justify-between gap-2">
                    <div className="flex w-full items-center gap-4">
                        <div className="w-full">
                            <SelectBox
                                dataSource={countries}
                                valueExpr="code"
                                displayExpr="name"
                                value={selectedCountryCode}
                                onValueChanged={(e) => setSelectedCountryCode(e.value)}
                                placeholder="Seleccione un país..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                                elementAttr={{ class: "rounded-dx" }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex flex-col">
                    {selectedCountryCode ? (
                        <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                            ref={gridRef}
                            gridId="states-grid"
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
                                placeholder: 'Buscar provincias...',
                                highlightSearchText: true
                            }}
                            noDataText="No se encontraron provincias para este país"
                            selection={{ mode: 'none' }}
                            editing={{
                                allowAdding: isRecoveryMode ? false : (!!selectedCountryCode && canModify),
                                allowUpdating: false,
                                allowDeleting: false,
                                useIcons: true,
                                onAdd: () => {
                                    setSelectedState(null);
                                    setIsModalOpen(true);
                                }
                            }}
                            export={{
                                enabled: true,
                                fileName: 'Provincias',
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
                                        displayFormat: 'Total: {0} provincias'
                                    },
                                ],
                            }}
                            stateStoring={{
                                enabled: true,
                                type: 'custom',
                                storageKey: 'states-grid',
                                savingTimeout: 1000,
                                customLoad,
                                customSave,
                            }}
                            scrolling={{ mode: 'standard' }}
                            onRowRemoved={handleRowRemoved}
                            onRowInserted={handleRowInserted}
                            onRowUpdated={handleRowUpdated}
                        />
                    ) : (
                        <GenericEmpty
                            title="Sin país seleccionado"
                            description="Por favor, seleccione un país en el desplegable superior para ver y gestionar sus provincias."
                        />
                    )}
                </div>
            </div>
            <StateCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedState(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedState}
                defaultCountryCode={selectedCountryCode}
                defaultCountryId={countries.find(c => c.code === selectedCountryCode)?.id}
            />
        </div>
    );
};

export default StatesClient;

'use client';


import { useRecovery, RECOVERY_ENTITIES } from "@repo/recovery";
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { commonService } from "@repo/erp-services/common.service";
import { citiesService } from "@repo/erp-services/location_services/cities.service";
import { statesService } from "@repo/erp-services/location_services/states.service";
import { IFState } from "@repo/api-contracts/erp";
import { GenericDataGrid, IGenericDataGridColumn, SelectBox } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import CityCreationModal from "../components/actions/cityCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'cities-grid' });

const CitiesClient = () => {
    const { token, permissions, loading, includeInactive, isSuperAdmin } = useAuth();
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedCity, setSelectedCity] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [states, setStates] = useState<IFState[]>([]);
    const [selectedStateId, setSelectedStateId] = useState<string | null>(null);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['cities'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyCities, permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        const fetchStates = async () => {
            try {
                const response = await statesService.getAll(token, undefined, false, true);
                setStates(response.items);
            } catch (error) {
                console.error("Error fetching states:", error);
                notify("Error al cargar las provincias", "error", 3000);
            }
        };
        fetchStates();
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
                if (!selectedStateId) {
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
                try {
                    const response = await citiesService.getAll(token, selectedStateId, includeInactive);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading cities:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar las ciudades';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, selectedStateId, includeInactive, isRecoveryMode, recoveryVisibility]);

    const handleRowInserted = async (e: any) => {
        try {
            await citiesService.create(e.data, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ciudad creada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating city:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear la ciudad";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.data };
            await citiesService.update(updatedData.id, updatedData, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ciudad actualizada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating city:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar la ciudad";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await citiesService.delete(data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ciudad eliminada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting city:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar la ciudad";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        try {
            await commonService.restore(RECOVERY_ENTITIES.CITIES.schema, RECOVERY_ENTITIES.CITIES.table, data.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ciudad restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar la ciudad:", error);
            notify(error?.message || "Error al restaurar la ciudad", "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedCity(data);
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
                dataField: 'stateCode',
                caption: 'Provincia',
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
                                dataSource={states}
                                valueExpr="id"
                                displayExpr="name"
                                value={selectedStateId}
                                onValueChanged={(e) => setSelectedStateId(e.value)}
                                placeholder="Seleccione una provincia..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex flex-col">
                    {selectedStateId ? (
                        <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                            ref={gridRef}
                            gridId="cities-grid"
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
                                placeholder: 'Buscar ciudades...',
                                highlightSearchText: true
                            }}
                            noDataText="No se encontraron ciudades para esta provincia"
                            selection={{ mode: 'none' }}
                            editing={{
                                allowAdding: isRecoveryMode ? false : (!!selectedStateId && canModify),
                                allowUpdating: false,
                                allowDeleting: false,
                                useIcons: true,
                                onAdd: () => {
                                    setSelectedCity(null);
                                    setIsModalOpen(true);
                                }
                            }}
                            export={{
                                enabled: true,
                                fileName: 'Ciudades',
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
                                        displayFormat: 'Total: {0} ciudades'
                                    },
                                ],
                            }}
                            stateStoring={{
                                enabled: true,
                                type: 'custom',
                                storageKey: 'cities-grid',
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
                            title="Sin provincia seleccionada"
                            description="Por favor, seleccione una provincia en el desplegable superior para ver y gestionar sus ciudades."
                        />
                    )}
                </div>
            </div>
            <CityCreationModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedCity(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedCity}
                defaultStateId={selectedStateId}
            />
        </div>
    );
};

export default CitiesClient;

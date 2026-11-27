'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { countriesService } from "@repo/erp-services/location_services/countries.service";
import { taxCategoriesService } from "@repo/erp-services/payments_services/taxCategories.service";
import { IFCountry } from "@repo/api-contracts/erp";
import { GenericDataGrid, HeaderSelectBox, IGenericDataGridColumn } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import TaxCategoryCreationModal from "../components/actions/taxCategoryCreation";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'tax-categories-grid' });

const TaxCategoriesClient = () => {
    const { token, currentCompany, permissions, loading, includeInactive, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTaxCategory, setSelectedTaxCategory] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [countries, setCountries] = useState<IFCountry[]>([]);
    const [selectedCountryCode, setSelectedCountryCode] = useState<string | null>(null);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['taxCategories'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyTaxCategories, permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        const fetchCountries = async () => {
            try {
                const response = await countriesService.getAll(token);
                setCountries(response.items);
            } catch (error: any) {
                console.error("Error fetching countries:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar los países";
                notify(errorMessage, "error", 3000);
            }
        };
        fetchCountries();
    }, [token]);

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
                    const response = await taxCategoriesService.getAll(selectedCountryCode, token, includeInactive, currentCompany?.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading tax categories:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar los impuestos';
                    notify(errorMessage, 'error', 3000);
                    return {
                        data: [],
                        totalCount: 0
                    };
                }
            }
        });
    }, [refreshVersion, token, selectedCountryCode, includeInactive, currentCompany?.id]);

    const handleRowInserted = async (e: any) => {
        try {
            await taxCategoriesService.create(e.data, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Rubro de impuesto creado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating tax category:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear el rubro de impuesto";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.data };
            await taxCategoriesService.update(updatedData.id, updatedData, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Rubro de impuesto actualizado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating tax category:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar el rubro de impuesto";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowRemoved = async (e: any) => {
        try {
            const data = e.data || e;
            await taxCategoriesService.delete(data.id, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Rubro de impuesto eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting tax category:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar el rubro de impuesto";
            notify(errorMessage, "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedTaxCategory(data);
                setIsModalOpen(true);
            },
            visible: () => canModify,
        },
        {
            icon: "trash",
            hint: "Eliminar",
            onClick: (data: any) => handleRowRemoved(data),
            visible: (e: any) => e.active && canModify,
        }
    ], [canModify]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
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
            dataField: 'taxCategoryCode',
            caption: 'Código',
            allowSorting: true,
            validationRules: [{ type: 'required', message: 'El código es obligatorio' }],
        },
        {
            dataField: 'taxCategoryName',
            caption: 'Nombre',
            allowSorting: true,
        },
        {
            dataField: 'localName',
            caption: 'Nombre Local',
            allowSorting: true,
        },
        {
            dataField: 'localLabel',
            caption: 'Etiqueta',
        },
        {
            dataField: 'taxRate',
            caption: 'Tasa (%)',
            dataType: 'number',
            format: "#0.00'%'",
            width: 100,
        },
        {
            dataField: 'active',
            caption: 'Activo',
            width: 80,
            alignment: 'center',
            visible: includeInactive,
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        }
    ], [includeInactive]);

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
                            <HeaderSelectBox
                                dataSource={countries}
                                valueExpr="code"
                                displayExpr="name"
                                value={selectedCountryCode}
                                onValueChanged={(e) => setSelectedCountryCode(e.value)}
                                placeholder="Seleccione un país..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex flex-col">
                    {selectedCountryCode ? (
                        <GenericDataGrid
                            ref={gridRef}
                            gridId="tax-categories-grid"
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
                                placeholder: 'Buscar rubros...',
                                highlightSearchText: true
                            }}
                            selection={{ mode: 'none' }}
                            editing={{
                                allowAdding: canModify,
                                allowUpdating: false,
                                allowDeleting: false,
                                useIcons: true,
                                onAdd: () => {
                                    setSelectedTaxCategory(null);
                                    setIsModalOpen(true);
                                },
                            }}
                            export={{
                                enabled: true,
                                fileName: 'RubrosImpuestos',
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
                                        displayFormat: 'Total: {0} rubros'
                                    },
                                ],
                            }}
                            stateStoring={{
                                enabled: true,
                                type: 'custom',
                                storageKey: 'tax-categories-grid',
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
                            description="Por favor, seleccione un país en el desplegable superior para ver y gestionar sus rubros de impuestos."
                        />
                    )}
                </div>
            </div>
            <TaxCategoryCreationModal
                isOpen={isModalOpen}
                selectedCountryCode={selectedCountryCode}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedTaxCategory(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedTaxCategory}
            />
        </div>
    );
};

export default TaxCategoriesClient;

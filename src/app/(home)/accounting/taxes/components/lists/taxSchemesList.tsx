'use client';

import { useMemo, useRef, useState } from 'react';
import { localizationService } from '@repo/erp-services/localization.service';
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn  } from '@repo/devextreme';
import { useAuth } from '@/contexts/AuthContext';
import CustomStore from 'devextreme/data/custom_store';
import { CheckBox } from 'devextreme-react/check-box';
import notify from 'devextreme/ui/notify';
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

export default function TaxSchemesList() {
    const { token, permissions, isSuperAdmin, includeInactive } = useAuth();
    const gridRef = useRef<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyTaxCategories, permissions) : false;
    }, [permissions, isSuperAdmin]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                try {
                    const data = await localizationService.getTaxSchemes('AR', token);
                    return {
                        data,
                        totalCount: data.length
                    };
                } catch (error: any) {
                    console.error('Error loading tax schemes:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar categorías de impuestos';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            },
            insert: async (values: any) => {
                try {
                    const payload = { countryCode: 'AR', active: true, ...values };
                    await localizationService.createTaxScheme(payload, token);
                    notify("Esquema de impuestos creado exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error creating tax scheme:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear el esquema de impuestos";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            },
            update: async (key: string, values: any) => {
                try {
                    await localizationService.updateTaxScheme(key, values, token);
                    notify("Esquema de impuestos actualizado exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error updating tax scheme:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar el esquema de impuestos";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            }
        });
    }, [refreshVersion, token]);

    const handleRowInserted = async (e: any) => {
        try {
            const payload = { countryCode: 'AR', active: true, ...e.data };
            await localizationService.createTaxScheme(payload, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Esquema de impuestos creado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating tax scheme:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear el esquema de impuestos";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.oldData, ...e.newData };
            await localizationService.updateTaxScheme(updatedData.id, updatedData, token);
            notify("Esquema de impuestos actualizado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating tax scheme:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar el esquema de impuestos";
            notify(errorMessage, "error", 3000);
            e.cancel = true;
        }
    };

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: 'id',
            caption: 'ID',
            visible: false,
            allowEditing: false,
        },
        {
            dataField: 'countryCode',
            caption: 'País',
            width: 100,
            alignment: 'center',
            allowEditing: canModify,
            defaultValue: 'AR',
        },
        {
            dataField: 'taxCategoryCode',
            caption: 'Código Categoría',
            width: 150,
            alignment: 'center',
            allowEditing: canModify,
            validationRules: [{ type: 'required', message: 'El código de categoría es obligatorio' }],
        },
        {
            dataField: 'localName',
            caption: 'Nombre Local',
            allowEditing: canModify,
            validationRules: [{ type: 'required', message: 'El nombre local es obligatorio' }],
        },
        {
            dataField: 'localLabel',
            caption: 'Etiqueta Local',
            width: 150,
            alignment: 'center',
            allowEditing: canModify,
        },
        {
            dataField: 'taxRate',
            caption: 'Tasa (%)',
            dataType: 'number',
            width: 120,
            alignment: 'right',
            allowEditing: canModify,
            cellTemplate: (container: HTMLElement, options: any) => {
                container.innerHTML = `<span>${escapeHtmlValue(options.value ?? 0)}%</span>`;
            }
        },
        {
            dataField: 'active',
            caption: 'Activo',
            width: 100,
            alignment: 'center',
            allowEditing: canModify,
            visible: includeInactive,
            defaultValue: true,
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        }
    ], [includeInactive, canModify]);

    return (
        <div className="w-full h-full flex flex-col">
            <div className="w-full flex-1 min-h-0">
                <GenericDataGrid
                    ref={gridRef}
                    gridId="tax-schemes-grid"
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
                    paging={{ enabled: true, pageSize: 20 }}
                    sorting={{ mode: 'multiple' }}
                    filterRow={true}
                    headerFilter={true}
                    searchPanel={{
                        visible: true,
                        width: 350,
                        placeholder: 'Buscar categorías...',
                        highlightSearchText: true
                    }}
                    noDataText="No se encontraron categorías de impuestos"
                    selection={{ mode: 'none' }}
                    editing={{
                        allowAdding: canModify,
                        allowUpdating: false,
                        allowDeleting: false,
                        useIcons: true,
                    }}
                    onRowInserted={handleRowInserted}
                    onRowUpdated={handleRowUpdated}
                    export={{
                        enabled: true,
                        fileName: 'Categorias_de_Impuestos',
                        formats: ['xlsx']
                    }}
                />
            </div>
        </div>
    );
}

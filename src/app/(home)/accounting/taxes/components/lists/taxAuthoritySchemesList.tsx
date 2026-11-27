'use client';

import { useMemo, useRef, useState } from 'react';
import { localizationService } from '@repo/erp-services/localization.service';
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn, SelectBox  } from '@repo/devextreme';
import { useAuth } from '@/contexts/AuthContext';
import { CheckBox } from 'devextreme-react/check-box';
import CustomStore from 'devextreme/data/custom_store';
import notify from 'devextreme/ui/notify';
import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

export default function TaxAuthoritySchemesList() {
    const { token, permissions, isSuperAdmin, includeInactive } = useAuth();
    const gridRef = useRef<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [selectedAuthorityId, setSelectedAuthorityId] = useState<string | null>(null);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyTaxCategories, permissions) : false;
    }, [permissions, isSuperAdmin]);

    const authorities = useMemo(() => [
        { id: 'AFIP', name: 'AFIP' }
    ], []);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                try {
                    const data = await localizationService.getTaxAuthoritySchemes('AR', token, selectedAuthorityId || undefined);
                    return {
                        data,
                        totalCount: data.length
                    };
                } catch (error: any) {
                    console.error('Error loading tax authority schemes:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar esquemas de la autoridad de impuestos';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            },
            insert: async (values: any) => {
                try {
                    const payload = { countryCode: 'AR', authorityCode: selectedAuthorityId || 'AFIP', active: true, ...values };
                    await localizationService.createTaxAuthorityScheme(payload, token);
                    notify("Esquema de autoridad creado exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error creating tax authority scheme:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear el esquema de autoridad";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            },
            update: async (key: string, values: any) => {
                try {
                    await localizationService.updateTaxAuthorityScheme(key, values, token);
                    notify("Esquema de autoridad actualizado exitosamente", "success", 3000);
                } catch (error: any) {
                    console.error("Error updating tax authority scheme:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar el esquema de autoridad";
                    notify(errorMessage, "error", 3000);
                    throw error;
                }
            }
        });
    }, [refreshVersion, token, selectedAuthorityId]);

    const handleRowInserted = async (e: any) => {
        try {
            const payload = { countryCode: 'AR', authorityCode: selectedAuthorityId || 'AFIP', active: true, ...e.data };
            await localizationService.createTaxAuthorityScheme(payload, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Esquema de autoridad creado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error creating tax authority scheme:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al crear el esquema de autoridad";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRowUpdated = async (e: any) => {
        try {
            const updatedData = { ...e.oldData, ...e.newData };
            await localizationService.updateTaxAuthorityScheme(updatedData.id, updatedData, token);
            notify("Esquema de autoridad actualizado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error updating tax authority scheme:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al actualizar el esquema de autoridad";
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
            width: 80,
            alignment: 'center',
            allowEditing: canModify,
            defaultValue: 'AR',
        },
        {
            dataField: 'authorityCode',
            caption: 'Autoridad',
            width: 120,
            alignment: 'center',
            allowEditing: canModify,
            defaultValue: selectedAuthorityId || 'AFIP',
        },
        {
            dataField: 'schemeCode',
            caption: 'Cód. Esquema',
            width: 120,
            alignment: 'center',
            allowEditing: canModify,
            validationRules: [{ type: 'required', message: 'El código de esquema es obligatorio' }],
        },
        {
            dataField: 'schemeGroup',
            caption: 'Grupo',
            width: 120,
            alignment: 'center',
            allowEditing: canModify,
            cellTemplate: (container: HTMLElement, options: any) => {
                const val = options.value || '-';
                container.innerHTML = `<span class="capitalize">${escapeHtmlValue(val)}</span>`;
            }
        },
        {
            dataField: 'wsPayloadPath',
            caption: 'WS Payload Path',
            width: 150,
            visible: false,
            allowEditing: canModify,
        },
        {
            dataField: 'localName',
            caption: 'Nombre Local',
            allowEditing: canModify,
            validationRules: [{ type: 'required', message: 'El nombre local es obligatorio' }],
        },
        {
            dataField: 'description',
            caption: 'Descripción',
            allowEditing: canModify,
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
    ], [includeInactive, canModify, selectedAuthorityId]);

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="mb-1.5 w-full flex flex-col items-end justify-between gap-2">
                    <div className="flex w-full items-center gap-4">
                        <div className="w-full">
                            <SelectBox
                                dataSource={authorities}
                                valueExpr="id"
                                displayExpr="name"
                                value={selectedAuthorityId}
                                onValueChanged={(e) => setSelectedAuthorityId(e.value)}
                                placeholder="Seleccione una autoridad de impuestos..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                                elementAttr={{ class: "rounded-dx" }}
                            />
                        </div>
                    </div>
                </div>

                <div className="w-full flex-1 min-h-0 flex flex-col">
                    <GenericDataGrid
                        ref={gridRef}
                        gridId="tax-authority-schemes-grid"
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
                            placeholder: 'Buscar esquemas de autoridad...',
                            highlightSearchText: true
                        }}
                        noDataText={selectedAuthorityId ? "No se encontraron esquemas para esta autoridad" : "No se encontraron esquemas de autoridad de impuestos"}
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
                            fileName: 'Esquemas_Autoridad',
                            formats: ['xlsx']
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

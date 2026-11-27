'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";

import { GenericDataGrid, HeaderSelectBox, IGenericDataGridColumn } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { metadataService } from "@repo/erp-services/metadata.service";
import { IFMetadataAttribute, IFMetadataGroup } from "@repo/api-contracts/erp";
import MetadataAttributeModal from "./components/actions/metadataAttributeModal";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'metadata-grid' });

const MetadataClient = () => {
    const { token, permissions, loading, isSuperAdmin, includeInactive } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedAttribute, setSelectedAttribute] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [groups, setGroups] = useState<IFMetadataGroup[]>([]);

    const entityTypes = useMemo(() => [
        { id: "common.product", name: "Productos" },
        { id: "common.item", name: "Ítems" },
        { id: "common.customer", name: "Clientes" }
    ], []);

    const [selectedEntityType, setSelectedEntityType] = useState<string>("common.product");

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['providers'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyProviders, permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        const fetchGroups = async () => {
            if (!token || !selectedEntityType) return;
            try {
                const data = await metadataService.getGroups(selectedEntityType, token);
                setGroups(data);
            } catch (error: any) {
                console.error("Error al cargar grupos de metadata:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar grupos de metadata";
                notify(errorMessage, "error", 3000);
            }
        };
        fetchGroups();
    }, [token, selectedEntityType]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async () => {
                if (!selectedEntityType || !token) {
                    return { data: [], totalCount: 0 };
                }
                try {
                    const data = await metadataService.getAttributes(selectedEntityType, token, false, null, includeInactive);
                    return {
                        data: data,
                        totalCount: data.length
                    };
                } catch (error: any) {
                    console.error('Error loading metadata attributes:', error);
                    const errorMessage = error instanceof Error && error.message ? error.message : 'Error al cargar los atributos de metadatos';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, selectedEntityType, includeInactive]);

    const handleRowRemoved = async (data: any) => {
        try {
            const targetData = data.data || data;
            await metadataService.deleteAttribute(targetData.id, token);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Atributo eliminado exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error deleting attribute:", error);
            const errorMessage = error instanceof Error && error.message ? error.message : "Error al eliminar el atributo de metadata";
            notify(errorMessage, "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedAttribute(data);
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
        { dataField: 'id', caption: 'ID', visible: false, allowEditing: false },
        { dataField: 'code', caption: 'Código', allowSorting: true },
        { dataField: 'name', caption: 'Nombre', allowSorting: true },
        { dataField: 'shortDescription', caption: 'Descripción Corta', allowSorting: false },
        {
            dataField: 'dataType',
            caption: 'Tipo de Dato',
            allowSorting: true,
            lookup: {
                dataSource: [
                    { id: "string", name: "Texto" },
                    { id: "integer", name: "Entero" },
                    { id: "decimal", name: "Decimal" },
                    { id: "boolean", name: "Booleano" },
                    { id: "date", name: "Fecha" },
                    { id: "datetime", name: "Fecha y Hora" },
                    { id: "list", name: "Lista" },
                    { id: "json", name: "JSON" }
                ],
                valueExpr: 'id',
                displayExpr: 'name'
            }
        },
        {
            dataField: 'groupCode',
            caption: 'Grupo',
            allowSorting: true,
            lookup: {
                dataSource: groups,
                valueExpr: 'code',
                displayExpr: 'name'
            }
        },
        {
            dataField: 'isRequired',
            caption: 'Obligatorio',
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'isVisible',
            caption: 'Visible',
            width: 100,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        {
            dataField: 'isSystemInternal',
            caption: 'Interno de Sistema',
            width: 130,
            alignment: 'center',
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        },
        { dataField: 'sortOrder', caption: 'Orden', dataType: 'number', width: 80 },
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
    ], [groups, includeInactive]);

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
            <div className="w-full h-full flex flex-col gap-y-2">
                {}
                <div className="w-full flex flex-col items-end justify-between">
                    <div className="flex w-full items-center gap-4">
                        <div className="w-full">
                            <HeaderSelectBox
                                dataSource={entityTypes}
                                valueExpr="id"
                                displayExpr="name"
                                value={selectedEntityType}
                                onValueChanged={(e) => setSelectedEntityType(e.value)}
                                placeholder="Seleccione una entidad..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                            />
                        </div>
                    </div>
                </div>

                {}
                <div className="w-full flex-1 min-h-0 flex flex-col">
                    {selectedEntityType ? (
                        <GenericDataGrid
                            ref={gridRef}
                            gridId="metadata-grid"
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
                                placeholder: 'Buscar atributos...',
                                highlightSearchText: true
                            }}
                            noDataText="No se encontraron atributos para esta entidad"
                            selection={{ mode: 'none' }}
                            editing={{
                                allowAdding: canModify,
                                allowUpdating: false,
                                allowDeleting: false,
                                useIcons: true,
                                onAdd: () => {
                                    setSelectedAttribute(null);
                                    setIsModalOpen(true);
                                },
                            }}
                            export={{
                                enabled: true,
                                fileName: 'Metadatos',
                                allowExportSelectedData: true,
                                formats: ['xlsx']
                            }}
                            columnChooser={true}
                            columnFixing={true}
                            summary={{
                                totalItems: [
                                    {
                                        column: 'code',
                                        summaryType: 'count',
                                        displayFormat: 'Total: {0} atributos'
                                    },
                                ],
                            }}
                            stateStoring={{
                                enabled: true,
                                type: 'custom',
                                storageKey: 'metadata-grid',
                                savingTimeout: 1000,
                                customLoad,
                                customSave,
                            }}
                            scrolling={{ mode: 'standard' }}
                        />
                    ) : (
                        <GenericEmpty
                            title="Ninguna entidad seleccionada"
                            description="Seleccione una entidad en el desplegable superior para consultar sus atributos de metadatos."
                        />
                    )}
                </div>
            </div>
            <MetadataAttributeModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedAttribute(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedAttribute}
                entityType={selectedEntityType}
                groups={groups}
            />
        </div>
    );
};

export default MetadataClient;

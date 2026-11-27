'use client';

import { useRecovery } from "@repo/recovery";
import { commonService } from "@repo/erp-services/common.service";

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { locationService } from "@repo/erp-services/warehouse/locations.service";
import { IFLocation, IFLocationSeachParams } from "@repo/api-contracts/erp";
import { escapeHtml, escapeHtmlValue, GenericDataGrid, IGenericDataGridColumn, Button  } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/contexts/LocationsContext";
import { Template } from "devextreme-react/core/template";
import CustomStore from "devextreme/data/custom_store";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import ListEdition from "../actions/listEdition";
import AssignAreaModal from "../actions/assignArea";
import { renderLocationActions } from "../../../lib/utils";

const REMOTE_OPERATIONS = { filtering: true, paging: true };
const SEARCH_PANEL = { visible: true, width: 200, placeholder: "Buscar sub-ubicaciones...", highlightSearchText: false };
const PAGING = { enabled: true, pageSize: 20 };
const PAGER = {
    showPageSizeSelector: true,
    allowedPageSizes: [10, 20, 50, 100],
    showInfo: true,
    displayMode: "full" as const
};
const TOOLBAR_ITEMS = [
    { location: 'after' as const, template: 'editionTemplate' },
    { location: 'after' as const, template: 'simpleCreationTemplate' },
    { location: 'after' as const, template: 'creationTemplate' },
    { location: 'after' as const, template: 'createAreaTemplate' },
    { name: 'searchPanel' as const }
];

class ModalController<T = void> {
    private listener: ((data: T) => void) | null = null;

    subscribe(listener: (data: T) => void) {
        this.listener = listener;
        return () => {
            this.listener = null;
        };
    }

    open(data: T) {
        this.listener?.(data);
    }
}

const AssignAreaModalWrapper = ({ controller, warehouseId, onSuccess }: { controller: ModalController<IFLocation>, warehouseId: string, onSuccess: () => void }) => {
    const [visible, setVisible] = useState(false);
    const [location, setLocation] = useState<IFLocation | null>(null);

    useEffect(() => {
        return controller.subscribe((loc) => {
            setLocation(loc);
            setVisible(true);
        });
    }, [controller]);

    return (
        <AssignAreaModal
            visible={visible}
            onHiding={() => {
                setVisible(false);
                setLocation(null);
            }}
            location={location}
            warehouseId={warehouseId}
            onSuccess={onSuccess}
        />
    );
};

const ListEditionWrapper = ({ controller, warehouseId, parentPath, getSearchPattern, onSuccess }: { controller: ModalController, warehouseId: string, parentPath: string, getSearchPattern: () => string, onSuccess: () => void }) => {
    const [visible, setVisible] = useState(false);
    const [searchPattern, setSearchPattern] = useState("");

    useEffect(() => {
        return controller.subscribe(() => {
            setSearchPattern(getSearchPattern());
            setVisible(true);
        });
    }, [controller, getSearchPattern]);

    return (
        <ListEdition
            visible={visible}
            onHiding={() => setVisible(false)}
            searchPattern={searchPattern}
            warehouseId={warehouseId}
            onSuccess={onSuccess}
        />
    );
};

interface LocationsListProps {
    warehouseId: string;
    currentParentId: string | null;
    onSelectLocation: (location: IFLocation) => void;
}

const LocationsList = ({ warehouseId, currentParentId, onSelectLocation }: LocationsListProps) => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const gridRef = useRef<any>(null);
    const assignAreaController = useMemo(() => new ModalController<IFLocation>(), []);
    const listEditionController = useMemo(() => new ModalController(), []);
    const { token, permissions, isSuperAdmin } = useAuth();
    const { triggerRefresh } = useLocations();

    const handleSuccess = useCallback(() => {
        gridRef.current?.refresh();
        triggerRefresh();
    }, [triggerRefresh]);

    const actionsObj = useMemo(() => renderLocationActions({
        warehouseId,
        parentPath: currentParentId || '',
        parentId: currentParentId || '',
        onSuccess: handleSuccess
    }), [warehouseId, currentParentId, handleSuccess]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions: any) => {
                const searchVal = loadOptions.filter?.[2] ?? null;

                const parentPath = currentParentId ? `${currentParentId}.` : '';
                const pattern = searchVal ? `%${parentPath}${searchVal}%` : `%${parentPath}%`;

                const searchParams: IFLocationSeachParams = {
                    pathPattern: pattern,
                    limit: loadOptions.take || 20,
                    offset: loadOptions.skip || 0,
                    accessLevel: null,
                    areaId: null,
                    areaCode: null,
                    usage: null
                };

                try {
                    const response = await locationService.getByPattern(warehouseId, searchParams, token);
                    return {
                        data: response.items,
                        totalCount: response.metadata.total_items
                    };
                } catch (error: any) {
                    console.error("Error loading locations:", error);
                    const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar datos";
                    throw errorMessage;
                }
            }
        });
    }, [warehouseId, token, currentParentId]);

    const getSearchPattern = useCallback(() => {
        const searchText = gridRef.current?.instance()?.searchByText() || "";
        const parentPath = currentParentId ? `${currentParentId}.` : '';
        return searchText ? `%${parentPath}${searchText}%` : `%${parentPath}%`;
    }, [currentParentId]);

    const handleRowDblClick = useCallback((e: any) => {
        gridRef.current?.instance().searchByText("");
        onSelectLocation(e.data);
    }, [onSelectLocation]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        {
            dataField: "id",
            caption: "ID",
            visible: false,
            allowEditing: false,
        },
        {
            dataField: "path",
            caption: "Ruta Padre",
            allowSorting: true,
            allowFiltering: false,
            allowSearch: true,
            cellTemplate: (container: HTMLElement, options: any) => {
                if (!options.value) {
                    container.innerHTML = '<span class="text-sm opacity-30 italic">Raíz</span>';
                    return;
                }
                container.innerHTML = `
                    <div class="flex items-center gap-2">
                        <i class="dx-icon-folder text-sm text-focus-400"></i>
                        <span class="font-bold">${escapeHtmlValue(options.value)}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "usage",
            caption: "Tipo",
            width: 120,
            alignment: "center",
            allowSorting: false,
            allowFiltering: false,
            lookup: {
                dataSource: [
                    { id: "internal", name: "Almacén" },
                    { id: "view", name: "Ubicación" }
                ],
                valueExpr: "id",
                displayExpr: "name"
            }
        },
        {
            dataField: "name",
            caption: "Nombre",
            allowSorting: true,
            allowFiltering: false,
            allowSearch: true,
        },
        {
            dataField: "accessLevel",
            caption: "Accesibilidad",
            width: 120,
            alignment: "center",
            allowSorting: true,
            allowFiltering: false,
        },
        {
            dataField: "areaId",
            caption: "Área",
            width: 140,
            alignment: "center",
            allowSorting: true,
            allowFiltering: false,
            cellTemplate: (container: HTMLElement, options: any) => {
                const areaName = options.data.areaName || options.data.areaCode;
                if (!options.value || !areaName) {
                    container.innerHTML = '<span class="font-medium opacity-30 italic">Sin Área</span>';
                    return;
                }
                container.innerHTML = `
                    <div class="flex items-center justify-center gap-1.5">
                        <span class="font-medium">${escapeHtmlValue(areaName)}</span>
                    </div>
                `;
            }
        },
        {
            dataField: "state",
            caption: "Estado",
            width: 140,
            alignment: "center",
            allowSorting: false,
            allowFiltering: false,
            lookup: {
                dataSource: [
                    { id: "available", name: "Disponible" },
                    { id: "full", name: "Lleno" },
                    { id: "blocked", name: "Bloqueado" },
                    { id: "maintenance", name: "Mantenimiento" }
                ],
                valueExpr: "id",
                displayExpr: "name"
            }
        },
        {
            dataField: "active",
            caption: "Activo",
            dataType: "boolean",
            width: 100,
            alignment: "center",
            allowSorting: false,
            allowFiltering: false,
        }
    ], []);

    const gridActions = useMemo(() => [
        {
            icon: "link",
            hint: "Asignar área",
            onClick: (data: IFLocation) => {
                assignAreaController.open(data);
            }
        },
        {
            icon: "arrowright",
            hint: "Explorar sub-ubicaciones",
            onClick: (data: IFLocation) => {
                gridRef.current?.instance().searchByText("");
                onSelectLocation(data);
            }
        },
    ], [onSelectLocation, assignAreaController]);

    const canModify = useMemo(() => permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyLocations, permissions) : false, [permissions]);

    return (
        <div className="w-full h-full">
            <GenericDataGrid
                recoveryVisibility={recoveryVisibility}
                ref={gridRef}
                gridId="locations-list-sub"
                className="[&_.dx-datagrid-header-panel]:!pb-1.5"
                dataSource={dataSource}
                columns={columns}
                onOptionChanged={undefined}
                remoteOperations={REMOTE_OPERATIONS}
                onRowDblClick={handleRowDblClick}
                actions={gridActions}
                searchPanel={SEARCH_PANEL}
                showBorders={true}
                rowAlternationEnabled={true}
                hoverStateEnabled={true}
                paging={PAGING}
                pager={PAGER}
                toolbarItems={TOOLBAR_ITEMS}
                stateStoring={useMemo(() => ({
                    enabled: true,
                    type: "localStorage",
                    storageKey: `grid:locations-list-sub:${currentParentId || 'root'}`
                }), [currentParentId])}
            >
                {canModify && (
                    <Template name="editionTemplate">
                        <div className="flex items-center h-full border-r border-main/5 pr-2 mr-2">
                            <Button
                                icon="edit"
                                hint="Edición Masiva"
                                stylingMode="text"
                                className="!text-focus-300 hover:!bg-focus-500/10 !rounded-dx"
                                onClick={() => listEditionController.open()}
                            />
                        </div>
                    </Template>
                )}
                {canModify && (
                    <Template name="simpleCreationTemplate">
                        <div className="flex items-center h-[36px] mr-2">
                            {actionsObj.SimpleCreation}
                        </div>
                    </Template>
                )}
                {canModify && (
                    <Template name="creationTemplate">
                        <div className="flex items-center h-[36px] mr-2">
                            {actionsObj.MassiveCreation}
                        </div>
                    </Template>
                )}
                {canModify && (
                    <Template name="createAreaTemplate">
                        <div className="flex items-center h-[36px]">
                            {actionsObj.CreateArea}
                        </div>
                    </Template>
                )}
            </GenericDataGrid>

            <ListEditionWrapper
                controller={listEditionController}
                warehouseId={warehouseId}
                parentPath={currentParentId || ''}
                getSearchPattern={getSearchPattern}
                onSuccess={handleSuccess}
            />

            <AssignAreaModalWrapper
                controller={assignAreaController}
                warehouseId={warehouseId}
                onSuccess={handleSuccess}
            />
        </div>
    );
};

export default LocationsList;

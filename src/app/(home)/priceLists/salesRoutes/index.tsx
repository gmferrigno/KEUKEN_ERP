'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { salesRoutesService } from "@repo/erp-services/priceLists/salesRoutes.service";
import { usersService } from "@repo/erp-services/users.service";
import zonesService from "@repo/erp-services/zones.service";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from 'devextreme-react/check-box';
import notify from "devextreme/ui/notify";
import { useEffect, useMemo, useRef, useState } from "react";
import AddNewSalesRoute from "./components/actions/addNewSalesRoute";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'salesroutes-grid' });

const SalesRoutesClient = () => {
    const { token, permissions, loading, currentCompany, includeInactive, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSalesRoute, setSelectedSalesRoute] = useState<any>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const [users, setUsers] = useState<any[]>([]);
    const [zones, setZones] = useState<any[]>([]);
    const [isAuxLoading, setIsAuxLoading] = useState(true);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
    }, [permissions, isSuperAdmin]);

    useEffect(() => {
        if (!token || !currentCompany) return;

        const fetchData = async () => {
            try {
                const usersResponse = await usersService.getSalesmenOptions({ limit: 200, companyId: currentCompany.id }, token);
                setUsers(usersResponse.items);

                const zonesResponse = await zonesService.getAll(token, 200, 0);
                setZones(zonesResponse.items.map(z => ({ id: z.id, label: z.name })));
            } catch (error) {
                console.error("Error fetching lookups:", error);
                notify("Error al cargar datos auxiliares", "error", 3000);
            } finally {
                setIsAuxLoading(false);
            }
        };

        fetchData();
    }, [token, currentCompany]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                if (!currentCompany?.id) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const response = await salesRoutesService.getAll(token, take, skip, currentCompany.id);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading sales routes:', error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : 'Error al cargar las rutas de venta';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id]);

    const handleRowRemoved = async (data: any) => {
        try {
            await salesRoutesService.update(data.id, { active: false }, token, currentCompany?.id);
            setRefreshVersion(prev => prev + 1);
            if (gridRef.current?.instance?.refresh) {
                gridRef.current.instance.refresh();
            } else if (gridRef.current?.refresh) {
                gridRef.current.refresh();
            }
            notify("Ruta de venta desactivada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al desactivar la ruta de venta:", error);
            const errorMessage = error instanceof Error && error.message
                ? error.message
                : "Error al desactivar la ruta de venta";
            notify(errorMessage, "error", 3000);
        }
    };

    const actions = useMemo(() => [
        {
            icon: "edit",
            hint: "Editar",
            onClick: (data: any) => {
                setSelectedSalesRoute(data);
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
            dataField: 'name',
            caption: 'Nombre',
            allowEditing: false,
        },
        {
            dataField: 'salesmanUserId',
            caption: 'Vendedor',
            allowEditing: false,
            lookup: {
                dataSource: users,
                valueExpr: 'id',
                displayExpr: 'label'
            }
        },
        {
            dataField: 'zoneId',
            caption: 'Zona',
            allowEditing: false,
            lookup: {
                dataSource: zones,
                valueExpr: 'id',
                displayExpr: 'label'
            }
        },
        {
            dataField: 'active',
            caption: 'Activo',
            allowEditing: canModify,
            width: 100,
            alignment: 'center',
            visible: includeInactive,
            cellRender: (cellData: any) => (
                <div className="flex justify-center items-center h-full">
                    <CheckBox value={cellData.value} readOnly />
                </div>
            )
        }
    ], [users, zones, canModify, includeInactive]);

    if (loading || isAuxLoading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose text-[200px]! text-focus-500/20!" />
                <p className="text-2xl font-bold text-main/60">No tienes permiso para acceder a esta página</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                        ref={gridRef}
                        gridId="salesroutes-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={{ paging: true, filtering: false, sorting: false }}
                        columns={columns}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={{ enabled: true, pageSize: 50, pageSizes: [20, 50, 100] }}
                        filterRow={true}
                        headerFilter={true}
                        searchPanel={{
                            visible: true,
                            width: 350,
                            placeholder: 'Buscar rutas de venta...',
                            highlightSearchText: true
                        }}
                        editing={{
                            allowAdding: canModify,
                            allowUpdating: false,
                            allowDeleting: false,
                            useIcons: true,
                            onAdd: () => {
                                setSelectedSalesRoute(null);
                                setIsModalOpen(true);
                            }
                        }}
                        export={{
                            enabled: true,
                            fileName: 'RutasDeVenta',
                            allowExportSelectedData: true,
                        }}
                        stateStoring={{
                            enabled: true,
                            type: 'custom',
                            storageKey: 'salesroutes-grid',
                            customLoad,
                            customSave,
                        }}
                    />
                </div>
            </div>

            <AddNewSalesRoute
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                }}
                onHidden={() => {
                    setSelectedSalesRoute(null);
                }}
                onSuccess={() => {
                    setRefreshVersion(prev => prev + 1);
                    if (gridRef.current?.instance?.refresh) {
                        gridRef.current.instance.refresh();
                    } else if (gridRef.current?.refresh) {
                        gridRef.current.refresh();
                    }
                }}
                initialData={selectedSalesRoute}
                users={users}
                zones={zones}
            />
        </div>
    );
};

export default SalesRoutesClient;

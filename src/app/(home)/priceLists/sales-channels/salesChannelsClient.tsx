"use client";

import { canDo } from "@repo/access";
import { salesChannelsService } from "@repo/erp-services/salesChannels.service";
import { GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import { useAuth } from "@/contexts/AuthContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import { CheckBox } from "devextreme-react/check-box";
import notify from "devextreme/ui/notify";
import { useMemo, useRef, useState } from "react";
import type { IFSalesChannel } from "@repo/api-contracts/erp";
import { mapCommercialCatalogError } from "@repo/erp-api-client";
import SalesChannelModal from "./components/actions/salesChannelModal";

const { customLoad, customSave } = createGridStateStorage({
    gridId: "sales-channels-grid",
});

const SalesChannelsClient = () => {
    const {
        token,
        permissions,
        loading,
        currentCompany,
        includeInactive,
        isSuperAdmin,
    } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedItem, setSelectedItem] = useState<IFSalesChannel | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);

    const canView = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions ? canDo("view", ["sales-channels"], permissions) : false;
    }, [permissions, isSuperAdmin]);

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions
            ? canDo("modify", ["sales-channels"], permissions)
            : false;
    }, [permissions, isSuperAdmin]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions) => {
                try {
                    const response = await salesChannelsService.getAll(
                        {
                            limit: loadOptions.take || 50,
                            offset: loadOptions.skip || 0,
                            companyId: currentCompany?.id,
                            active: includeInactive ? undefined : true,
                        },
                        token!
                    );
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch (error) {
                    console.error("Error loading sales channels:", error);
                    notify(
                        error instanceof Error
                            ? error.message
                            : "Error al cargar los canales de venta",
                        "error",
                        3000
                    );
                    return { data: [], totalCount: 0 };
                }
            },
        });
    }, [refreshVersion, token, currentCompany?.id, includeInactive]);

    const handleRowRemoved = async (data: IFSalesChannel) => {
        try {
            await salesChannelsService.delete(data.id, token!, currentCompany?.id);
            setRefreshVersion((prev) => prev + 1);
            gridRef.current?.instance?.refresh?.() ?? gridRef.current?.refresh?.();
            notify("Canal de venta eliminado exitosamente", "success", 3000);
        } catch (error) {
            console.error("Error deleting sales channel:", error);
            notify(mapCommercialCatalogError(error), "error", 4500);
        }
    };

    const actions = useMemo(
        () => [
            {
                icon: "edit",
                hint: "Editar",
                onClick: (data: IFSalesChannel) => {
                    setSelectedItem(data);
                    setIsModalOpen(true);
                },
                visible: () => canModify,
            },
            {
                icon: "trash",
                hint: "Eliminar",
                onClick: (data: IFSalesChannel) => handleRowRemoved(data),
                visible: (e: IFSalesChannel) => e.active && canModify,
            },
        ],
        [canModify, token, currentCompany?.id]
    );

    const columns: IGenericDataGridColumn[] = useMemo(
        () => [
            { dataField: "id", caption: "ID", visible: false },
            { dataField: "code", caption: "Código", allowSorting: true, width: 150 },
            { dataField: "name", caption: "Nombre", allowSorting: true },
            {
                dataField: "active",
                caption: "Activo",
                width: 100,
                alignment: "center",
                visible: includeInactive,
                cellRender: (cellData: any) => (
                    <div className="flex justify-center items-center h-full">
                        <CheckBox value={cellData.value} readOnly />
                    </div>
                ),
            },
        ],
        [includeInactive]
    );

    if (loading) return null;

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose !text-[200px] !text-focus-500/20" />
                <p className="text-2xl font-bold text-main/60">
                    No tienes permiso para acceder a esta página
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full h-full rounded-dx">
            <GenericDataGrid
                ref={gridRef}
                gridId="sales-channels-grid"
                keyExpr="id"
                dataSource={dataSource}
                remoteOperations={true}
                columns={columns}
                actions={actions}
                editing={{
                    allowAdding: canModify,
                    allowUpdating: false,
                    allowDeleting: false,
                    useIcons: true,
                    onAdd: () => {
                        setSelectedItem(null);
                        setIsModalOpen(true);
                    },
                }}
                noDataText="No se encontraron canales de venta"
                stateStoring={{
                    enabled: true,
                    type: "custom",
                    storageKey: "sales-channels-grid",
                    customLoad,
                    customSave,
                }}
            />
            <SalesChannelModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onHidden={() => setSelectedItem(null)}
                onSuccess={() => {
                    setRefreshVersion((prev) => prev + 1);
                    gridRef.current?.instance?.refresh?.() ??
                        gridRef.current?.refresh?.();
                }}
                initialData={selectedItem}
            />
        </div>
    );
};

export default SalesChannelsClient;

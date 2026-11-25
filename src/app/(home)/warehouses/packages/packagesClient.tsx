"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useMemo, useRef, useState } from "react";
import { GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { packagesService } from "@repo/erp-services/warehouse/packages.service";
import { IFPackage } from "@repo/api-contracts/erp";
import { ApiError } from "@repo/erp-api-client";
import PackageModal from "./components/packageModal";
import PackageDetailModal from "./components/packageDetailModal";

const { customLoad, customSave } = createGridStateStorage({ gridId: "wms-packages-grid" });

const STATE_LOOKUP = [
    { value: "open", label: "Abierto" },
    { value: "closed", label: "Cerrado" },
];

const PackagesClient = () => {
    const { token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [selected, setSelected] = useState<IFPackage | null>(null);

    const refresh = useCallback(() => {
        gridRef.current?.refresh?.() ?? gridRef.current?.instance?.()?.refresh?.();
    }, []);

    const dataSource = useMemo(
        () =>
            new CustomStore({
                key: "id",
                load: async (loadOptions: any) => {
                    if (!token || !currentCompany?.id) return { data: [], totalCount: 0 };
                    try {
                        const response = await packagesService.getAll(
                            {
                                companyId: currentCompany.id,
                                limit: loadOptions.take || 20,
                                offset: loadOptions.skip || 0,
                            },
                            token
                        );
                        return { data: response.items, totalCount: response.metadata.totalItems };
                    } catch (error) {
                        const msg =
                            error instanceof ApiError
                                ? error.message
                                : "Error al cargar bultos";
                        notify(msg, "error", 3000);
                        return { data: [], totalCount: 0 };
                    }
                },
            }),
        [token, currentCompany?.id]
    );

    const handleClose = async (pkg: IFPackage) => {
        if (!token || !currentCompany?.id) return;
        try {
            await packagesService.close(pkg.id, token, currentCompany.id);
            notify("Bulto cerrado", "success", 2500);
            refresh();
        } catch (error) {
            notify(
                error instanceof ApiError ? error.message : "No se pudo cerrar el bulto",
                "error",
                3500
            );
        }
    };

    const columns: IGenericDataGridColumn[] = useMemo(
        () => [
            { dataField: "id", caption: "ID", visible: false },
            { dataField: "sscc", caption: "SSCC" },
            { dataField: "transferId", caption: "Transfer" },
            { dataField: "parentPackageId", caption: "Padre" },
            {
                dataField: "state",
                caption: "Estado",
                lookup: { dataSource: STATE_LOOKUP, valueExpr: "value", displayExpr: "label" },
            },
            {
                dataField: "contents",
                caption: "Contenido",
                calculateCellValue: (row: IFPackage) =>
                    (row.contents || []).reduce((sum, c) => sum + Number(c.quantity || 0), 0),
                allowFiltering: false,
            },
            { dataField: "createdAt", caption: "Creado", dataType: "datetime" },
        ],
        []
    );

    return (
        <div className="flex flex-col w-full h-full rounded-dx">
            <GenericDataGrid
                ref={gridRef}
                gridId="wms-packages-grid"
                keyExpr="id"
                dataSource={dataSource}
                remoteOperations={true}
                columns={columns}
                export={{ enabled: true, fileName: "BultosWMS" }}
                editing={{
                    allowAdding: true,
                    allowUpdating: false,
                    allowDeleting: false,
                    useIcons: true,
                    onAdd: () => setIsCreateOpen(true),
                }}
                actions={[
                    {
                        icon: "eyeopen",
                        hint: "Ver / cargar contenido",
                        onClick: async (data: IFPackage) => {
                            if (!token || !currentCompany?.id) return;
                            try {
                                const detail = await packagesService.getById(
                                    data.id,
                                    token,
                                    currentCompany.id
                                );
                                setSelected(detail);
                                setIsDetailOpen(true);
                            } catch (error) {
                                notify(
                                    error instanceof ApiError ? error.message : "Error al cargar bulto",
                                    "error",
                                    3000
                                );
                            }
                        },
                    },
                    {
                        icon: "lock",
                        hint: "Cerrar bulto (≠ papelera)",
                        visible: (data: IFPackage) => data?.state === "open",
                        onClick: (data: IFPackage) => handleClose(data),
                    },
                ]}
                stateStoring={{
                    enabled: true,
                    type: "custom",
                    storageKey: "wms-packages-grid",
                    customLoad,
                    customSave,
                }}
            />
            <PackageModal
                isOpen={isCreateOpen}
                onClose={() => setIsCreateOpen(false)}
                onSuccess={refresh}
            />
            <PackageDetailModal
                isOpen={isDetailOpen}
                pkg={selected}
                onClose={() => {
                    setIsDetailOpen(false);
                    setSelected(null);
                }}
                onChanged={async () => {
                    if (!selected || !token || !currentCompany?.id) return;
                    const detail = await packagesService.getById(
                        selected.id,
                        token,
                        currentCompany.id
                    );
                    setSelected(detail);
                    refresh();
                }}
                onClosePackage={async () => {
                    if (selected) await handleClose(selected);
                    setIsDetailOpen(false);
                }}
            />
        </div>
    );
};

export default PackagesClient;

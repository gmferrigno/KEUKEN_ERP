'use client';

import { canDo } from "@repo/access";
import { IFCustomerAddress } from "@repo/api-contracts/erp";
import { customerAddressesService } from "@repo/erp-services/partners/customerAddresses.service";
import { customersService } from "@repo/erp-services/partners/customers.service";
import { confirmDelete, GenericDataGrid, IGenericDataGridColumn } from "@repo/devextreme";
import { useAuth } from "@/contexts/AuthContext";
import { useRecovery } from "@/contexts/RecoveryContext";
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AddressModal from "./components/actions/addressModal";
import AddressDetailModal from "./components/actions/addressDetailModal";

const { customLoad, customSave } = createGridStateStorage({ gridId: "customer-addresses-grid" });

const remoteOpsConfig = { paging: true, filtering: false, sorting: false };
const pagingConfig = { enabled: true, pageSize: 50, pageSizes: [20, 50, 100] };
const searchPanelConfig = {
    visible: true,
    width: 350,
    placeholder: "Buscar direcciones...",
    highlightSearchText: true,
};
const exportConfig = {
    enabled: true,
    fileName: "Direcciones",
    allowExportSelectedData: false,
};
const stateStoringConfig = {
    enabled: true,
    type: "custom" as const,
    storageKey: "customer-addresses-grid",
    customLoad,
    customSave,
};

const ADDRESS_TYPE_LABELS: Record<string, string> = {
    sales: "Ventas",
    delivery: "Entrega",
    invoice: "Facturación",
    other: "Otro",
};

const AddressesClient = () => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState<IFCustomerAddress | null>(null);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [customerFilterId, setCustomerFilterId] = useState<string | null>(null);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [customerOptions, setCustomerOptions] = useState<{ id: string; label: string }[]>([]);

    const canView = useMemo(() => {
        return permissions ? canDo("view", ["partners"], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo("modify", ["partners"], permissions) : false;
    }, [permissions]);

    useEffect(() => {
        setRefreshVersion((prev) => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, [isRecoveryMode, recoveryVisibility]);

    useEffect(() => {
        if (!token || !currentCompany?.id) return;
        customersService
            .getOptions({ companyId: currentCompany.id, limit: 200, active: true }, token)
            .then((res) => {
                setCustomerOptions(
                    (res.items || []).map((item) => ({
                        id: item.id,
                        label: item.label || item.code || item.id,
                    }))
                );
            })
            .catch(() => setCustomerOptions([]));
    }, [token, currentCompany?.id]);

    const refreshGrid = useCallback(() => {
        setRefreshVersion((prev) => prev + 1);
        if (gridRef.current?.instance?.refresh) {
            gridRef.current.instance.refresh();
        } else if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        }
    }, []);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: "id",
            load: async (loadOptions) => {
                if (!currentCompany?.id || !token) {
                    return { data: [], totalCount: 0 };
                }

                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;
                    const response = await customerAddressesService.getAll(token, currentCompany.id, {
                        limit: take,
                        offset: skip,
                        customerId: customerFilterId,
                    });
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems,
                    };
                } catch (error) {
                    console.error("Error loading addresses:", error);
                    const errorMessage =
                        error instanceof Error && error.message
                            ? error.message
                            : "Error al cargar direcciones";
                    notify(errorMessage, "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            },
        });
    }, [refreshVersion, token, currentCompany?.id, customerFilterId, isRecoveryMode, recoveryVisibility]);

    const handleRowRemoved = async (data: any) => {
        if (!token) return;
        const row = data?.data || data;
        const confirmed = await confirmDelete({
            title: "Eliminar Dirección",
            itemLabel: "la dirección",
            itemName: row?.name || row?.code,
        });
        if (!confirmed) return;

        try {
            await customerAddressesService.delete(
                row.customerId,
                row.id,
                token,
                currentCompany?.id
            );
            notify("Dirección eliminada exitosamente", "success", 3000);
            refreshGrid();
        } catch (error) {
            console.error("Error deleting address:", error);
            const errorMessage =
                error instanceof Error && error.message
                    ? error.message
                    : "Error al eliminar dirección";
            notify(errorMessage, "error", 3000);
        }
    };

    const handleRestore = async (data: any) => {
        if (!token) return;
        if (!data?.customerId || !data?.id) {
            notify("No se pudo identificar la dirección a restaurar", "error", 3000);
            return;
        }
        try {
            await customerAddressesService.restore(
                data.customerId,
                data.id,
                token,
                currentCompany?.id
            );
            refreshGrid();
            notify("Dirección restaurada exitosamente", "success", 3000);
        } catch (error: any) {
            console.error("Error al restaurar dirección:", error);
            notify(error?.message || "Error al restaurar el registro", "error", 3000);
        }
    };

    const actions = useMemo(
        () => [
            {
                icon: "eyeopen",
                hint: "Ver Detalle",
                onClick: (data: any) => {
                    setSelectedAddress(data as IFCustomerAddress);
                    setSelectedCustomerId(data.customerId);
                    setIsDetailModalOpen(true);
                },
                visible: canView,
            },
            {
                icon: "edit",
                hint: "Editar",
                onClick: (data: any) => {
                    setSelectedAddress(data as IFCustomerAddress);
                    setSelectedCustomerId(data.customerId);
                    setIsModalOpen(true);
                },
                visible: (e: any) => !isRecoveryMode && canModify,
            },
            {
                icon: "trash",
                hint: "Eliminar",
                onClick: (data: any) => handleRowRemoved(data),
                visible: (e: any) => !isRecoveryMode && canModify,
            },
            {
                icon: "revert",
                hint: "Restaurar",
                onClick: (data: any) => handleRestore(data),
                visible: (e: any) => isRecoveryMode && isSuperAdmin,
            },
        ],
        [canView, canModify, isSuperAdmin, isRecoveryMode, token, currentCompany?.id]
    );

    const columns: IGenericDataGridColumn[] = useMemo(() => {
        const cols: IGenericDataGridColumn[] = [
            {
                dataField: "id",
                caption: "ID",
                visible: false,
                allowEditing: false,
            },
            {
                dataField: "customerId",
                caption: "Cliente",
                allowEditing: false,
                width: 220,
                lookup: {
                    dataSource: customerOptions,
                    valueExpr: "id",
                    displayExpr: "label",
                },
                calculateDisplayValue: (row: any) => {
                    const found = customerOptions.find((c) => c.id === row.customerId);
                    return found?.label || row.customerId;
                },
            },
            {
                dataField: "code",
                caption: "Código",
                allowEditing: false,
                width: 110,
            },
            {
                dataField: "name",
                caption: "Nombre",
                allowEditing: false,
            },
            {
                dataField: "type",
                caption: "Tipo",
                allowEditing: false,
                width: 160,
                calculateCellValue: (row: any) =>
                    Array.isArray(row.type)
                        ? row.type.map((t: string) => ADDRESS_TYPE_LABELS[t] || t).join(", ")
                        : "",
            },
            {
                dataField: "street",
                caption: "Calle",
                allowEditing: false,
            },
            {
                dataField: "cityName",
                caption: "Ciudad",
                allowEditing: false,
                width: 160,
            },
            {
                dataField: "stateName",
                caption: "Provincia",
                allowEditing: false,
                width: 140,
            },
            {
                dataField: "countryName",
                caption: "País",
                allowEditing: false,
                width: 120,
            },
            {
                dataField: "zip",
                caption: "CP",
                allowEditing: false,
                width: 80,
            },
            {
                dataField: "active",
                caption: "Activo",
                dataType: "boolean",
                allowEditing: false,
                width: 90,
            },
        ];

        if (isRecoveryMode) {
            cols.push(
                {
                    dataField: "deletedAt",
                    caption: "Fecha Eliminación",
                    dataType: "datetime",
                    format: "dd/MM/yyyy HH:mm",
                    width: 160,
                },
                {
                    dataField: "deletedByName",
                    caption: "Eliminado Por",
                    width: 150,
                }
            );
        }

        return cols;
    }, [customerOptions, isRecoveryMode]);

    const editingConfig = useMemo(
        () => ({
            mode: "row" as const,
            allowAdding: isRecoveryMode ? false : canModify,
            allowUpdating: false,
            allowDeleting: false,
            useIcons: true,
            onAdd: () => {
                setSelectedAddress(null);
                setSelectedCustomerId(customerFilterId);
                setIsModalOpen(true);
            },
        }),
        [canModify, customerFilterId, isRecoveryMode]
    );

    const handleToolbarPreparing = useCallback(
        (e: any) => {
            e.toolbarOptions.items.unshift({
                location: "before",
                widget: "dxSelectBox",
                options: {
                    width: 260,
                    placeholder: "Filtrar por cliente...",
                    showClearButton: true,
                    searchEnabled: true,
                    dataSource: customerOptions,
                    valueExpr: "id",
                    displayExpr: "label",
                    value: customerFilterId,
                    onValueChanged: (ev: any) => {
                        setCustomerFilterId(ev.value || null);
                        setRefreshVersion((prev) => prev + 1);
                    },
                },
            });
        },
        [customerOptions, customerFilterId]
    );

    if (loading) {
        return null;
    }

    if (permissions && !canView) {
        return (
            <div className="flex flex-col items-center justify-center h-full w-full gap-y-5">
                <i className="dx-icon-eyeclose text-[200px]! text-focus-500/20!" />
                <p className="text-2xl font-bold text-main/60">
                    No tienes permiso para acceder a esta página
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col">
                <div className="w-full flex-1 min-h-0">
                    <GenericDataGrid
                        recoveryVisibility={recoveryVisibility}
                        ref={gridRef}
                        gridId="customer-addresses-grid"
                        keyExpr="id"
                        dataSource={dataSource}
                        remoteOperations={remoteOpsConfig}
                        columns={columns}
                        actions={actions}
                        allowColumnReordering={true}
                        allowColumnResizing={true}
                        showBorders={true}
                        rowAlternationEnabled={true}
                        hoverStateEnabled={true}
                        paging={pagingConfig}
                        filterRow={true}
                        headerFilter={true}
                        searchPanel={searchPanelConfig}
                        editing={editingConfig}
                        export={exportConfig}
                        stateStoring={stateStoringConfig}
                        onToolbarPreparing={handleToolbarPreparing}
                    />
                </div>
            </div>

            <AddressModal
                isOpen={isModalOpen}
                onClose={() => {
                    setIsModalOpen(false);
                    setSelectedAddress(null);
                    setSelectedCustomerId(null);
                }}
                onSuccess={refreshGrid}
                addressId={selectedAddress?.id ?? null}
                customerId={selectedCustomerId}
                initialData={selectedAddress}
            />

            <AddressDetailModal
                isOpen={isDetailModalOpen}
                onClose={() => {
                    setIsDetailModalOpen(false);
                    setSelectedAddress(null);
                    setSelectedCustomerId(null);
                }}
                address={selectedAddress}
                customerLabel={
                    customerOptions.find((c) => c.id === selectedCustomerId)?.label ||
                    selectedCustomerId
                }
            />
        </div>
    );
};

export default AddressesClient;

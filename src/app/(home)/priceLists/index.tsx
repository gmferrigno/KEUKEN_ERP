"use client";


import { useRecovery } from "@repo/recovery";
import { useCallback, useMemo, useRef, useState } from "react";
import { canDo } from "@repo/access";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import AddNewPriceList from "./components/actions/addNewPriceList";
import EditPriceListModal from "./components/actions/editPriceListModal";
import DeletePriceListModal from "./components/actions/deletePriceListModal";
import { formatPercent } from "@/app/lib/utils/prittier";
import { IFPriceList } from "@repo/api-contracts/erp";

const PriceListsClient = () => {
    const { isRecoveryMode, recoveryVisibility } = useRecovery();
    const router = useRouter();
    const { token, permissions, loading, currentCompany, isSuperAdmin } = useAuth();
    const gridRef = useRef<any>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [selectedEditPriceList, setSelectedEditPriceList] = useState<IFPriceList | null>(null);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [selectedDeletePriceList, setSelectedDeletePriceList] = useState<IFPriceList | null>(null);

    const [refreshVersion, setRefreshVersion] = useState(0);

    const handleRefreshGrid = useCallback(() => {
        setRefreshVersion(prev => prev + 1);
        if (gridRef.current?.refresh) {
            gridRef.current.refresh();
        } else if (gridRef.current?.instance && typeof gridRef.current.instance === 'function') {
            gridRef.current.instance()?.getDataSource()?.reload();
        }
    }, []);

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const dataSource = useMemo(() => {
        return new CustomStore({
            key: 'id',
            load: async (loadOptions) => {
                if (!currentCompany?.id || !token) {
                    return { data: [], totalCount: 0 };
                }
                try {
                    const limit = loadOptions.take || 20;
                    const offset = loadOptions.skip || 0;
                    
                    const response = await priceListsService.getAll(token, currentCompany.id, limit, offset);
                    return {
                        data: response.items,
                        totalCount: response.metadata.totalItems
                    };
                } catch (error: any) {
                    console.error('Error loading price lists:', error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : 'Error al cargar las listas de precios';
                    notify(errorMessage, 'error', 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [refreshVersion, token, currentCompany?.id]);

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
            allowSorting: true,
            allowFiltering: true,
        },
        {
            dataField: 'pricelistType.name',
            caption: 'Tipo de Lista',
            allowSorting: false,
            calculateCellValue: (rowData: any) => rowData.pricelistType?.name || '-',
        },
        {
            dataField: 'currencyIsoCode',
            caption: 'Moneda',
            width: 100,
            alignment: 'center',
        },
        {
            dataField: 'state',
            caption: 'Estado',
            width: 120,
            alignment: 'center',
            lookup: {
                dataSource: [
                    { value: 'draft', text: 'Borrador' },
                    { value: 'active', text: 'Activo' },
                    { value: 'inactive', text: 'Inactivo' },
                    { value: 'expired', text: 'Expirado' }
                ],
                valueExpr: 'value',
                displayExpr: 'text'
            }
        },
        {
            dataField: 'defaultMarginOverCostPct',
            caption: 'Margen por Defecto',
            dataType: 'number',
            width: 160,
            customizeText: (cellInfo) => formatPercent(cellInfo.value),
        }
    ], []);

    const remoteOperations = useMemo(() => ({ paging: true, filtering: false, sorting: false }), []);
    const paging = useMemo(() => ({ enabled: true, pageSize: 20, pageSizes: [10, 20, 50] }), []);
    const searchPanel = useMemo(() => ({
        visible: true,
        width: 350,
        placeholder: 'Buscar lista de precios...',
        highlightSearchText: true
    }), []);
    const editing = useMemo(() => ({
        allowAdding: canModify,
        allowUpdating: canModify,
        allowDeleting: canModify,
        allowDetail: true,
        useIcons: true,
        onAdd: () => setIsModalOpen(true),
        onEdit: (data: IFPriceList) => {
            setSelectedEditPriceList(data);
            setIsEditModalOpen(true);
        },
        onDelete: (data: IFPriceList) => {
            setSelectedDeletePriceList(data);
            setIsDeleteModalOpen(true);
        },
        onViewDetails: (data: any) => {
            window.open(`/priceLists/priceListDetail?id=${data.id}`, '_blank');
        }
    }), [canModify]);

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
        <div className="flex flex-col w-full min-w-full h-full bg-dx-primary/10 rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-2">
                <GenericDataGrid
                            recoveryVisibility={recoveryVisibility}
                    ref={gridRef}
                    gridId="pricelists-grid"
                    keyExpr="id"
                    dataSource={dataSource}
                    remoteOperations={remoteOperations}
                    columns={columns}
                    allowColumnReordering={true}
                    allowColumnResizing={true}
                    showBorders={true}
                    rowAlternationEnabled={true}
                    hoverStateEnabled={true}
                    paging={paging}
                    filterRow={true}
                    headerFilter={true}
                    searchPanel={searchPanel}
                    editing={editing}
                />
            </div>

            <AddNewPriceList
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={handleRefreshGrid}
            />

            <EditPriceListModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onHidden={() => setSelectedEditPriceList(null)}
                onSuccess={handleRefreshGrid}
                priceList={selectedEditPriceList}
            />

            <DeletePriceListModal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                onHidden={() => setSelectedDeletePriceList(null)}
                onSuccess={handleRefreshGrid}
                priceList={selectedDeletePriceList}
            />
        </div>
    );
};

export default PriceListsClient;

'use client';

import { GenericDataGrid, IGenericDataGridColumn, SelectBox } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useMemo, useRef, useState } from "react";
import { IFSaleOrder, IFSaleOrderDetail } from "@repo/api-contracts/erp";
import { saleOrdersService } from "@repo/erp-services/priceLists/saleOrders.service";
import notify from "devextreme/ui/notify";
import { useSearchParams, useRouter } from 'next/navigation';
import { SaleOrderDetailHeader } from "./components/SaleOrderDetailHeader";
import AdviseFacturasPanel from "./components/AdviseFacturasPanel";

const SaleOrderDetailClient = () => {
    const { token, currentCompany } = useAuth();
    const searchParams = useSearchParams();
    const router = useRouter();
    const id = searchParams.get('id');
    const gridRef = useRef<any>(null);

    const [saleOrders, setSaleOrders] = useState<IFSaleOrder[]>([]);
    const [selectedSaleOrderId, setSelectedSaleOrderId] = useState<string | null>(id || null);
    const [saleOrderDetail, setSaleOrderDetail] = useState<IFSaleOrderDetail | null>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);

    useEffect(() => {
        setSelectedSaleOrderId(id);
    }, [id]);

    useEffect(() => {
        if (!token || !currentCompany?.id) return;
        const fetchOrders = async () => {
            try {
                const data = await saleOrdersService.getAll(token, 500, 0, { companyId: currentCompany.id });
                setSaleOrders(data.items);
            } catch (error) {
                console.error("Error al cargar pedidos para el selector:", error);
            }
        };
        fetchOrders();
    }, [token, currentCompany?.id]);

    useEffect(() => {
        const fetchDetail = async () => {
            if (!selectedSaleOrderId || !token) {
                setSaleOrderDetail(null);
                return;
            }
            try {
                setIsDetailLoading(true);
                const data = await saleOrdersService.getFullById(selectedSaleOrderId, token, currentCompany?.id);
                setSaleOrderDetail(data);
            } catch (error: any) {
                const errorMessage = error instanceof Error && error.message 
                    ? error.message 
                    : "Error al cargar el detalle del pedido";
                notify(errorMessage, "error", 3000);
                setSaleOrderDetail(null);
            } finally {
                setIsDetailLoading(false);
            }
        };
        fetchDetail();
    }, [selectedSaleOrderId, token, currentCompany?.id]);

    const columns: IGenericDataGridColumn[] = useMemo(() => [
        { dataField: 'id', caption: 'ID', visible: false, allowEditing: false },
        { dataField: 'name', caption: 'Línea / Producto', allowEditing: false },
        { dataField: 'productUomQty', caption: 'Cantidad', dataType: 'number', allowEditing: false },
        { dataField: 'uomName', caption: 'UdM', allowEditing: false },
        { dataField: 'priceUnit', caption: 'Precio Unitario', dataType: 'number', format: 'currency', allowEditing: false },
        { dataField: 'priceSubtotal', caption: 'Subtotal', dataType: 'number', format: 'currency', allowEditing: false },
        { dataField: 'discountTotalLine', caption: 'Descuento', dataType: 'number', format: 'currency', allowEditing: false },
    ], []);

    return (
        <div className="flex flex-col w-full min-w-full h-full rounded-dx font-sans overflow-hidden">
            <div className="w-full h-full flex flex-col gap-y-2">
                {/* Selector */}
                <div className="w-full flex flex-col items-end justify-between">
                    <div className="flex w-full items-center gap-4">
                        <div className="w-full">
                            <SelectBox
                                dataSource={saleOrders}
                                valueExpr="id"
                                displayExpr="name"
                                value={selectedSaleOrderId}
                                onValueChanged={(e) => {
                                    setSelectedSaleOrderId(e.value);
                                    if (e.value && e.value !== id) {
                                        router.push(`/priceLists/saleOrderDetail?id=${e.value}`);
                                    }
                                }}
                                placeholder="Seleccione un pedido de venta..."
                                searchEnabled={true}
                                showClearButton={true}
                                stylingMode="filled"
                                elementAttr={{ class: "rounded-dx" }}
                            />
                        </div>
                    </div>
                </div>

                {isDetailLoading && (
                    <div className="flex-1 flex items-center justify-center h-full min-h-[300px]">
                        <p className="text-main/60 text-sm animate-pulse">Cargando detalles...</p>
                    </div>
                )}

                {!isDetailLoading && !saleOrderDetail && (
                    <GenericEmpty
                        title="Sin pedido de venta seleccionado"
                        description="Seleccione un pedido de venta en el desplegable superior para consultar su encabezado y líneas asociadas."
                    />
                )}

                {!isDetailLoading && saleOrderDetail && (
                    <>
                        {/* Custom order detail header */}
                        <SaleOrderDetailHeader order={saleOrderDetail} />

                        <AdviseFacturasPanel saleOrderId={saleOrderDetail.id} />

                        {/* Grid */}
                        <div className="w-full flex-1 min-h-0">
                            <GenericDataGrid
                                ref={gridRef}
                                gridId="saleorderdetail-grid"
                                keyExpr="id"
                                dataSource={saleOrderDetail.lines}
                                remoteOperations={false}
                                columns={columns}
                                allowColumnReordering={true}
                                allowColumnResizing={true}
                                showBorders={true}
                                rowAlternationEnabled={true}
                                hoverStateEnabled={true}
                                paging={{ enabled: true, pageSize: 50, pageSizes: [20, 50, 100] }}
                                sorting={{ mode: 'multiple' }}
                                filterRow={true}
                                headerFilter={true}
                                searchPanel={{
                                    visible: true,
                                    width: 350,
                                    placeholder: 'Buscar líneas...',
                                    highlightSearchText: true
                                }}
                                noDataText="El pedido no tiene líneas registradas"
                                selection={{ mode: 'none' }}
                                editing={{
                                    mode: 'cell',
                                    allowAdding: false,
                                    allowUpdating: false,
                                    allowDeleting: false,
                                    useIcons: true,
                                }}
                                summary={{
                                    totalItems: [
                                        {
                                            column: 'id',
                                            summaryType: 'count',
                                            displayFormat: 'Total: {0} líneas'
                                        },
                                    ],
                                }}
                                scrolling={{ mode: 'standard' }}
                            />
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default SaleOrderDetailClient;

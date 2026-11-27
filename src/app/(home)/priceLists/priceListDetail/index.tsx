'use client';

import { canDo } from "@repo/access";
import { GenericDataGrid, IGenericDataGridColumn } from '@repo/devextreme';
import GenericEmpty from "@/components/GenericEmpty";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IFPriceListCatalogItem } from "@repo/api-contracts/erp";
import { priceListsService } from "@repo/erp-services/priceLists/priceLists.service";
import CustomStore from "devextreme/data/custom_store";
import notify from "devextreme/ui/notify";
import { formatPercent, formatPrice } from "@/app/lib/utils/prittier";
import AddNewRule from "./components/addNewRule";
import TableHeader from "./components/TableHeader";
import { useEditMode } from "../components/actions/editMode";
import { Template } from "devextreme-react/core/template";
import { useSearchParams } from 'next/navigation';
import { createGridStateStorage } from "@/lib/storage/gridStateStorage";
import { FIELD_LIMITS } from "@/app/lib/constants/common.constants";

const { customLoad, customSave } = createGridStateStorage({ gridId: 'pricelists-catalog-grid' });

const getUnsavedValue = (gridInstance: any, key: string, fieldName: string, fallbackValue: any) => {
    if (!gridInstance) return fallbackValue;
    const changes = gridInstance.option("editing.changes") || [];
    const change = changes.find((c: any) => c.key === key);
    if (change && change.data && change.data[fieldName] !== undefined) {
        return change.data[fieldName];
    }
    return fallbackValue;
};

interface PriceListDetailClientProps {
    initialId?: string;
}

const PriceListDetailClient = ({ initialId }: PriceListDetailClientProps) => {
    const { permissions, loading, token, currentCompany } = useAuth();
    const gridRef = useRef<any>(null);
    const [isEditingMode, setIsEditingMode] = useState(false);

    const [selectedPriceListId, setSelectedPriceListId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [refreshVersion, setRefreshVersion] = useState(0);
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(50);
    const [editedItemsPagesMap, setEditedItemsPagesMap] = useState<Record<string, number>>({});

    const [initialModalData, setInitialModalData] = useState<{ productId: string; priceTarget: number } | undefined>(undefined);

    const modifiedPages = useMemo(() => {
        const uniquePageIndexes = Array.from(new Set(Object.values(editedItemsPagesMap)));
        return uniquePageIndexes.map(index => index + 1).sort((a, b) => a - b);
    }, [editedItemsPagesMap]);

    const searchParams = useSearchParams();
    const queryId = initialId || searchParams?.get('id') || null;

    const canView = useMemo(() => {
        return permissions ? canDo('view', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const canModify = useMemo(() => {
        return permissions ? canDo('modify', ['commercialPriceLists'], permissions) : false;
    }, [permissions]);

    const handleReloadCatalog = useCallback(async () => {
        setRefreshVersion(prev => prev + 1);
    }, []);

    const dataSource = useMemo(() => {
        if (!selectedPriceListId || !token) {
            return [];
        }

        return new CustomStore({
            key: 'itemId',
            load: async (loadOptions) => {
                try {
                    const skip = loadOptions.skip || 0;
                    const take = loadOptions.take || 50;

                    const res = await priceListsService.getFull(
                        selectedPriceListId,
                        token,
                        take,
                        skip
                    );

                    const catalogItems = res.items || [];
                    const result: IFPriceListCatalogItem[] = [];
                    const productGroups: { [productId: string]: IFPriceListCatalogItem[] } = {};

                    catalogItems.forEach(item => {
                        if (!productGroups[item.productId]) {
                            productGroups[item.productId] = [];
                        }
                        productGroups[item.productId].push(item);
                    });

                    Object.keys(productGroups).forEach(productId => {
                        const group = productGroups[productId];
                        let generalItem = group.find(item => item.pricingScope === 'product');
                        if (!generalItem) {
                            generalItem = group[0];
                        }
                        if (!generalItem) return;

                        const parentRow: IFPriceListCatalogItem = {
                            id: generalItem.id,
                            itemId: productId,
                            productId: productId,
                            pricingScope: 'product',
                            state: 'General',
                            productCode: generalItem.productCode,
                            productDescription: generalItem.productDescription,
                            cost: generalItem.cost,
                            taxFactor: generalItem.taxFactor,
                            price: generalItem.price,
                            priceWithTax: generalItem.priceWithTax,
                            marginOverCostPct: generalItem.marginOverCostPct,
                            marginOverSalePct: generalItem.marginOverSalePct,
                            maxDiscountPct: generalItem.maxDiscountPct,
                            minQuantity: generalItem.minQuantity,
                            orderQuantity: null,
                        };

                        result.push(parentRow);

                        const hasItemRule = group.some(item => item.pricingScope === 'item');
                        if (hasItemRule) {
                            group.forEach(child => {
                                if (child.itemId === productId) return;
                                if (child.state === 'Especifico') {
                                    result.push(child);
                                }
                            });
                        }
                    });

                    return {
                        data: result,
                        totalCount: res.metadata.total_items
                    };
                } catch (error: any) {
                    console.error("Error loading price list catalog:", error);
                    const errorMessage = error instanceof Error && error.message
                        ? error.message
                        : "Error al cargar los artículos de la lista de precios";
                    notify(errorMessage, "error", 3000);
                    return { data: [], totalCount: 0 };
                }
            }
        });
    }, [selectedPriceListId, token, refreshVersion]);

    const calculateCellValueWithInheritance = useCallback((fieldName: string) => {
        return (rowData: any) => {
            const grid = gridRef.current?.instance();
            if (!grid) return rowData[fieldName as keyof IFPriceListCatalogItem];

            const isChild = rowData.itemId !== rowData.productId;
            const currentState = getUnsavedValue(grid, rowData.itemId, 'state', rowData.state);

            if (isChild && currentState === 'General') {
                const visibleRows = grid.getVisibleRows();
                const parentRow = visibleRows.find((p: any) => p.data?.itemId === rowData.productId);
                const parent = parentRow?.data;
                if (parent) {
                    return getUnsavedValue(grid, parent.itemId, fieldName, parent[fieldName as keyof IFPriceListCatalogItem]);
                }
            }
            return getUnsavedValue(grid, rowData.itemId, fieldName, rowData[fieldName as keyof IFPriceListCatalogItem]);
        };
    }, []);

    const setCellValueWithState = useCallback((fieldName: string) => {
        return (newData: any, value: any, currentRowData: any) => {
            let val = value;
            if (fieldName === 'marginOverCostPct' && typeof val === 'number' && val > 100) {
                val = 100;
            }
            newData[fieldName] = val;
            if (currentRowData.itemId !== currentRowData.productId) {
                newData.state = 'Especifico';
            }
        };
    }, []);

    const dataGridProps = useMemo(() => ({
        onRowPrepared: (e: any) => {
            if (e.rowType === 'data' && (e.data?.itemId !== e.data?.productId)) {
                e.rowElement.classList.remove('dx-row-alt');
                e.rowElement.classList.add('!bg-focus-500/5', 'opacity-90');
            }
        },
        onCellPrepared: (e: any) => {
            if (e.rowType === 'data' && e.column.allowEditing) {
                e.cellElement.classList.add(
                    '!bg-focus-500/40',
                    '!underline',
                    '!decoration-dashed',
                    '!decoration-focus-300/70',
                    '!underline-offset-4',
                    'hover:!bg-focus-500/20',
                    'hover:!decoration-focus-300',
                    'hover:!decoration-solid',
                    'hover:!text-focus-300',
                    'transition-all',
                    'duration-200',
                    'cursor-pointer'
                );
            }
        }
    }), []);

    const stateStoringOptions = useMemo(() => ({
        enabled: true,
        type: 'custom' as 'custom',
        storageKey: 'pricelists-catalog-grid',
        savingTimeout: 1000,
        customLoad,
        customSave,
    }), []);

    const {
        editingOptions,
        handleRevertRow,
        handleSaving,
        handleOptionChanged,
        handleToolbarPreparing
    } = useEditMode({
        isEditingMode,
        setIsEditingMode,
        gridRef,
        gridDataSource: [],
        setPriceListItems: () => { },
        canModify,
        token: token || "",
        selectedPriceListId,
        onSaveSuccess: handleReloadCatalog,
        setIsLoading,
        modifiedPages,
        pageIndex,
        setPageIndex
    });

    const handleGridOptionChanged = useCallback((e: any) => {
        if (e.name === 'editing') {
            const currentChanges = e.component.option("editing.changes") || [];
            setEditedItemsPagesMap(prev => {
                const next = { ...prev };
                let mapChanged = false;

                currentChanges.forEach((change: any) => {
                    if (next[change.key] === undefined) {
                        next[change.key] = pageIndex;
                        mapChanged = true;
                    }
                });

                const activeKeys = new Set(currentChanges.map((c: any) => c.key));
                Object.keys(next).forEach(key => {
                    if (!activeKeys.has(key)) {
                        delete next[key];
                        mapChanged = true;
                    }
                });

                return mapChanged ? next : prev;
            });
        }
        handleOptionChanged(e);
    }, [handleOptionChanged, pageIndex]);

    useEffect(() => {
        const grid = gridRef.current?.instance();
        if (!grid) return;
        const pagerElement = grid.element().querySelector('.dx-pages');
        if (pagerElement) {
            const pages = pagerElement.querySelectorAll('.dx-page');
            pages.forEach((pageEl: any) => {
                const pageNum = parseInt(pageEl.textContent || "", 10);
                if (!isNaN(pageNum) && modifiedPages.includes(pageNum)) {
                    pageEl.classList.add('!text-focus-500', '!font-bold', 'underline', 'underline-offset-4');
                } else {
                    pageEl.classList.remove('!text-focus-500', '!font-bold', 'underline', 'underline-offset-4');
                }
            });
        }
    }, [modifiedPages, pageIndex]);

    useEffect(() => {
        if (!isEditingMode) {
            setEditedItemsPagesMap({});
        }
    }, [isEditingMode]);

    const renderProductDescription = useCallback((cellData: any) => {
        const rowData = cellData.data || cellData.row?.data;
        if (!rowData) return null;
        const isChild = rowData.itemId !== rowData.productId;
        if (isChild) {
            return (
                <div className="flex items-center gap-x-2 pl-5 text-main/75">
                    <i className="text-focus-300 text-xs dx-icon dx-icon-return" style={{ transform: 'scaleX(-1)', display: 'inline-block' }}></i>
                    <span>{rowData.productDescription || rowData.productCode || rowData.itemId}</span>
                </div>
            );
        }
        return (
            <div className="flex items-center">
                <span className="font-semibold text-main">{rowData.productDescription || rowData.productCode || rowData.productId}</span>
            </div>
        );
    }, []);

    const renderState = useCallback((cellData: any) => {
        const rowData = cellData.data || cellData.row?.data;
        if (!rowData) return null;
        const grid = gridRef.current?.instance();
        const currentState = getUnsavedValue(grid, rowData.itemId, 'state', rowData.state);
        return (
            <div className="flex items-center justify-center w-full h-full">
                <span className={`inline-flex text-main items-center justify-center px-2 py-0.5 rounded-xs text-xs font-semibold ${currentState === 'Especifico'
                    ? 'bg-focus-300/60'
                    : 'bg-focus-500/40'
                    }`}>
                    {currentState === 'Especifico' ? 'Item' : 'Producto'}
                </span>
            </div>
        );
    }, [gridRef]);

    const renderActions = useCallback((cellData: any) => {
        const rowData = cellData.data || cellData.row?.data;
        if (!rowData) return null;
        if (isEditingMode) {
            const grid = gridRef.current?.instance();
            const changes = grid ? (grid.option("editing.changes") || []) : [];
            const hasChanges = changes.some((c: any) => c.key === rowData.itemId);
            const isDeleted = changes.some((c: any) => c.key === rowData.itemId && c.type === 'remove');
            const isItemRule = rowData.pricingScope === 'item';

            return (
                <div className="flex items-center justify-center gap-x-1.5">
                    <button
                        disabled={!hasChanges}
                        onClick={(e) => {
                            e.stopPropagation();
                            handleRevertRow(rowData.itemId);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className={`p-0.5 rounded-full flex items-center justify-center leading-none transition-colors ${hasChanges
                            ? 'hover:bg-main/10 text-main/60 hover:text-main cursor-pointer'
                            : 'text-main/20 cursor-not-allowed'
                            }`}
                        title={hasChanges ? "Deshacer cambios de esta fila" : "Sin cambios"}
                    >
                        <i className="dx-icon-revert text-sm" />
                    </button>

                    {isItemRule && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                const grid = gridRef.current?.instance();
                                if (grid) {
                                    const visibleRows = grid.getVisibleRows();
                                    const rowIndex = visibleRows.findIndex((row: any) => row.data?.itemId === rowData.itemId);
                                    if (rowIndex >= 0) {
                                        grid.deleteRow(rowIndex);
                                    }
                                }
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            className={`p-0.5 rounded-full flex items-center justify-center leading-none transition-colors cursor-pointer ${isDeleted
                                ? 'bg-rose-500/10 text-rose-500'
                                : 'text-main/40 hover:bg-rose-500/10 hover:text-rose-500'}`}
                            title={isDeleted ? "Regla marcada para eliminar" : "Eliminar regla específica"}
                        >
                            <i className="dx-icon-trash text-sm" />
                        </button>
                    )}
                </div>
            );
        }
        const isProductRow = rowData.itemId === rowData.productId || rowData.pricingScope === 'product';
        if (!isEditingMode && isProductRow && canModify) {
            const buttonId = `product-items-popover-btn-${rowData.productId}`;
            return (
                <div className="flex items-center justify-center">
                    <button
                        id={buttonId}
                        onClick={(e) => {
                            e.stopPropagation();
                            setInitialModalData({
                                productId: rowData.productId,
                                priceTarget: rowData.price || 0,
                            });
                            setIsModalOpen(true);
                        }}
                        onMouseDown={(e) => e.stopPropagation()}
                        className="p-0.5 rounded-full hover:bg-focus-500/10 text-focus-300 transition-colors cursor-pointer flex items-center justify-center leading-none"
                        title="Gestionar ítems del producto"
                    >
                        <i className="dx-icon-add text-sm" />
                    </button>
                </div>
            );
        }

        return null;
    }, [isEditingMode, canModify, handleRevertRow, gridRef]);

    const mergedEditingOptions = useMemo(() => ({
        ...editingOptions,
        allowAdding: canModify,
        useIcons: true,
        onAdd: () => setIsModalOpen(true)
    }), [editingOptions, canModify]);


    const columns = useMemo<IGenericDataGridColumn[]>(() => {
        return [
            {
                dataField: 'productDescription',
                caption: 'Artículo',
                allowEditing: false,
                cellTemplate: 'productDescriptionTemplate',
                width: 180,
            },
            {
                dataField: 'productCode',
                caption: 'Código',
                allowEditing: false,
                visible: true,
                width: 120,
            },
            {
                dataField: 'state',
                caption: 'Alcance',
                alignment: 'center',
                allowEditing: false,
                cellTemplate: 'stateTemplate',
                width: 130,
            },
            {
                dataField: 'itemId',
                caption: 'ID Artículo',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'productId',
                caption: 'ID Producto',
                allowEditing: false,
                visible: false,
            },
            {
                dataField: 'cost',
                caption: 'Costo',
                dataType: 'number',
                allowEditing: false,
                customizeText: (cellInfo) => formatPrice(cellInfo.value),
            },
            {
                dataField: 'taxFactor',
                caption: 'Factor Impuesto',
                dataType: 'number',
                allowEditing: false,
                customizeText: (cellInfo) => formatPercent(cellInfo.value * 100),
            },
            {
                dataField: 'price',
                caption: 'Precio',
                dataType: 'number',
                allowEditing: isEditingMode && canModify,
                calculateCellValue: calculateCellValueWithInheritance('price'),
                setCellValue: setCellValueWithState('price'),
                customizeText: (cellInfo) => formatPrice(cellInfo.value),
            },
            {
                dataField: 'priceWithTax',
                caption: 'Precio c/Impuesto',
                dataType: 'number',
                allowEditing: false,
                customizeText: (cellInfo) => formatPrice(cellInfo.value),
            },
            {
                dataField: 'marginOverCostPct',
                caption: 'Margen s/Costo',
                dataType: 'number',
                allowEditing: isEditingMode && canModify,
                calculateCellValue: calculateCellValueWithInheritance('marginOverCostPct'),
                setCellValue: setCellValueWithState('marginOverCostPct'),
                customizeText: (cellInfo) => formatPercent(cellInfo.value),
                validationRules: [
                    { type: 'range', max: FIELD_LIMITS.percentMax, message: FIELD_LIMITS.percentMaxMessage }
                ],
                editorOptions: {
                    max: FIELD_LIMITS.percentMax,
                }
            },
            {
                dataField: 'marginOverSalePct',
                caption: 'Margen s/Venta',
                dataType: 'number',
                allowEditing: isEditingMode && canModify,
                calculateCellValue: calculateCellValueWithInheritance('marginOverSalePct'),
                setCellValue: setCellValueWithState('marginOverSalePct'),
                customizeText: (cellInfo) => formatPercent(cellInfo.value),
            },
            {
                dataField: 'maxDiscountPct',
                caption: 'Descuento Máx.',
                dataType: 'number',
                allowEditing: isEditingMode && canModify,
                calculateCellValue: calculateCellValueWithInheritance('maxDiscountPct'),
                setCellValue: setCellValueWithState('maxDiscountPct'),
                customizeText: (cellInfo) => formatPercent(cellInfo.value),
            },
            {
                dataField: 'minQuantity',
                caption: 'Cantidad Mín.',
                dataType: 'number',
                allowEditing: isEditingMode && canModify,
                calculateCellValue: calculateCellValueWithInheritance('minQuantity'),
                setCellValue: setCellValueWithState('minQuantity'),
            },
            {
                dataField: 'orderQuantity',
                caption: 'Cantidad Pedido',
                dataType: 'number',
                allowEditing: false,
            },
            {
                type: 'buttons',
                caption: 'Acciones',
                alignment: 'center',
                allowEditing: false,
                width: 120,
                cellTemplate: 'actionsTemplate',
                buttons: [
                    {
                        name: 'customActions',
                        visible: true
                    }
                ]
            }
        ];
    }, [isEditingMode, canModify, calculateCellValueWithInheritance, setCellValueWithState]);

    const pagingOptions = useMemo(() => ({
        enabled: true,
        pageSize,
        pageSizes: [20, 50, 100],
        pageIndex,
        onPageIndexChange: setPageIndex,
        onPageSizeChange: (newPageSize: number) => {
            setPageSize(newPageSize);
            setEditedItemsPagesMap(prev => {
                const next: Record<string, number> = {};
                for (const key in prev) {
                    const oldPage = prev[key];
                    const estimatedIndex = oldPage * pageSize;
                    next[key] = Math.floor(estimatedIndex / newPageSize);
                }
                return next;
            });
        }
    }), [pageIndex, pageSize]);

    const searchPanelOptions = useMemo(() => ({
        visible: true,
        width: 350,
        placeholder: 'Buscar en el catálogo...',
        highlightSearchText: true
    }), []);

    const exportOptions = useMemo(() => ({
        enabled: true,
        fileName: 'CatalogoListaDePrecios',
        allowExportSelectedData: true,
    }), []);

    const remoteOperationsOptions = useMemo(() => ({ paging: true, filtering: false, sorting: false }), []);

    if (loading || isLoading) {
        return (
            <div className="flex items-center justify-center h-full w-full gap-x-2">
                <i className="dx-icon-refresh animate-spin text-focus-500 text-3xl" />
                <span className="text-lg font-medium text-main/80">Cargando lista de precios...</span>
            </div>
        );
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
                <TableHeader
                    selectedPriceListId={selectedPriceListId}
                    onPriceListChange={(id) => {
                        setSelectedPriceListId(id);
                        setPageIndex(0);
                        setEditedItemsPagesMap({});
                    }}
                    disabled={isEditingMode}
                    token={token}
                    companyId={currentCompany?.id}
                    queryId={queryId}
                    onResetSelection={() => {
                        setPageIndex(0);
                        setEditedItemsPagesMap({});
                    }}
                />

                <div className="w-full flex-1 min-h-0 flex flex-col">
                    {selectedPriceListId ? (
                        <GenericDataGrid
                            ref={gridRef}
                            dataSource={dataSource}
                            gridId="pricelists-catalog-grid"
                            keyExpr="itemId"
                            remoteOperations={remoteOperationsOptions}
                            columns={columns}
                            allowColumnReordering={true}
                            allowColumnResizing={true}
                            showBorders={true}
                            rowAlternationEnabled={true}
                            hoverStateEnabled={true}
                            paging={pagingOptions}
                            filterRow={true}
                            headerFilter={true}
                            searchPanel={searchPanelOptions}
                            export={exportOptions}
                            editing={mergedEditingOptions}
                            onSaving={handleSaving}
                            onToolbarPreparing={handleToolbarPreparing}
                            onOptionChanged={handleGridOptionChanged}
                            dataGridProps={dataGridProps}
                            stateStoring={stateStoringOptions}
                            className="[&_.dx-datagrid-rowsview_td]:!align-middle [&_.dx-cell-modified]:!bg-focus-500/10 [&_.dx-cell-modified]:!text-focus-300 [&_.dx-cell-modified::after]:!border-focus-300 [&_.dx-row-removed_>_td]:!bg-rose-500/10"
                        >
                            <Template name="productDescriptionTemplate" render={renderProductDescription} />
                            <Template name="stateTemplate" render={renderState} />
                            <Template name="actionsTemplate" render={renderActions} />
                        </GenericDataGrid>
                    ) : (
                        <GenericEmpty
                            title="Ninguna lista de precios seleccionada"
                            description="Utiliza el desplegable de arriba para cargar los productos, precios y reglas de la lista."
                        />
                    )}
                </div>
            </div>

            {selectedPriceListId && (
                <AddNewRule
                    isOpen={isModalOpen}
                    onClose={() => {
                        setIsModalOpen(false);
                        setInitialModalData(undefined);
                    }}
                    onSuccess={() => {
                        setRefreshVersion(v => v + 1);
                    }}
                    pricelistId={selectedPriceListId}
                    initialData={initialModalData}
                />
            )}
        </div>
    );
};

export default PriceListDetailClient;

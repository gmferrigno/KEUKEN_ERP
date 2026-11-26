'use client';

import type { IFCategory, IFItem, IFPresentation } from '@repo/api-contracts/erp';
import TextBox from 'devextreme-react/text-box';
import PosCartQtyBadge from './PosCartQtyBadge';
import PosCategoryFilter from './PosCategoryFilter';
import PosPresentationsList from './PosPresentationsList';

type PosCatalogPanelProps = {
    productSearch: string;
    onProductSearchChange: (value: string) => void;
    categories: IFCategory[];
    categoriesLoading: boolean;
    selectedCategoryId: string | null;
    onCategoryChange: (categoryId: string | null) => void;
    products: IFItem[];
    productsLoading: boolean;
    pendingItem: IFItem | null;
    pendingPresentations: IFPresentation[];
    cartQtyByItemId: Map<string, number>;
    cartQtyByPresentationId: Map<string, number>;
    canStartSale: boolean;
    busy: boolean;
    onAddItem: (item: IFItem) => void;
    onSelectPresentation: (presentation: IFPresentation) => void;
    onClearPending: () => void;
};

const PosCatalogPanel = ({
    productSearch,
    onProductSearchChange,
    categories,
    categoriesLoading,
    selectedCategoryId,
    onCategoryChange,
    products,
    productsLoading,
    pendingItem,
    pendingPresentations,
    cartQtyByItemId,
    cartQtyByPresentationId,
    canStartSale,
    busy,
    onAddItem,
    onSelectPresentation,
    onClearPending,
}: PosCatalogPanelProps) => {
    return (
        <>
            <div className="p-2 border-b border-main/10 shrink-0 flex flex-col gap-2">
                <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-2">
                    <div className="flex flex-col gap-1 min-w-0">
                        <label className="text-[10px] uppercase tracking-wide text-main/45">
                            Buscar
                        </label>
                        <TextBox
                            value={productSearch}
                            valueChangeEvent="input"
                            onValueChanged={(e) =>
                                onProductSearchChange(e.value || '')
                            }
                            placeholder="Buscar por SKU o nombre..."
                            stylingMode="filled"
                            mode="search"
                            showClearButton
                            elementAttr={{ class: 'rounded-dx' }}
                        />
                    </div>
                    <PosCategoryFilter
                        categories={categories}
                        value={selectedCategoryId}
                        onChange={onCategoryChange}
                        loading={categoriesLoading}
                    />
                </div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto p-2">
                {pendingItem && pendingPresentations.length > 0 ? (
                    <PosPresentationsList
                        item={pendingItem}
                        presentations={pendingPresentations}
                        cartQtyByPresentationId={cartQtyByPresentationId}
                        showBack
                        onBack={onClearPending}
                        onSelect={(pres) => onSelectPresentation(pres)}
                    />
                ) : (
                    <>
                        {!productsLoading && products.length === 0 && (
                            <div className="h-full min-h-[160px] flex items-center justify-center text-sm text-main/50 text-center px-4">
                                {selectedCategoryId
                                    ? 'No hay ítems para la categoría seleccionada'
                                    : 'No hay productos para mostrar'}
                            </div>
                        )}
                        <div className="grid grid-cols-1 sm:grid-cols-2 2xl:grid-cols-3 gap-2">
                            {products.map((item) => {
                                const inCartQty = cartQtyByItemId.get(item.id) || 0;
                                return (
                                    <button
                                        key={item.id}
                                        type="button"
                                        onClick={() => onAddItem(item)}
                                        disabled={busy || !canStartSale}
                                        className="relative text-left p-2.5 rounded-dx border border-main/10 bg-variant/40 hover:bg-focus-500/10 hover:border-focus-500/30 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        <PosCartQtyBadge qty={inCartQty} />
                                        <div className="text-[11px] font-medium text-main/55 truncate pr-7">
                                            {item.sku || item.id}
                                        </div>
                                        <div className="text-sm font-semibold text-main line-clamp-2 min-h-[2.4rem]">
                                            {item.itemDisplayName ||
                                                item.itemName ||
                                                item.productName ||
                                                'Sin descripción'}
                                        </div>
                                        <div className="mt-1.5 flex justify-end text-[11px] text-main/60">
                                            <span className="inline-flex items-center gap-1">
                                                <i className="dx-icon dx-icon-plus" />
                                                Agregar
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>
        </>
    );
};

export default PosCatalogPanel;

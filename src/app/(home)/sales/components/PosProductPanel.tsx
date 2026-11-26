'use client';

import type { IFCategory, IFItem, IFPresentation } from '@repo/api-contracts/erp';
import NumberBox from 'devextreme-react/number-box';
import type { RefObject } from 'react';
import type { PosCodeLookupMode, PosViewMode } from '../types';
import { clampPct } from '../utils';
import PosCatalogPanel from './PosCatalogPanel';
import PosCodeEntryPanel from './PosCodeEntryPanel';

type PosProductPanelProps = {
    viewMode: PosViewMode;
    onViewModeChange: (mode: PosViewMode) => void;
    productsLoading: boolean;
    productsCount: number;
    codeLookupMode: PosCodeLookupMode;
    entryDiscountPct: number;
    onEntryDiscountPctChange: (value: number) => void;
    onClearPending: () => void;
    // catalog
    productSearch: string;
    onProductSearchChange: (value: string) => void;
    categories: IFCategory[];
    categoriesLoading: boolean;
    selectedCategoryId: string | null;
    onCategoryChange: (categoryId: string | null) => void;
    products: IFItem[];
    pendingItem: IFItem | null;
    pendingPresentations: IFPresentation[];
    cartQtyByItemId: Map<string, number>;
    cartQtyByPresentationId: Map<string, number>;
    canStartSale: boolean;
    busy: boolean;
    onAddItem: (item: IFItem) => void;
    onSelectCatalogPresentation: (presentation: IFPresentation) => void;
    // code
    onCodeLookupModeChange: (mode: PosCodeLookupMode) => void;
    codeInput: string;
    onCodeInputChange: (value: string) => void;
    codeInputRef: RefObject<any>;
    codeQty: number;
    onCodeQtyChange: (value: number) => void;
    codeSearching: boolean;
    onSearch: () => void;
    onSelectCodePresentation: (presentation: IFPresentation) => void;
};

const PosProductPanel = ({
    viewMode,
    onViewModeChange,
    productsLoading,
    productsCount,
    codeLookupMode,
    entryDiscountPct,
    onEntryDiscountPctChange,
    onClearPending,
    productSearch,
    onProductSearchChange,
    categories,
    categoriesLoading,
    selectedCategoryId,
    onCategoryChange,
    products,
    pendingItem,
    pendingPresentations,
    cartQtyByItemId,
    cartQtyByPresentationId,
    canStartSale,
    busy,
    onAddItem,
    onSelectCatalogPresentation,
    onCodeLookupModeChange,
    codeInput,
    onCodeInputChange,
    codeInputRef,
    codeQty,
    onCodeQtyChange,
    codeSearching,
    onSearch,
    onSelectCodePresentation,
}: PosProductPanelProps) => {
    return (
        <section className="flex flex-col min-h-0 rounded-dx border border-main/10 bg-primary-500/40 overflow-hidden">
            <div className="flex items-center gap-2 p-2 border-b border-main/10 shrink-0">
                <div className="inline-flex rounded-dx border border-main/15 overflow-hidden">
                    <button
                        type="button"
                        onClick={() => {
                            onViewModeChange('catalog');
                            onClearPending();
                        }}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === 'catalog'
                                ? 'bg-focus-500/20 text-main'
                                : 'text-main/60 hover:bg-main/10'
                        }`}
                    >
                        Catálogo
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            onViewModeChange('code');
                            onClearPending();
                        }}
                        className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                            viewMode === 'code'
                                ? 'bg-focus-500/20 text-main'
                                : 'text-main/60 hover:bg-main/10'
                        }`}
                    >
                        Código / Cantidad
                    </button>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <span className="text-[11px] text-main/50 hidden sm:inline">
                        {viewMode === 'catalog'
                            ? productsLoading
                                ? 'Cargando...'
                                : `${productsCount} productos`
                            : codeLookupMode === 'barcode'
                              ? 'Código de barras'
                              : 'Código de ítem'}
                    </span>
                    {viewMode === 'catalog' && (
                        <div className="flex items-center gap-1.5">
                            <label
                                className="text-[10px] uppercase tracking-wide text-main/45 whitespace-nowrap"
                                title="Descuento al agregar desde catálogo. En el carrito se puede corregir."
                            >
                                Dto al agregar
                            </label>
                            <NumberBox
                                value={entryDiscountPct}
                                min={0}
                                max={100}
                                format="#0.##'%'"
                                width={84}
                                height={30}
                                stylingMode="filled"
                                valueChangeEvent="input"
                                onValueChanged={(e) =>
                                    onEntryDiscountPctChange(
                                        clampPct(Number(e.value) || 0)
                                    )
                                }
                                elementAttr={{ class: 'rounded-dx' }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {viewMode === 'catalog' ? (
                <PosCatalogPanel
                    productSearch={productSearch}
                    onProductSearchChange={onProductSearchChange}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    selectedCategoryId={selectedCategoryId}
                    onCategoryChange={onCategoryChange}
                    products={products}
                    productsLoading={productsLoading}
                    pendingItem={pendingItem}
                    pendingPresentations={pendingPresentations}
                    cartQtyByItemId={cartQtyByItemId}
                    cartQtyByPresentationId={cartQtyByPresentationId}
                    canStartSale={canStartSale}
                    busy={busy}
                    onAddItem={onAddItem}
                    onSelectPresentation={onSelectCatalogPresentation}
                    onClearPending={onClearPending}
                />
            ) : (
                <PosCodeEntryPanel
                    codeLookupMode={codeLookupMode}
                    onCodeLookupModeChange={onCodeLookupModeChange}
                    codeInput={codeInput}
                    onCodeInputChange={onCodeInputChange}
                    codeInputRef={codeInputRef}
                    codeQty={codeQty}
                    onCodeQtyChange={onCodeQtyChange}
                    entryDiscountPct={entryDiscountPct}
                    onEntryDiscountPctChange={onEntryDiscountPctChange}
                    codeSearching={codeSearching}
                    canStartSale={canStartSale}
                    onSearch={onSearch}
                    pendingItem={pendingItem}
                    pendingPresentations={pendingPresentations}
                    cartQtyByPresentationId={cartQtyByPresentationId}
                    onSelectPresentation={onSelectCodePresentation}
                    onClearPending={onClearPending}
                />
            )}
        </section>
    );
};

export default PosProductPanel;

'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';
import { canDo } from '@repo/access';
import type { IFPresentation } from '@repo/api-contracts/erp';
import { saleOrdersService } from '@repo/erp-services/priceLists/saleOrders.service';
import notify from 'devextreme/ui/notify';
import { useCallback, useMemo, useState } from 'react';
import PosCartPanel from './components/PosCartPanel';
import PosHeader from './components/PosHeader';
import PosProductPanel from './components/PosProductPanel';
import { usePosCart } from './hooks/usePosCart';
import { usePosCatalog } from './hooks/usePosCatalog';
import { usePosCodeEntry } from './hooks/usePosCodeEntry';
import { usePosSaleSetup } from './hooks/usePosSaleSetup';
import type { PosViewMode } from './types';
import { clampPct, toIsoDate } from './utils';

const PosClient = () => {
    const { token, loading, currentCompany, permissions, isSuperAdmin } = useAuth();
    const { currentBranch } = useBranch();

    const [viewMode, setViewMode] = useState<PosViewMode>('catalog');
    const [entryDiscountPct, setEntryDiscountPct] = useState(0);
    const [submitting, setSubmitting] = useState(false);

    const saleSetup = usePosSaleSetup();
    const {
        orderDestination,
        setOrderDestination,
        deliveryDate,
        setDeliveryDate,
        customerId,
        setCustomerId,
        customerLabel,
        setCustomerLabel,
        customerFull,
        addressId,
        selectedAddress,
        deliveryAddresses,
        selectAddressById,
        defaultPricelistId,
        setDefaultPricelistId,
        pricelistOptions,
        customersStore,
        missingSaleSetup,
        canStartSale,
        ensureSaleSetup,
        resetSaleSetup,
    } = saleSetup;

    const cartApi = usePosCart({
        customerId,
        defaultPricelistId,
        ensureSaleSetup,
        onLineAdded: () => setEntryDiscountPct(0),
    });
    const {
        cart,
        orderDiscountPct,
        setOrderDiscountPct,
        orderDiscountAmount,
        setOrderDiscountAmount,
        cartSubtotal,
        effectiveOrderDiscount,
        cartTotal,
        cartCount,
        cartQtyByItemId,
        cartQtyByPresentationId,
        addCartEntry,
        updateLine,
        changeLinePricelist,
        removeLine,
        clearCart,
    } = cartApi;

    const {
        products,
        productsLoading,
        productSearch,
        setProductSearch,
        categories,
        categoriesLoading,
        selectedCategoryId,
        setSelectedCategoryId,
    } = usePosCatalog({ viewMode });

    const codeEntry = usePosCodeEntry({
        ensureSaleSetup,
        addCartEntry,
        entryDiscountPct,
    });
    const {
        codeLookupMode,
        setCodeLookupMode,
        codeInput,
        setCodeInput,
        codeQty,
        setCodeQty,
        codeSearching,
        pendingItem,
        pendingPresentations,
        codeInputRef,
        clearPending,
        resetCodeEntry,
        addFromPresentation,
        addItemFromCatalog,
        handleCodeSearch,
    } = codeEntry;

    const canModify = useMemo(() => {
        if (isSuperAdmin) return true;
        return permissions
            ? canDo('modify', ['commercialPriceLists'], permissions)
            : false;
    }, [permissions, isSuperAdmin]);

    const clearSale = useCallback(() => {
        clearCart();
        resetSaleSetup();
        setProductSearch('');
        setSelectedCategoryId(null);
        setEntryDiscountPct(0);
        resetCodeEntry();
    }, [
        clearCart,
        resetSaleSetup,
        setProductSearch,
        setSelectedCategoryId,
        resetCodeEntry,
    ]);

    const handleCustomerChange = useCallback(
        (id: string | null, label: string) => {
            setCustomerId(id);
            setCustomerLabel(label);
            clearCart();
        },
        [setCustomerId, setCustomerLabel, clearCart]
    );

    const handleSelectCatalogPresentation = useCallback(
        (pres: IFPresentation) => {
            if (!pendingItem) return;
            void addFromPresentation(pres, 1, pendingItem, entryDiscountPct);
        },
        [pendingItem, addFromPresentation, entryDiscountPct]
    );

    const handleSelectCodePresentation = useCallback(
        (pres: IFPresentation) => {
            if (!pendingItem) return;
            void addFromPresentation(
                pres,
                codeQty,
                pendingItem,
                entryDiscountPct
            );
        },
        [pendingItem, codeQty, addFromPresentation, entryDiscountPct]
    );

    const handleConfirm = async () => {
        if (!token || !currentCompany?.id) return;
        if (!canModify) {
            notify('No tenés permisos para registrar una venta', 'warning', 3000);
            return;
        }
        if (!ensureSaleSetup()) return;
        if (!cart.length) {
            notify('Agregá al menos un producto', 'warning', 2500);
            return;
        }

        const footerPct = clampPct(orderDiscountPct);

        try {
            setSubmitting(true);
            const result = await saleOrdersService.create(
                {
                    customerId: customerId!,
                    customerAddressId: addressId,
                    pricelistId: defaultPricelistId,
                    branchId: currentBranch?.id || null,
                    deliveryDate:
                        orderDestination === 'reparto'
                            ? toIsoDate(deliveryDate)
                            : toIsoDate(new Date()),
                    taxData: {
                        order_destination: orderDestination,
                        order_destination_label:
                            orderDestination === 'reparto'
                                ? 'Reparto / preparar'
                                : 'Retiro en mostrador',
                    },
                    lines: cart.map((line) => {
                        const linePct = clampPct(line.discountPct);
                        const discountData: Array<{
                            type: 'negociado';
                            percent: number;
                            displayScope: 'line' | 'footer';
                        }> = [];

                        if (linePct > 0) {
                            discountData.push({
                                type: 'negociado',
                                percent: linePct,
                                displayScope: 'line',
                            });
                        }
                        if (footerPct > 0) {
                            discountData.push({
                                type: 'negociado',
                                percent: footerPct,
                                displayScope: 'footer',
                            });
                        }

                        return {
                            itemId: line.itemId,
                            name: line.productDescription || line.productCode,
                            productUomQty: line.quantity,
                            productUomId: line.productUomId,
                            pricelistId: line.pricelistId,
                            presentationId: line.presentationId,
                            priceUnitRegular:
                                line.unitPrice > 0 ? line.unitPrice : null,
                            discountData: discountData.length
                                ? discountData
                                : null,
                            ...(line.isDualUom
                                ? {
                                      secUomQty: line.secQuantity,
                                      secUomId: line.secUomId,
                                  }
                                : {
                                      secUomQty: null,
                                      secUomId: null,
                                  }),
                        };
                    }),
                },
                token,
                currentCompany.id
            );

            notify(
                result.name
                    ? `Venta ${result.name} creada (${result.state})`
                    : result.message || 'Venta creada',
                'success',
                4000
            );

            if (result.saleOrderId) {
                window.open(
                    `/priceLists/saleOrderDetail?id=${result.saleOrderId}`,
                    '_blank'
                );
            }

            clearSale();
        } catch (error) {
            console.error('Error creating POS sale:', error);
            notify(
                error instanceof Error
                    ? error.message
                    : 'No se pudo registrar la venta',
                'error',
                4000
            );
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return null;

    return (
        <div className="flex flex-col w-full h-full min-h-0 gap-3 overflow-hidden">
            <PosHeader
                customersStore={customersStore}
                customerId={customerId}
                customerLabel={customerLabel}
                customerFull={customerFull}
                addressId={addressId}
                selectedAddress={selectedAddress}
                deliveryAddresses={deliveryAddresses}
                onAddressChange={selectAddressById}
                onCustomerChange={handleCustomerChange}
                pricelistOptions={pricelistOptions}
                defaultPricelistId={defaultPricelistId}
                onPricelistChange={setDefaultPricelistId}
                orderDestination={orderDestination}
                onOrderDestinationChange={setOrderDestination}
                deliveryDate={deliveryDate}
                onDeliveryDateChange={setDeliveryDate}
                canStartSale={canStartSale}
                missingSaleSetup={missingSaleSetup}
            />

            <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-[1.4fr_1fr] gap-3 overflow-hidden">
                <PosProductPanel
                    viewMode={viewMode}
                    onViewModeChange={setViewMode}
                    productsLoading={productsLoading}
                    productsCount={products.length}
                    codeLookupMode={codeLookupMode}
                    entryDiscountPct={entryDiscountPct}
                    onEntryDiscountPctChange={setEntryDiscountPct}
                    onClearPending={clearPending}
                    productSearch={productSearch}
                    onProductSearchChange={setProductSearch}
                    categories={categories}
                    categoriesLoading={categoriesLoading}
                    selectedCategoryId={selectedCategoryId}
                    onCategoryChange={setSelectedCategoryId}
                    products={products}
                    pendingItem={pendingItem}
                    pendingPresentations={pendingPresentations}
                    cartQtyByItemId={cartQtyByItemId}
                    cartQtyByPresentationId={cartQtyByPresentationId}
                    canStartSale={canStartSale}
                    busy={codeSearching}
                    onAddItem={addItemFromCatalog}
                    onSelectCatalogPresentation={handleSelectCatalogPresentation}
                    onCodeLookupModeChange={setCodeLookupMode}
                    codeInput={codeInput}
                    onCodeInputChange={setCodeInput}
                    codeInputRef={codeInputRef}
                    codeQty={codeQty}
                    onCodeQtyChange={setCodeQty}
                    codeSearching={codeSearching}
                    onSearch={() => handleCodeSearch()}
                    onSelectCodePresentation={handleSelectCodePresentation}
                />

                <PosCartPanel
                    cart={cart}
                    cartCount={cartCount}
                    cartSubtotal={cartSubtotal}
                    cartTotal={cartTotal}
                    effectiveOrderDiscount={effectiveOrderDiscount}
                    orderDiscountPct={orderDiscountPct}
                    orderDiscountAmount={orderDiscountAmount}
                    onOrderDiscountPctChange={setOrderDiscountPct}
                    onOrderDiscountAmountChange={setOrderDiscountAmount}
                    pricelistOptions={pricelistOptions}
                    submitting={submitting}
                    canModify={canModify}
                    customerId={customerId}
                    onClearCart={clearCart}
                    onRemoveLine={removeLine}
                    onUpdateLine={updateLine}
                    onChangeLinePricelist={changeLinePricelist}
                    onConfirm={handleConfirm}
                />
            </div>
        </div>
    );
};

export default PosClient;

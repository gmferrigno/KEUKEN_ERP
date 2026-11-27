'use client';

import { IFPriceListItem } from "@repo/api-contracts/erp";
import { Button } from '@repo/devextreme';
import ScrollView from 'devextreme-react/scroll-view';
import { useEffect, useMemo, useState } from 'react';
import ItemCriteria from './itemCriteria';

interface DefineCriteriaProps {
    onClose: () => void;
    product: IFPriceListItem | null;
    onSave?: (productId: string, enabledItemsMap: Record<string, boolean>) => void;
}

export default function DefineCriteria({ onClose, product, onSave }: DefineCriteriaProps) {
    const [initialEnabledItems, setInitialEnabledItems] = useState<Record<string, boolean>>({});
    const [enabledItems, setEnabledItems] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (product?.items) {
            const initial: Record<string, boolean> = {};
            product.items.forEach(item => {
                initial[item.itemId] = item.state === 'Especifico';
            });
            setInitialEnabledItems(initial);
            setEnabledItems(initial);
        } else {
            setInitialEnabledItems({});
            setEnabledItems({});
        }
    }, [product]);

    const handleToggle = (itemId: string, enabled: boolean) => {
        setEnabledItems(prev => ({
            ...prev,
            [itemId]: enabled
        }));
    };

    const hasChanges = useMemo(() => {
        return Object.keys(enabledItems).some(
            (key) => enabledItems[key] !== initialEnabledItems[key]
        );
    }, [enabledItems, initialEnabledItems]);

    const handleCancel = () => {
        setEnabledItems(initialEnabledItems);
        onClose();
    };

    const handleConfirm = () => {
        if (product && onSave) {
            onSave(product.productId, enabledItems);
        }
        onClose();
    };

    return (
        <div className="flex h-full flex-col bg-primary-950/95 border-l border-main/10 shadow-2xl backdrop-blur-md w-[450px]">
            {}
            <div className="px-6 py-6 border-b border-main/10 flex items-start justify-between">
                <div className="space-y-1">
                    <h2 className="text-xl font-semibold text-main">
                        Definir Criterios
                    </h2>
                    <p className="text-sm text-main/60 truncate max-w-xs">
                        {product?.productDescription || product?.productCode}
                    </p>
                </div>
                <div className="ml-3 flex h-7 items-center">
                    <Button
                        icon="close"
                        onClick={handleCancel}
                        stylingMode="text"
                        className="rounded-dx text-main/40 hover:text-main"
                    />
                </div>
            </div>

            {}
            <ScrollView className="relative flex-1 w-full" showScrollbar="always">
                <div className="px-6 py-6 h-full min-h-[100%]">
                    {product?.items && product.items.length > 0 ? (
                        <div className="space-y-4">
                            <h3 className="text-xs font-bold text-main/40 mb-3 uppercase tracking-wider">
                                Artículos / Variantes
                            </h3>

                            <div className="flex flex-col gap-y-3">
                                {product.items.map((item) => (
                                    <ItemCriteria
                                        key={item.itemId}
                                        item={item}
                                        isEnabled={!!enabledItems[item.itemId]}
                                        onToggle={handleToggle}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60 py-20">
                            <i className="dx-icon-folder text-5xl mb-4 text-main/20" />
                            <p className="text-main/60 font-medium">No hay variantes cargadas</p>
                        </div>
                    )}
                </div>
            </ScrollView>

            {}
            <div className="px-6 py-6 border-t border-main/10 flex justify-end gap-x-3 bg-primary-950/50">
                {hasChanges ? (
                    <>
                        <Button
                            text="Cancelar"
                            type="normal"
                            stylingMode="outlined"
                            onClick={handleCancel}
                            className="!rounded-dx"
                        />
                        <Button
                            text="Confirmar"
                            type="default"
                            stylingMode="contained"
                            onClick={handleConfirm}
                            className="!bg-focus-500 !text-variant !rounded-dx font-bold shadow-md shadow-black/20"
                        />
                    </>
                ) : (
                    <Button
                        text="Cerrar"
                        type="normal"
                        stylingMode="outlined"
                        onClick={handleCancel}
                        className="!rounded-dx"
                    />
                )}
            </div>
        </div>
    );
}

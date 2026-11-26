'use client';

import type { IFOptionItem } from '@repo/api-contracts/erp';
import { Button, SelectBox } from '@repo/devextreme';
import NumberBox from 'devextreme-react/number-box';
import type { PosCartLine } from '../types';
import { clampPct, currencyFmt, lineNet } from '../utils';

type PosCartPanelProps = {
    cart: PosCartLine[];
    cartCount: number;
    cartSubtotal: number;
    cartTotal: number;
    effectiveOrderDiscount: number;
    orderDiscountPct: number;
    orderDiscountAmount: number;
    onOrderDiscountPctChange: (pct: number) => void;
    onOrderDiscountAmountChange: (amount: number) => void;
    pricelistOptions: IFOptionItem[];
    submitting: boolean;
    canModify: boolean;
    customerId: string | null;
    onClearCart: () => void;
    onRemoveLine: (key: string) => void;
    onUpdateLine: (key: string, patch: Partial<PosCartLine>) => void;
    onChangeLinePricelist: (
        key: string,
        itemId: string,
        pricelistId: string | null
    ) => void;
    onConfirm: () => void;
};

const PosCartPanel = ({
    cart,
    cartCount,
    cartSubtotal,
    cartTotal,
    effectiveOrderDiscount,
    orderDiscountPct,
    orderDiscountAmount,
    onOrderDiscountPctChange,
    onOrderDiscountAmountChange,
    pricelistOptions,
    submitting,
    canModify,
    customerId,
    onClearCart,
    onRemoveLine,
    onUpdateLine,
    onChangeLinePricelist,
    onConfirm,
}: PosCartPanelProps) => {
    return (
        <section className="flex flex-col min-h-0 rounded-dx border border-main/10 bg-primary-900/20 overflow-hidden">
            <div className="flex items-center justify-between gap-2 px-2.5 py-2 border-b border-main/10 shrink-0">
                <div>
                    <h3 className="text-sm font-semibold text-main">Carrito</h3>
                    <p className="text-[11px] text-main/55">
                        {cartCount} ítem(s) · {cart.length} línea(s)
                    </p>
                </div>
                <Button
                    text="Vaciar"
                    icon="trash"
                    stylingMode="text"
                    disabled={!cart.length || submitting}
                    onClick={onClearCart}
                />
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-1.5">
                {!cart.length && (
                    <div className="flex-1 flex items-center justify-center text-sm text-main/50">
                        Agregá productos desde el catálogo o por código
                    </div>
                )}

                {cart.map((line) => (
                    <div
                        key={line.key}
                        className="rounded-dx border border-main/10 bg-variant/30 px-2 py-1.5 flex flex-col gap-1"
                    >
                        <div className="flex items-center gap-2 min-w-0">
                            <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-main truncate">
                                    <span className="text-main/55 mr-1">
                                        {line.productCode}
                                    </span>
                                    {line.productDescription}
                                </div>
                                {(line.presentationName ||
                                    line.barcode ||
                                    line.isDualUom) && (
                                    <div className="text-[10px] text-main/45 truncate">
                                        {[
                                            line.presentationName,
                                            line.barcode
                                                ? `CB: ${line.barcode}`
                                                : null,
                                            line.isDualUom
                                                ? 'Catch-weight'
                                                : null,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </div>
                                )}
                            </div>
                            <span className="text-xs font-semibold text-main whitespace-nowrap">
                                {currencyFmt.format(lineNet(line))}
                            </span>
                            <button
                                type="button"
                                className="p-0.5 rounded hover:bg-main/10 text-main/50"
                                onClick={() => onRemoveLine(line.key)}
                                aria-label="Quitar"
                            >
                                <i className="dx-icon dx-icon-close text-sm" />
                            </button>
                        </div>

                        {line.isDualUom ? (
                            <div className="grid grid-cols-[minmax(0,1.2fr)_56px_72px_72px_52px] gap-1 items-center">
                                <SelectBox
                                    dataSource={pricelistOptions}
                                    valueExpr="id"
                                    displayExpr="label"
                                    value={line.pricelistId}
                                    onValueChanged={(e) =>
                                        onChangeLinePricelist(
                                            line.key,
                                            line.itemId,
                                            e.value || null
                                        )
                                    }
                                    placeholder="Lista"
                                    searchEnabled
                                    showClearButton
                                    stylingMode="filled"
                                    height={28}
                                    elementAttr={{ class: 'rounded-dx text-xs' }}
                                />
                                <NumberBox
                                    value={line.secQuantity ?? 1}
                                    min={1}
                                    step={1}
                                    showSpinButtons
                                    stylingMode="filled"
                                    height={28}
                                    hint={
                                        line.secUomName
                                            ? `Piezas (${line.secUomName})`
                                            : 'Piezas'
                                    }
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            secQuantity: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                                <NumberBox
                                    value={line.quantity}
                                    min={0.0001}
                                    step={0.01}
                                    format="#,##0.####"
                                    stylingMode="filled"
                                    height={28}
                                    hint={
                                        line.productUomName
                                            ? `Kg facturables (${line.productUomName})`
                                            : 'Kg facturables'
                                    }
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            quantity: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                                <NumberBox
                                    value={line.unitPrice}
                                    min={0}
                                    format="#,##0.00"
                                    stylingMode="filled"
                                    height={28}
                                    hint="Precio por UoM de facturación"
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            unitPrice: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                                <NumberBox
                                    value={line.discountPct}
                                    min={0}
                                    max={100}
                                    format="#0'%'"
                                    stylingMode="filled"
                                    height={28}
                                    hint="Corregir descuento de la línea"
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            discountPct: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-[minmax(0,1.4fr)_64px_78px_58px] gap-1 items-center">
                                <SelectBox
                                    dataSource={pricelistOptions}
                                    valueExpr="id"
                                    displayExpr="label"
                                    value={line.pricelistId}
                                    onValueChanged={(e) =>
                                        onChangeLinePricelist(
                                            line.key,
                                            line.itemId,
                                            e.value || null
                                        )
                                    }
                                    placeholder="Lista"
                                    searchEnabled
                                    showClearButton
                                    stylingMode="filled"
                                    height={28}
                                    elementAttr={{ class: 'rounded-dx text-xs' }}
                                />
                                <NumberBox
                                    value={line.quantity}
                                    min={1}
                                    step={1}
                                    showSpinButtons
                                    stylingMode="filled"
                                    height={28}
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            quantity: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                                <NumberBox
                                    value={line.unitPrice}
                                    min={0}
                                    format="#,##0.00"
                                    stylingMode="filled"
                                    height={28}
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            unitPrice: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                                <NumberBox
                                    value={line.discountPct}
                                    min={0}
                                    max={100}
                                    format="#0'%'"
                                    stylingMode="filled"
                                    height={28}
                                    hint="Corregir descuento de la línea"
                                    onValueChanged={(e) =>
                                        onUpdateLine(line.key, {
                                            discountPct: Number(e.value) || 0,
                                        })
                                    }
                                    elementAttr={{ class: 'rounded-dx' }}
                                />
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div className="px-2.5 py-2 border-t border-main/10 shrink-0 flex flex-col gap-2 bg-primary-500/50">
                <div className="flex items-center justify-between text-xs">
                    <span className="text-main/70">Subtotal</span>
                    <span className="font-medium text-main">
                        {currencyFmt.format(cartSubtotal)}
                    </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                    <NumberBox
                        value={orderDiscountPct}
                        min={0}
                        max={100}
                        format="#0.##'%'"
                        stylingMode="filled"
                        height={30}
                        disabled={!cart.length}
                        placeholder="Dto %"
                        onValueChanged={(e) => {
                            const pct = clampPct(Number(e.value) || 0);
                            onOrderDiscountPctChange(pct);
                            onOrderDiscountAmountChange(
                                Number(((cartSubtotal * pct) / 100).toFixed(2))
                            );
                        }}
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                    <NumberBox
                        value={orderDiscountAmount}
                        min={0}
                        max={cartSubtotal || undefined}
                        format="#,##0.00"
                        stylingMode="filled"
                        height={30}
                        disabled={!cart.length}
                        placeholder="Dto $"
                        onValueChanged={(e) => {
                            const amount = Math.max(0, Number(e.value) || 0);
                            onOrderDiscountAmountChange(amount);
                            onOrderDiscountPctChange(
                                cartSubtotal > 0
                                    ? clampPct((amount / cartSubtotal) * 100)
                                    : 0
                            );
                        }}
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>

                {effectiveOrderDiscount > 0 && (
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-main/70">Descuento</span>
                        <span className="font-medium text-focus-400">
                            −{currencyFmt.format(effectiveOrderDiscount)}
                        </span>
                    </div>
                )}

                <div className="flex items-end justify-between">
                    <span className="text-sm text-main/70">Total</span>
                    <span className="text-xl font-bold text-main tracking-tight">
                        {currencyFmt.format(cartTotal)}
                    </span>
                </div>
                <Button
                    text={submitting ? 'Registrando...' : 'Confirmar venta'}
                    icon="check"
                    type="default"
                    stylingMode="contained"
                    height={38}
                    disabled={
                        submitting || !customerId || !cart.length || !canModify
                    }
                    onClick={onConfirm}
                    elementAttr={{ class: 'rounded-dx font-semibold' }}
                />
                <Button
                    text="Ver pedidos"
                    icon="orderedlist"
                    stylingMode="text"
                    height={30}
                    onClick={() => {
                        window.open('/priceLists/saleOrders', '_blank');
                    }}
                />
            </div>
        </section>
    );
};

export default PosCartPanel;

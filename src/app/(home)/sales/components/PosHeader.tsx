'use client';

import type { IFCustomerFull, IFOptionItem } from '@repo/api-contracts/erp';
import { SelectBox } from '@repo/devextreme';
import DateBox from 'devextreme-react/date-box';
import type { PosOrderDestination } from '../types';
import { formatMissingList, startOfToday } from '../utils';

type PosHeaderProps = {
    customersStore: unknown;
    customerId: string | null;
    customerLabel: string;
    customerFull: IFCustomerFull | null;
    addressId: string | null;
    onCustomerChange: (id: string | null, label: string) => void;
    pricelistOptions: IFOptionItem[];
    defaultPricelistId: string | null;
    onPricelistChange: (id: string | null) => void;
    orderDestination: PosOrderDestination;
    onOrderDestinationChange: (value: PosOrderDestination) => void;
    deliveryDate: Date | null;
    onDeliveryDateChange: (value: Date | null) => void;
    canStartSale: boolean;
    missingSaleSetup: string[];
};

const PosHeader = ({
    customersStore,
    customerId,
    customerLabel,
    customerFull,
    addressId,
    onCustomerChange,
    pricelistOptions,
    defaultPricelistId,
    onPricelistChange,
    orderDestination,
    onOrderDestinationChange,
    deliveryDate,
    onDeliveryDateChange,
    canStartSale,
    missingSaleSetup,
}: PosHeaderProps) => {
    return (
        <>
            <div
                className={`grid grid-cols-1 gap-3 shrink-0 ${
                    orderDestination === 'reparto'
                        ? 'lg:grid-cols-4'
                        : 'lg:grid-cols-3'
                }`}
            >
                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-main/70">
                        Cliente <span className="text-focus-400">*</span>
                    </label>
                    <SelectBox
                        dataSource={customersStore}
                        valueExpr="id"
                        displayExpr="label"
                        value={customerId}
                        onValueChanged={(e) => {
                            const item = e.component.option(
                                'selectedItem'
                            ) as IFOptionItem | null;
                            onCustomerChange(e.value || null, item?.label || '');
                        }}
                        placeholder="Seleccioná un cliente..."
                        searchEnabled
                        searchExpr={['label', 'code']}
                        showClearButton
                        stylingMode="filled"
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                    {customerLabel && customerFull && (
                        <p className="text-[11px] text-main/55 truncate">
                            {customerFull.addresses?.length
                                ? `${customerFull.addresses.length} dirección(es)`
                                : 'Sin direcciones'}
                            {addressId ? ' · dirección de venta lista' : ''}
                        </p>
                    )}
                </div>

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-main/70">
                        Lista de precios (sugerida){' '}
                        <span className="text-focus-400">*</span>
                    </label>
                    <SelectBox
                        dataSource={pricelistOptions}
                        valueExpr="id"
                        displayExpr="label"
                        value={defaultPricelistId}
                        onValueChanged={(e) => onPricelistChange(e.value || null)}
                        placeholder="Seleccioná una lista de precios..."
                        searchEnabled
                        searchExpr={['label', 'code']}
                        showClearButton
                        stylingMode="filled"
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>

                {orderDestination === 'reparto' && (
                    <div className="flex flex-col gap-1">
                        <label className="text-xs font-medium text-main/70">
                            Fecha de entrega <span className="text-focus-400">*</span>
                        </label>
                        <DateBox
                            type="date"
                            value={deliveryDate}
                            onValueChanged={(e) =>
                                onDeliveryDateChange(
                                    e.value ? new Date(e.value) : null
                                )
                            }
                            displayFormat="dd/MM/yyyy"
                            dateSerializationFormat="yyyy-MM-dd"
                            openOnFieldClick
                            useMaskBehavior
                            stylingMode="filled"
                            elementAttr={{ class: 'rounded-dx' }}
                            placeholder="Seleccioná fecha..."
                        />
                    </div>
                )}

                <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-main/70">
                        Destino del pedido <span className="text-focus-400">*</span>
                    </label>
                    <div className="inline-flex w-full rounded-dx border border-main/15 overflow-hidden h-[36px]">
                        <button
                            type="button"
                            onClick={() => {
                                onOrderDestinationChange('reparto');
                                if (!deliveryDate) {
                                    onDeliveryDateChange(startOfToday());
                                }
                            }}
                            className={`flex-1 px-2 text-xs font-medium transition-colors ${
                                orderDestination === 'reparto'
                                    ? 'bg-focus-500/20 text-main'
                                    : 'text-main/60 hover:bg-main/10'
                            }`}
                            title="Para preparar / reparto"
                        >
                            Reparto
                        </button>
                        <button
                            type="button"
                            onClick={() => onOrderDestinationChange('mostrador')}
                            className={`flex-1 px-2 text-xs font-medium transition-colors ${
                                orderDestination === 'mostrador'
                                    ? 'bg-focus-500/20 text-main'
                                    : 'text-main/60 hover:bg-main/10'
                            }`}
                            title="Retiro en mostrador (sin preparar)"
                        >
                            Retiro mostrador
                        </button>
                    </div>
                    <p className="text-[11px] text-main/45">
                        {orderDestination === 'reparto'
                            ? 'Pedido para preparar / reparto'
                            : 'Retiro en mostrador (venta sin preparar)'}
                    </p>
                </div>
            </div>

            {!canStartSale && (
                <div className="shrink-0 px-3 py-2 rounded-dx border border-focus-500/30 bg-focus-500/10 text-sm text-main">
                    Para empezar la venta completá{' '}
                    <span className="font-semibold">
                        {formatMissingList(missingSaleSetup)}
                    </span>
                    .
                </div>
            )}
        </>
    );
};

export default PosHeader;

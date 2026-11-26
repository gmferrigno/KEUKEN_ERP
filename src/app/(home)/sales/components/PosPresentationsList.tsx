'use client';

import type { IFItem, IFPresentation } from '@repo/api-contracts/erp';
import PosCartQtyBadge from './PosCartQtyBadge';

type PosPresentationsListProps = {
    item: IFItem;
    presentations: IFPresentation[];
    cartQtyByPresentationId: Map<string, number>;
    onSelect: (presentation: IFPresentation) => void;
    onBack?: () => void;
    showBack?: boolean;
};

const PosPresentationsList = ({
    item,
    presentations,
    cartQtyByPresentationId,
    onSelect,
    onBack,
    showBack = false,
}: PosPresentationsListProps) => {
    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-main">
                    Presentaciones de{' '}
                    <span className="text-focus-400">
                        {item.sku || item.itemName}
                    </span>
                </div>
                {showBack && onBack && (
                    <button
                        type="button"
                        className="text-xs text-main/60 hover:text-main px-2 py-1 rounded hover:bg-main/10"
                        onClick={onBack}
                    >
                        Volver
                    </button>
                )}
            </div>
            <div className="flex flex-col gap-1.5">
                {presentations.map((pres) => {
                    const inCartQty = cartQtyByPresentationId.get(pres.id) || 0;
                    return (
                        <button
                            key={pres.id}
                            type="button"
                            onClick={() => onSelect(pres)}
                            className="relative text-left px-3 py-2 rounded-dx border border-main/10 bg-variant/40 hover:bg-focus-500/10 hover:border-focus-500/30 transition-colors"
                        >
                            <PosCartQtyBadge qty={inCartQty} />
                            <div className="flex items-center justify-between gap-2 pr-6">
                                <div className="min-w-0">
                                    <div className="text-sm font-semibold text-main truncate">
                                        {pres.name}
                                    </div>
                                    <div className="text-[11px] text-main/55 truncate">
                                        {[
                                            pres.barcode
                                                ? `Barras: ${pres.barcode}`
                                                : null,
                                            pres.uomName
                                                ? `UdM: ${pres.uomName}`
                                                : null,
                                            pres.packagingLevelName ||
                                                pres.packagingLevelCode,
                                        ]
                                            .filter(Boolean)
                                            .join(' · ')}
                                    </div>
                                </div>
                                <i className="dx-icon dx-icon-plus text-main/60" />
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default PosPresentationsList;

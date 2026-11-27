'use client';

import { IFPriceListItem } from "@repo/api-contracts/erp";
import { CheckBox } from 'devextreme-react';

interface ItemCriteriaProps {
    item: IFPriceListItem;
    isEnabled: boolean;
    onToggle: (itemId: string, enabled: boolean) => void;
}

export default function ItemCriteria({ item, isEnabled, onToggle }: ItemCriteriaProps) {
    return (
        <div
            className={`flex items-center gap-x-4 p-3 rounded-dx border transition-all duration-200
                ${isEnabled
                    ? 'bg-primary-900/50 border-main/10 shadow-sm'
                    : 'bg-primary-950/20 border-main/5 opacity-50'
                }`}
        >

            <div className="flex-shrink-0">
                <CheckBox
                    value={isEnabled}
                    onValueChanged={(e) => onToggle(item.itemId, !!e.value)}
                    className="cursor-pointer"
                />
            </div>


            <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-main text-sm truncate">
                    {item.productDescription || item.productCode || item.itemId}
                </h4>
            </div>
        </div>
    );
}

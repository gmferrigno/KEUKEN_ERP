'use client';

import type { IFCategory } from '@repo/api-contracts/erp';
import { SelectBox } from '@repo/devextreme';

type PosCategoryFilterProps = {
    categories: IFCategory[];
    value: string | null;
    onChange: (categoryId: string | null) => void;
    disabled?: boolean;
    loading?: boolean;
};

const PosCategoryFilter = ({
    categories,
    value,
    onChange,
    disabled = false,
    loading = false,
}: PosCategoryFilterProps) => {
    return (
        <div className="flex flex-col gap-1 min-w-0">
            <label className="text-[10px] uppercase tracking-wide text-main/45">
                Categoría
            </label>
            <SelectBox
                dataSource={categories}
                valueExpr="id"
                displayExpr={(item: IFCategory | null) => {
                    if (!item) return '';
                    return item.code ? `${item.code} — ${item.name}` : item.name;
                }}
                value={value}
                onValueChanged={(e) => onChange(e.value || null)}
                placeholder={loading ? 'Cargando categorías...' : 'Todas las categorías'}
                searchEnabled
                searchExpr={['name', 'code']}
                showClearButton
                stylingMode="filled"
                disabled={disabled || loading}
                elementAttr={{ class: 'rounded-dx' }}
            />
        </div>
    );
};

export default PosCategoryFilter;

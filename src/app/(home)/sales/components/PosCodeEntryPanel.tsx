'use client';

import type { IFItem, IFPresentation } from '@repo/api-contracts/erp';
import { Button } from '@repo/devextreme';
import NumberBox from 'devextreme-react/number-box';
import TextBox from 'devextreme-react/text-box';
import type { RefObject } from 'react';
import type { PosCodeLookupMode } from '../types';
import { clampPct } from '../utils';
import PosPresentationsList from './PosPresentationsList';

type PosCodeEntryPanelProps = {
    codeLookupMode: PosCodeLookupMode;
    onCodeLookupModeChange: (mode: PosCodeLookupMode) => void;
    codeInput: string;
    onCodeInputChange: (value: string) => void;
    codeInputRef: RefObject<any>;
    codeQty: number;
    onCodeQtyChange: (value: number) => void;
    entryDiscountPct: number;
    onEntryDiscountPctChange: (value: number) => void;
    codeSearching: boolean;
    canStartSale: boolean;
    onSearch: () => void;
    pendingItem: IFItem | null;
    pendingPresentations: IFPresentation[];
    cartQtyByPresentationId: Map<string, number>;
    onSelectPresentation: (presentation: IFPresentation) => void;
    onClearPending: () => void;
};

const PosCodeEntryPanel = ({
    codeLookupMode,
    onCodeLookupModeChange,
    codeInput,
    onCodeInputChange,
    codeInputRef,
    codeQty,
    onCodeQtyChange,
    entryDiscountPct,
    onEntryDiscountPctChange,
    codeSearching,
    canStartSale,
    onSearch,
    pendingItem,
    pendingPresentations,
    cartQtyByPresentationId,
    onSelectPresentation,
    onClearPending,
}: PosCodeEntryPanelProps) => {
    return (
        <div className="flex-1 min-h-0 overflow-y-auto p-3 flex flex-col gap-3">
            <div className="inline-flex self-start rounded-dx border border-main/15 overflow-hidden">
                <button
                    type="button"
                    onClick={() => {
                        onCodeLookupModeChange('item');
                        onClearPending();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        codeLookupMode === 'item'
                            ? 'bg-focus-500/20 text-main'
                            : 'text-main/60 hover:bg-main/10'
                    }`}
                >
                    Código ítem
                </button>
                <button
                    type="button"
                    onClick={() => {
                        onCodeLookupModeChange('barcode');
                        onClearPending();
                    }}
                    className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        codeLookupMode === 'barcode'
                            ? 'bg-focus-500/20 text-main'
                            : 'text-main/60 hover:bg-main/10'
                    }`}
                >
                    Código barras
                </button>
            </div>

            <div className="grid grid-cols-[1fr_90px_84px_auto] gap-2 items-end">
                <div className="flex flex-col gap-1">
                    <label className="text-[10px] uppercase tracking-wide text-main/45">
                        {codeLookupMode === 'barcode'
                            ? 'Código de barras'
                            : 'Código de ítem (SKU)'}
                    </label>
                    <TextBox
                        ref={codeInputRef}
                        value={codeInput}
                        valueChangeEvent="input"
                        onValueChanged={(e) => onCodeInputChange(e.value || '')}
                        placeholder={
                            codeLookupMode === 'barcode'
                                ? 'Escaneá o ingresá el código de barras'
                                : 'Ingresá el SKU del ítem'
                        }
                        stylingMode="filled"
                        onEnterKey={onSearch}
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        className="text-[10px] uppercase tracking-wide text-main/45"
                        title="En catch-weight son piezas; el kg teórico se deriva del ratio"
                    >
                        Cant. / piezas
                    </label>
                    <NumberBox
                        value={codeQty}
                        min={1}
                        step={1}
                        showSpinButtons
                        stylingMode="filled"
                        valueChangeEvent="input"
                        onValueChanged={(e) =>
                            onCodeQtyChange(Math.max(1, Number(e.value) || 1))
                        }
                        onEnterKey={onSearch}
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>
                <div className="flex flex-col gap-1">
                    <label
                        className="text-[10px] uppercase tracking-wide text-main/45"
                        title="Se aplica al agregar; en el carrito se puede corregir"
                    >
                        Dto %
                    </label>
                    <NumberBox
                        value={entryDiscountPct}
                        min={0}
                        max={100}
                        format="#0.##'%'"
                        stylingMode="filled"
                        valueChangeEvent="input"
                        onValueChanged={(e) =>
                            onEntryDiscountPctChange(
                                clampPct(Number(e.value) || 0)
                            )
                        }
                        onEnterKey={onSearch}
                        elementAttr={{ class: 'rounded-dx' }}
                    />
                </div>
                <Button
                    text={codeSearching ? '...' : 'Agregar'}
                    icon="search"
                    type="default"
                    stylingMode="contained"
                    height={36}
                    disabled={
                        codeSearching || !codeInput.trim() || !canStartSale
                    }
                    onClick={onSearch}
                />
            </div>

            <p className="text-[11px] text-main/50">
                {codeLookupMode === 'barcode'
                    ? 'Busca la presentación por código de barras y la agrega con el dto indicado.'
                    : 'Busca el ítem por SKU, aplica el dto al agregar y elige presentación si hay varias.'}
            </p>

            {pendingItem && pendingPresentations.length > 0 && (
                <PosPresentationsList
                    item={pendingItem}
                    presentations={pendingPresentations}
                    cartQtyByPresentationId={cartQtyByPresentationId}
                    onSelect={onSelectPresentation}
                />
            )}
        </div>
    );
};

export default PosCodeEntryPanel;

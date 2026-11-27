'use client';

import { NumberBox, Switch, TextBox, Validator } from "devextreme-react";
import { SelectBox } from "@repo/devextreme";
import { RequiredRule } from "devextreme-react/validator";
import { useEffect } from "react";


const lettersToIndex = (letters: string): number => {
    let result = 0;
    const str = letters.toUpperCase().replace(/[^A-Z]/g, '');
    for (let i = 0; i < str.length; i++) {
        result = result * 26 + (str.charCodeAt(i) - 64);
    }
    return result;
};

const indexToLetters = (index: number): string => {
    let result = "";
    let n = index;
    while (n > 0) {
        let remainder = (n - 1) % 26;
        result = String.fromCharCode(65 + remainder) + result;
        n = Math.floor((n - 1) / 26);
    }
    return result;
};

const calculateNomenclature = (from: string, count: number, format: 'N' | 'A') => {
    if (format === 'N') {
        const start = from === "" ? 1 : (parseInt(from) || 0);
        const end = start + (count > 0 ? count - 1 : 0);
        return {
            from: start.toString(),
            to: end.toString()
        };
    } else {
        const startIdx = lettersToIndex(from) || 1;
        const endIdx = startIdx + (count > 0 ? count - 1 : 0);
        const startRaw = indexToLetters(startIdx);
        const endRaw = indexToLetters(endIdx);
        const maxLen = Math.max(startRaw.length, endRaw.length);

        return {
            from: startRaw.padStart(maxLen, 'A'),
            to: endRaw.padStart(maxLen, 'A')
        };
    }
};

interface ICreationItemProps {
    formData: any;
    updateFormData?: (data: any) => void;
    onDelete?: () => void;
    isLast?: boolean;
}

const CreationItem = ({ formData, updateFormData, onDelete, isLast }: ICreationItemProps) => {
    const isStorage = formData.usage === 'internal';
    const range = calculateNomenclature(formData.unitFrom || "1", formData.unitCount || 1, formData.format || "N");

    useEffect(() => {
        if (formData.unitTo !== range.to) {
            updateFormData?.({
                unitTo: range.to,
                unitFromFormatted: range.from
            });
        }
    }, [range.to, range.from, formData.unitTo, updateFormData]);

    const handleFromChange = (e: any) => {
        const value = e.event?.target.value || "";
        const format = formData.format || 'N';

        let filtered = value;
        if (format === 'N') {
            filtered = value.replace(/[^0-9]/g, '');
        } else {
            filtered = value.replace(/[^a-zA-Z]/g, '').toUpperCase();
        }

        if (filtered !== value) {
            e.component.option('value', filtered);
        }
        updateFormData?.({ unitFrom: filtered });
    };

    const toStr = String(range.to);
    const fromVal = formData.unitFrom || 1;

    return (
        <div className={`
            p-6 rounded-dx border transition-all duration-500 flex flex-col gap-6 relative group/item
            bg-primary-900/40 border-main/5
            ${isStorage ? 'ring-1 ring-focus-500/30 border-focus-500/20 shadow-[0_8px_30px_-10px_rgba(65,113,191,0.2)]' : ''}
        `}>
            {onDelete && (
                <button
                    onClick={onDelete}
                    className="absolute -right-2 -top-2 size-8 bg-red-500/80 rounded-full flex items-center justify-center opacity-0 group-hover/item:opacity-100 transition-all hover:bg-red-600 shadow-lg z-10 active:scale-95"
                >
                    <i className="dx-icon-trash text-variant!"></i>
                </button>
            )}

            <div className="flex flex-col md:flex-row md:items-center justify-between items-start gap-3">
                <div className="flex-1 w-full">
                    <TextBox
                        label="Nombre de la Unidad"
                        labelMode="outside"
                        value={formData.title}
                        onValueChanged={(e) => updateFormData?.({ title: e.value })}
                        valueChangeEvent="blur"
                        stylingMode="filled"
                        placeholder="Ej: Estantería Principal A1"
                        elementAttr={{
                            class: "!bg-main/5 !rounded-dx"
                        }}
                    >
                        <Validator>
                            <RequiredRule message="El nombre es obligatorio" />
                        </Validator>
                    </TextBox>
                </div>

                    <SelectBox
                        label="Uso"
                        labelMode="outside"
                        className="w-full md:w-[180px]"
                        items={[
                            { id: 'internal', text: 'Almacén' },
                            { id: 'view', text: 'Contenedor' }
                        ]}
                        dropDownOptions={{
                            wrapperAttr: {
                                class: "popup-menu-container"
                            }
                        }}
                        displayExpr="text"
                        valueExpr="id"
                        value={formData.usage || 'view'}
                        disabled={!isLast}
                        onValueChanged={(e) => updateFormData?.({ usage: e.value })}
                        stylingMode="filled"
                        elementAttr={{
                            class: `!bg-main/5 !rounded-dx ${!isLast ? 'opacity-50' : ''}`
                        }}
                    />
            </div>


            <div className="flex flex-col gap-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="col-span-1">
                        <NumberBox
                            label="Cantidad"
                            labelMode="outside"
                            value={formData.unitCount}
                            onValueChanged={(e) => updateFormData?.({ unitCount: e.value })}
                            min={1}
                            valueChangeEvent="keyup"
                            stylingMode="filled"
                            elementAttr={{
                                class: "!bg-main/5 !rounded-dx"
                            }}
                        />
                    </div>

                    <div className="col-span-1">
                        <TextBox
                            label="Desde"
                            labelMode="outside"
                            value={formData.unitFrom}
                            onInput={handleFromChange}
                            valueChangeEvent="input"
                            stylingMode="filled"
                            elementAttr={{
                                class: "!bg-main/5 !rounded-dx"
                            }}
                        />
                    </div>

                    <div className="col-span-1">
                        <TextBox
                            label="Hasta"
                            labelMode="outside"
                            value={range.to}
                            readOnly={true}
                            stylingMode="filled"
                            valueChangeEvent="keyup"
                            elementAttr={{
                                class: "!bg-main/5 !rounded-dx !border-main/10 opacity-40"
                            }}
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="col-span-1">
                        <SelectBox
                            label="Formato"
                            labelMode="outside"
                            items={[
                                { id: 'N', text: '1, 2, 3' },
                                { id: 'A', text: 'A, B, C' }
                            ]}
                            dropDownOptions={{
                                wrapperAttr: {
                                    class: "popup-menu-container"
                                }
                            }}
                            displayExpr="text"
                            valueExpr="id"
                            value={formData.format || 'N'}
                            onValueChanged={(e) => {
                                const newFormat = e.value;
                                updateFormData?.({
                                    format: newFormat,
                                    unitFrom: newFormat === 'N' ? '1' : 'A',
                                    padding: newFormat === 'N' ? 0 : undefined
                                });
                            }}
                            stylingMode="filled"
                            elementAttr={{
                                class: "!bg-main/5 !rounded-dx"
                            }}
                        />
                    </div>

                    {formData.format === 'N' && (
                        <div className="col-span-1 animate-in fade-in zoom-in-95 duration-300">
                            <SelectBox
                                label="Relleno"
                                labelMode="outside"
                                items={[
                                    { id: 0, text: `Sin relleno` },
                                    { id: 1, text: `${String(fromVal).padStart(toStr.length, '0')} - ${toStr.padStart(toStr.length, '0')}` },
                                    { id: 2, text: `${String(fromVal).padStart(toStr.length + 1, '0')} - ${toStr.padStart(toStr.length + 1, '0')}` },
                                    { id: 3, text: `${String(fromVal).padStart(toStr.length + 2, '0')} - ${toStr.padStart(toStr.length + 2, '0')}` },
                                    { id: 4, text: `${String(fromVal).padStart(toStr.length + 3, '0')} - ${toStr.padStart(toStr.length + 3, '0')}` },
                                ]}
                                dropDownOptions={{
                                    wrapperAttr: {
                                        class: "popup-menu-container"
                                    }
                                }}
                                valueExpr="id"
                                displayExpr="text"
                                value={formData.padding ?? 0}
                                onValueChanged={(e) => updateFormData?.({ padding: e.value })}
                                stylingMode="filled"
                                elementAttr={{
                                    class: "!bg-main/5 !rounded-dx"
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {isStorage &&
                <div className={`
                grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-main/5 transition-all duration-500
                ${isStorage ? 'opacity-100' : 'opacity-10 pointer-events-none grayscale brightness-50'}
            `}>
                    <div className="p-4 bg-primary-950/20 rounded-dx border border-main/5 relative group/storage">
                        <NumberBox
                            label="m³ por Unidad"
                            labelMode="outside"
                            value={formData.capacityVolume}
                            onValueChanged={(e) => updateFormData?.({ capacityVolume: e.value })}
                            min={0.01}
                            step={0.1}
                            format="#,##0.00 m³"
                            stylingMode="filled"
                            elementAttr={{ class: '!bg-focus-500/5 !rounded-dx !border-focus-500/10 text-focus-100 font-bold' }}
                        >
                            <Validator>
                                <RequiredRule message="La capacidad es obligatoria" />
                            </Validator>
                        </NumberBox>
                        {isStorage && (
                            <div className="absolute right-4 top-4">
                                <div className="size-1.5 bg-focus-500 rounded-full shadow-[0_0_8px_var(--focus-500)] animate-pulse"></div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-primary-950/20 rounded-dx border border-main/5">
                        <div className="relative">
                            <NumberBox
                                label="Capacidad total del grupo"
                                labelMode="outside"
                                value={Number(((formData.unitCount || 0) * (formData.capacityVolume || 0)).toFixed(2))}
                                readOnly={true}
                                format="#,##0.00 m³"
                                stylingMode="filled"
                                elementAttr={{ class: 'opacity-60 !bg-primary-950/40 !rounded-dx !border-none font-bold' }}
                            />
                        </div>
                    </div>
                </div>
            }
            {isStorage &&
                <div className={`
                grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-main/5 transition-all duration-500
                ${isStorage ? 'opacity-100' : 'opacity-10 pointer-events-none grayscale brightness-50'}
            `}>
                    <div className="p-4 bg-primary-950/20 rounded-dx border border-main/5 relative group/storage">
                        <NumberBox
                            label="Peso por Unidad"
                            labelMode="outside"
                            value={formData.capacityWeight}
                            onValueChanged={(e) => updateFormData?.({ capacityWeight: e.value })}
                            min={0.01}
                            step={0.1}
                            format="#,##0.00 kg"
                            stylingMode="filled"
                            elementAttr={{ class: '!bg-focus-500/5 !rounded-dx !border-focus-500/10 text-focus-100 font-bold' }}
                        >
                            <Validator>
                                <RequiredRule message="La capacidad es obligatoria" />
                            </Validator>
                        </NumberBox>
                        {isStorage && (
                            <div className="absolute right-4 top-4">
                                <div className="size-1.5 bg-focus-500 rounded-full shadow-[0_0_8px_var(--focus-500)] animate-pulse"></div>
                            </div>
                        )}
                    </div>

                    <div className="p-4 bg-primary-950/20 rounded-dx border border-main/5">
                        <div className="relative">
                            <NumberBox
                                label="Peso total del grupo"
                                labelMode="outside"
                                value={Number(((formData.unitCount || 0) * (formData.capacityWeight || 0)).toFixed(2))}
                                readOnly={true}
                                format="#,##0.00 kg"
                                stylingMode="filled"
                                elementAttr={{ class: 'opacity-60 !bg-primary-950/40 !rounded-dx !border-none font-bold' }}
                            />
                        </div>
                    </div>
                </div>
            }

            <div className={`
                h-1 w-full rounded-full transition-all duration-700
                ${isStorage ? 'bg-linear-to-r from-transparent via-focus-500/40 to-transparent' : 'bg-main/5'}
            `}></div>
        </div>
    );
};

export default CreationItem;

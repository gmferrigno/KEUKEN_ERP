'use client';

import { PATTERNS } from "@/app/lib/constants/gridMap.constants";
import { useGridMapContext } from "@/contexts/GridMapContext";
import { NumberBox } from "devextreme-react";
import { useEffect, useState } from "react";
import SubdivisionGrid from "../components/SubdivisionGrid";

const InternalStructure = () => {
    const { setActiveAction, selectedElementId, selectedElementIds, internalStructures, setInternalStructures } = useGridMapContext();
    const effectiveSelectedId = selectedElementId || (selectedElementIds.length === 1 ? selectedElementIds[0] : null);
    const [activePattern, setActivePattern] = useState(0);
    const [iRows, setIRows] = useState(1);
    const [iCols, setICols] = useState(1);

    useEffect(() => {
        if (effectiveSelectedId) {
            const config = internalStructures?.[effectiveSelectedId];
            if (config) {
                setActivePattern(config.pattern);
                setIRows(config.rows);
                setICols(config.cols);
            } else {
                setActivePattern(0);
                setIRows(1);
                setICols(1);
            }
        }
    }, [effectiveSelectedId]);

    const handleConfirm = () => {
        if (effectiveSelectedId) {
            setInternalStructures((prev) => ({
                ...prev,
                [effectiveSelectedId]: {
                    rows: iRows,
                    cols: iCols,
                    pattern: activePattern
                }
            }));
        }
        setActiveAction('select');
    };

    return (
        <div className="flex flex-col gap-4 p-3 bg-primary-900/40 rounded-dx border border-main/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="flex justify-between items-center mb-1">
                <p className="text-sm text-main/30 uppercase font-bold tracking-widest pl-1">Estructura Interna</p>
            </div>

            {}
            <div className="grid grid-cols-2 gap-2">
                <NumberBox
                    label="Filas"
                    stylingMode="filled"
                    value={iRows}
                    min={1}
                    max={10}
                    showSpinButtons={true}
                    onValueChange={(val) => { setIRows(val || 1); }}
                />
                <NumberBox
                    label="Columnas"
                    stylingMode="filled"
                    value={iCols}
                    min={1}
                    max={10}
                    showSpinButtons={true}
                    onValueChange={(val) => { setICols(val || 1); }}
                />
            </div>

            <SubdivisionGrid rows={iRows} cols={iCols} />

            {}
            <div className="flex flex-col gap-2">
                <p className="text-sm text-main/30 uppercase font-bold tracking-widest pl-1">Patrón de Recolección</p>
                <div className="grid grid-cols-5 gap-1 bg-primary-900/40 p-1 rounded-dx border border-main/5">
                    {PATTERNS.map((pattern, idx) => (
                        <button
                            key={pattern.id}
                            onClick={() => setActivePattern(idx)}
                            className={`h-10 rounded-dx flex items-center justify-center transition-all ${activePattern === idx ? 'bg-focus-500 text-variant shadow-lg shadow-focus-500/20' : 'text-main/20 hover:bg-main/5 hover:text-main/40'}`}
                        >
                            <p className="text-lg text-variant">{pattern.icon}</p>
                        </button>
                    ))}
                </div>
            </div>

            <p className="text-xs text-main/20 italic px-1 leading-tight text-center">
                Configura divisiones lógicas y el flujo de picking para <span className="text-main/40">{effectiveSelectedId?.split('-')[0]}</span>.
            </p>

            <div className="flex gap-2">
                <button onClick={() => setActiveAction('select')} className="w-full py-2.5 bg-primary-800/50 hover:bg-primary-700/50 text-main/70 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-sm uppercase border border-main/5">
                    <i className="dx-icon-close text-main"></i> Cancelar
                </button>
                <button onClick={handleConfirm} className="w-full py-2.5 bg-focus-500 hover:bg-focus-400 text-main rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-sm uppercase shadow-lg shadow-focus-500/20">
                    <i className="dx-icon-chec text-variant "></i> Confirmar
                </button>
            </div>
        </div>
    );
};

export default InternalStructure;

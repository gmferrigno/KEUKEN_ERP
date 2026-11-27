'use client';

import { PATTERNS } from "@/app/lib/constants/gridMap.constants";
import { useGridMap } from "@/app/lib/hooks/useGridMap";
import { IZone } from "@/types/gridMap.types";
import { useGridMapContext } from "@/contexts/GridMapContext";
import { useEffect, useState } from "react";
import SubdivisionGrid from "../components/SubdivisionGrid";
import InternalStructure from "./internalStructure";

const SelectMenu = ({ clearZones, onRotate }: { clearZones: (id?: string) => void, onRotate: (direction?: 'cw' | 'ccw') => void }) => {
    const {
        selectedElementId,
        selectedElementIds,
        setSelectedElementIds,
        zonesByLevel,
        currentLevel,
        setActiveAction,
        activeAction,
        internalStructures,
        setZonesByLevel,
        rotation
    } = useGridMapContext();
    const { getElementById } = useGridMap({ canvaSize: 0, setPendingStructure: () => { } });
    const effectiveSelectedId = selectedElementId || (selectedElementIds.length === 1 ? selectedElementIds[0] : null);
    const selectedElement = effectiveSelectedId ? getElementById(effectiveSelectedId) : undefined;
    const isUnidad = selectedElement?.type === 'Unidad';
    const isGrupo = selectedElement?.type === 'Grupo';
    const isArea = selectedElement?.type === 'Area';
    const config = effectiveSelectedId ? internalStructures?.[effectiveSelectedId] : null;
    const iRows = config?.rows || 1;
    const iCols = config?.cols || 1;

    const [isEditingName, setIsEditingName] = useState(false);
    const [editNameValue, setEditNameValue] = useState("");

    useEffect(() => {
        if (selectedElement) {
            setEditNameValue(selectedElement.name || "");
            setIsEditingName(false);
        }
    }, [selectedElement]);

    const handleUpdateZone = (updates: Partial<IZone>) => {
        if (!effectiveSelectedId) return;
        const newZones = [...(zonesByLevel[currentLevel] || [])];
        const idx = newZones.findIndex(z => z.id === effectiveSelectedId);
        if (idx !== -1) {
            newZones[idx] = { ...newZones[idx], ...updates };
            setZonesByLevel({ ...zonesByLevel, [currentLevel]: newZones });
        }
    };

    if (activeAction === 'internal_structure') {
        return <InternalStructure />;
    }

    const rotationButtons = () => (
        <div className="flex gap-1 mt-1">
            <button
                onClick={() => onRotate?.('ccw')}
                title="Rotar -90°"
                className="flex-1 py-2 bg-focus-100/20 hover:bg-focus-200/40 text-variant border border-focus-300/30 rounded-dx flex items-center justify-center gap-2 transition-all font-bold"
            >
                <i className="dx-icon-refresh text-sm text-variant -scale-x-100"></i>
                -90°
            </button>
            <p className="flex-1 py-2 bg-focus-300 text-center rounded-dx text-variant">{rotation}°</p>
            <button
                onClick={() => onRotate?.('cw')}
                title="Rotar +90°"
                className="flex-1 py-2 bg-focus-100/20 hover:bg-focus-200/40 text-variant border border-focus-300/30 rounded-dx flex items-center justify-center gap-2 transition-all font-bold"
            >
                <i className="dx-icon-refresh text-sm text-variant"></i>
                +90°
            </button>
        </div>
    )

    return (
        <div className="flex flex-col gap-2 p-3 bg-primary-900/40 rounded-dx border border-main/5 animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-xs  opacity-50 pl-1">Selección Actual</p>
            {selectedElementIds.length > 1 ? (
                <div className="flex flex-col gap-3 animate-in fade-in zoom-in duration-300">
                    <div className="flex items-center gap-3 p-3 bg-focus-500/10 border border-focus-500/30 rounded-dx shadow-lg shadow-focus-500/5">
                        <div className="w-10 h-10 rounded-dx bg-focus-500/20 flex items-center justify-center border border-focus-500/20">
                            <i className="dx-icon-fields text-variant text-lg"></i>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs  text-focus-300 font-black uppercase ">Selección Múltiple</span>
                            <span className="text-sm  font-bold">{selectedElementIds.length} elementos seleccionados</span>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2 mt-1">
                        <div className="flex flex-col gap-2 p-3 bg-main/5 rounded-dx border border-main/5">
                            {rotationButtons()}
                        </div>
                        <button
                            onClick={() => {
                                selectedElementIds.forEach(id => clearZones(id));
                                setSelectedElementIds([]);
                            }}
                            className="w-full py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-500 border border-red-500/20 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-xs  uppercase "
                        >
                            <i className="dx-icon-trash"></i>
                            Eliminar ({selectedElementIds.length}) Elementos
                        </button>
                        <button
                            onClick={() => setSelectedElementIds([])}
                            className="w-full py-2 bg-main/5 hover:bg-main/10 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-xs  uppercase "
                        >
                            <i className="dx-icon-close"></i>
                            Limpiar Selección
                        </button>
                    </div>
                    <p className="text-xs  italic text-center px-1  mt-1">Has seleccionado varios elementos mediante el recuadro de selección.</p>
                </div>
            ) : effectiveSelectedId ? (
                <>
                    <div className="flex items-center gap-3 p-2 bg-focus-500/10 border border-focus-500/30 rounded-dx">
                        <div className="w-8 h-8 rounded-dx bg-focus-500/20 flex items-center justify-center">
                            <i className="dx-icon-info text-sm text-variant"></i>
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-xs  text-focus-300">Identificador</span>
                            <span className="text-xs  font-mono truncate">{effectiveSelectedId}</span>
                        </div>
                    </div>
                    {selectedElement?.path && (
                        <div className="flex items-center gap-3 p-2 bg-main/5 border border-main/10 rounded-dx">
                            <div className="w-8 h-8 rounded-dx bg-main/10 flex items-center justify-center">
                                <i className="dx-icon-map text-sm "></i>
                            </div>
                            <div className="flex flex-col overflow-hidden">
                                <span className="text-xs">Ruta</span>
                                <span className="text-xs font-mono wrap-break-word">{selectedElement.path}</span>
                            </div>
                        </div>
                    )}
                    <div className="mt-2 border-t border-main/5 pt-3 flex flex-col gap-2">
                        {isUnidad && (
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between items-center px-1">
                                    <span className="text-xs">Distribución actual ({iRows}x{iCols}) <span className="font-light">Patron {PATTERNS[config?.pattern ?? 0]?.icon}</span></span>
                                </div>
                                <SubdivisionGrid rows={iRows} cols={iCols} />
                                <button
                                    onClick={() => setActiveAction('internal_structure')}
                                    className="w-full py-2.5 bg-focus-300 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-xs  uppercase  mb-1 mt-1"
                                >
                                    <i className="dx-icon-hierarchy text-variant"></i>
                                    Editar Estructura
                                </button>
                            </div>
                        )}
                        {(isGrupo || isArea) && (
                            <>
                                {rotationButtons()}
                            </>
                        )}
                        {activeAction === 'move' && (
                            <button
                                onClick={() => setActiveAction('select')}
                                className={`w-full py-2.5 bg-focus-300 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-xs  uppercase`}
                            >
                                <i className="dx-icon-close text-variant"></i>
                                Cancelar Desplazamiento
                            </button>
                        )}
                        {}
                        {isArea && (
                            <div className="flex flex-col gap-3 p-3 bg-purple-500/10 border border-purple-500/20 rounded-dx mb-1">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs">Nombre del Área</span>
                                    {isEditingName ? (
                                        <div className="flex items-center gap-1">
                                            <input
                                                type="text"
                                                value={editNameValue}
                                                onChange={(e) => setEditNameValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') {
                                                        handleUpdateZone({ name: editNameValue });
                                                        setIsEditingName(false);
                                                    }
                                                }}
                                                className="flex-1 bg-primary-950 border border-main/10 rounded px-2 py-1.5 text-xs  outline-none focus:border-focus-500/50"
                                                autoFocus
                                            />
                                            <button onClick={() => { handleUpdateZone({ name: editNameValue }); setIsEditingName(false); }} className="w-7 h-7 bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-400 rounded flex items-center justify-center transition-colors shrink-0">
                                                <i className="dx-icon-check"></i>
                                            </button>
                                            <button onClick={() => { setEditNameValue(selectedElement?.name || ""); setIsEditingName(false); }} className="w-7 h-7 bg-red-500/20 hover:bg-red-500/40 text-red-400 rounded flex items-center justify-center transition-colors shrink-0">
                                                <i className="dx-icon-close"></i>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center justify-between bg-primary-950/50 border border-main/5 rounded px-2 py-1.5">
                                            <span className="text-xs  font-medium truncate">{selectedElement?.name || 'Sin Nombre'}</span>
                                            <button onClick={() => setIsEditingName(true)} className="w-6 h-6 rounded flex items-center justify-center transition-colors shrink-0">
                                                <i className="dx-icon-edit text-xs "></i>
                                            </button>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-xs  uppercase font-bold ">Color del Área</span>
                                    <div className="flex items-center gap-2">
                                        <div className="relative w-8 h-8 rounded overflow-hidden border border-main/20 shrink-0 cursor-pointer">
                                            <input
                                                type="color"
                                                value={selectedElement?.color || "#a855f7"}
                                                onChange={(e) => handleUpdateZone({ color: e.target.value })}
                                                className="absolute -top-2 -left-2 w-12 h-12 cursor-pointer opacity-0"
                                            />
                                            <div className="w-full h-full pointer-events-none" style={{ backgroundColor: selectedElement?.color || "#a855f7" }}></div>
                                        </div>
                                        <span className="text-xs  font-mono uppercase">{selectedElement?.color || "#A855F7"}</span>
                                    </div>
                                </div>
                            </div>
                        )}



                        <button
                            onClick={() => effectiveSelectedId && clearZones(effectiveSelectedId)}
                            className="w-full py-2.5 bg-red-500/30 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-dx flex items-center justify-center gap-2 transition-all font-bold text-xs  uppercase  mt-1"
                        >
                            <i className="dx-icon-trash"></i>
                            Eliminar Estructura
                        </button>

                        <p className="text-xs italic text-center px-1 opacity-60">Mueve el elemento o elimínalo permanentemente respetando las dependencias</p>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center py-4 gap-2 opacity-50">
                    <i className="dx-icon-cursor text-2xl"></i>
                    <p className="text-xs italic text-center px-1 opacity-60">Haz click en un elemento de la grilla para seleccionarlo</p>
                </div>
            )}
        </div>
    );
};

export default SelectMenu;
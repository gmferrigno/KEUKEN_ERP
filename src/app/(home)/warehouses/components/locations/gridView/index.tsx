'use client';

import { BASE_LEVEL, MAP_STRUCTURES } from "@/app/lib/constants/gridMap.constants";
import { useGridMap } from '@/app/lib/hooks/useGridMap';
import { cutPath, getBlueprintBatchDimensions, getMultiZoneBoundingBox, resolveZoneStyles } from "@/app/lib/utils/gridMap.helper";
import { IZone, StructureType } from "@/types/gridMap.types";
import { useGridMapContext } from "@/contexts/GridMapContext";
import notify from "devextreme/ui/notify";
import Konva from 'konva';
import { useEffect, useRef, useState } from "react";
import { Layer, Shape, Stage } from 'react-konva';
import { useLocations } from "../../../../../lib/hooks/useLocations";
import BlueprintPreview from "./components/previews/BlueprintPreview";
import MovePreview from "./components/previews/MovePreview";
import { STRUCTURE_RENDERERS } from "./components/StructureRenderers";
import FooterPanel from "./footerPanel";
import LeftPanel from "./leftPanel";
import RightPanel from "./rightPanel";

const DEFAULT_CANVA_SIZE = 40;

const Gridmap = () => {
    const {
        rows, cols,
        currentLevel, setCurrentLevel,
        selectedElementId, selectedElementIds,
        zonesByLevel,
        callesMatrix, murosMatrix, directionsMatrix,
        activeDirections, activeWalls,
        activeAction, setActiveAction, structureType,
        deleteFilters,
        exportMapData, hasUnsavedChanges, internalStructures,
        rotation, setMaxLevel,
        maxLevel,
    } = useGridMapContext();

    const {
        blueprintCatalog,
        pendingStructure, setPendingStructure,
        collapsedGroups, setCollapsedGroups,
        pendingCount,
        fetchLocations
    } = useLocations();

    const [canvaSize] = useState(DEFAULT_CANVA_SIZE);
    const [cameraZoom, setCameraZoom] = useState(1);
    const [hoveredZoneId] = useState<string | null>(null);
    const [selectionStart, setSelectionStart] = useState<{ row: number; col: number } | null>(null);
    const [selectionEnd, setSelectionEnd] = useState<{ row: number; col: number } | null>(null);
    const [isSelecting, setIsSelecting] = useState(false);
    const stageRef = useRef<any>(null);
    const [stagePos, setStagePos] = useState({ x: 50, y: 50 });
    const [moveOffset, setMoveOffset] = useState<{ r: number; c: number } | null>(null);
    const moveTimerRef = useRef<any>(null);
    const [movePreviewPos, setMovePreviewPos] = useState<{ row: number; col: number } | null>(null);
    const [blueprintPreviewPos, setBlueprintPreviewPos] = useState<{ row: number; col: number } | null>(null);
    const wasDraggingLeftRef = useRef(false);

    const levels = Array.from({ length: maxLevel - BASE_LEVEL + 1 }, (_, i) => BASE_LEVEL + i);
    const zones = zonesByLevel[currentLevel] || [];
    const { drawElement, finalizeZone, drawIcon, clearZones, clearArea, handleMove, selectElement, placeBlueprintGroup, handleRotate, rotateCoords, handleResizeCols, handleResizeRows } = useGridMap({
        canvaSize, setPendingStructure, levels,
    });

    const onRotate = (direction: 'cw' | 'ccw' = 'cw') => {
        handleRotate(direction, setMoveOffset);
    };


    useEffect(() => { Konva.dragButtons = [2]; }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Escape') return;
            if (activeAction === 'move') {
                setActiveAction('select');
                setMovePreviewPos(null);
            } else if (activeAction === 'blueprint') {
                setActiveAction('select');
                setBlueprintPreviewPos(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeAction, setActiveAction]);

    useEffect(() => {
        if (activeAction !== 'move' && activeAction !== 'blueprint') {
            setMovePreviewPos(null);
            setBlueprintPreviewPos(null);
        } else {
            handlePointerLeave();
        }
    }, [activeAction, structureType]);


    const computePreviewCenter = () => {
        const stage = stageRef.current;
        if (!stage) return null;
        const centerX = (stage.width() / 2 - stagePos.x) / cameraZoom;
        const centerY = (stage.height() / 2 - stagePos.y) / cameraZoom;
        return {
            row: Math.floor(centerY / canvaSize) + 1,
            col: Math.floor(centerX / canvaSize) + 1,
        };
    };

    const computeBlueprintOffset = (row: number, col: number) => {
        if (!pendingStructure) return { row, col };
        const { totalRows, maxCols } = getBlueprintBatchDimensions(pendingStructure, rotation);
        return { row: row - Math.floor(totalRows / 2), col: col - Math.floor(maxCols / 2) };
    };

    const handleSave = () => {
        if (!hasUnsavedChanges) {
            notify({ message: "Sin cambios pendientes", type: "info", displayTime: 2000, width: 'auto', position: 'bottom center' });
            return;
        }
        exportMapData();
        notify({ message: "Guardado con éxito", type: "success", displayTime: 2000, width: 'auto', position: 'bottom center' });
    };


    const buildInteractionContext = (e: any) => ({
        e, canvaSize, rows, cols, isSelecting, selectionStart, selectionEnd,
        setIsSelecting, setSelectionStart, setSelectionEnd, finalizeZone, clearZones, selectElement, handleMove
    });

    const getInteraction = () => (activeAction === 'delete' || activeAction === 'clone' || activeAction === 'select') ? MAP_STRUCTURES['Area'] : MAP_STRUCTURES[structureType];

    const handlePointerDown = (e: any) => {
        if (e.evt.button !== 0) return;
        wasDraggingLeftRef.current = false;
        if (activeAction === 'create' || activeAction === 'delete' || activeAction === 'clone' || activeAction === 'select') {
            getInteraction()?.actions?.onPointerDown?.(buildInteractionContext(e), getInteraction()!);
        }
    };

    const handlePointerMove = (e: any) => {
        if (e.evt?.buttons === 1) {
            wasDraggingLeftRef.current = true;
        }
        if (activeAction === 'move' || activeAction === 'blueprint') {
            const stage = e.target.getStage();
            const relPos = stage.getRelativePointerPosition();
            const row = Math.floor(relPos.y / canvaSize) + 1;
            const col = Math.floor(relPos.x / canvaSize) + 1;

            if (activeAction === 'move') {
                setMovePreviewPos({ row, col });
            } else {
                setBlueprintPreviewPos(computeBlueprintOffset(row, col));
            }
            return;
        }
        if (activeAction === 'create' || activeAction === 'delete' || activeAction === 'clone' || activeAction === 'select') {
            getInteraction()?.actions?.onPointerMove?.(buildInteractionContext(e), getInteraction()!);
        }
    };

    const handlePointerUp = (e: any) => {
        if (moveTimerRef.current) {
            clearTimeout(moveTimerRef.current);
            moveTimerRef.current = null;
        }
        if (e.evt.button !== 0) return;

        if (activeAction === 'blueprint' && pendingStructure && blueprintPreviewPos) {
            const success = placeBlueprintGroup(pendingStructure, blueprintPreviewPos.row, blueprintPreviewPos.col, rotation);
            if (success) {
                if (pendingStructure.isBatch) {
                    setPendingStructure(null);
                    setTimeout(() => setActiveAction('select'), 0);
                    setBlueprintPreviewPos(null);
                } else {
                    const newTotal = pendingStructure.totalGroups - 1;
                    if (newTotal <= 0) {
                        setPendingStructure(null);
                        setTimeout(() => setActiveAction('select'), 0);
                        setBlueprintPreviewPos(null);
                    } else {
                        setPendingStructure({
                            ...pendingStructure,
                            totalGroups: newTotal,
                            blueprints: pendingStructure.blueprints.slice(1)
                        });
                    }
                }
            }
            return;
        }

        if (activeAction === 'move' && movePreviewPos && (selectedElementId || selectedElementIds.length > 0) && moveOffset) {
            const idsToMove = selectedElementIds.length > 0 ? selectedElementIds : [selectedElementId!];
            const success = handleMove(idsToMove, {
                row: movePreviewPos.row - moveOffset.r,
                col: movePreviewPos.col - moveOffset.c
            }, rotation);

            if (success) {
                setTimeout(() => setActiveAction('select'), 0);
                setMovePreviewPos(null);
                setMoveOffset(null);
                if (idsToMove.length === 1) selectElement(idsToMove[0]);
            }
            return;
        }

        if (activeAction === 'create' || activeAction === 'clone' || activeAction === 'select') {
            const config = getInteraction();
            config?.actions?.onPointerUp?.(buildInteractionContext(e), config);
        } else if (activeAction === 'delete') {
            if (isSelecting && selectionStart && selectionEnd) {
                clearArea(selectionStart, selectionEnd, deleteFilters);
            }
            setIsSelecting(false);
            setSelectionStart(null);
            setSelectionEnd(null);
        }
    };

    const handlePointerLeave = () => {
        if (activeAction !== 'move' && activeAction !== 'blueprint') return;
        const center = computePreviewCenter();
        if (!center) return;

        if (activeAction === 'move') {
            setMovePreviewPos(center);
        } else {
            setBlueprintPreviewPos(computeBlueprintOffset(center.row, center.col));
        }
    };

    const handleStageClick = (e: any) => {
        if (e.evt.button !== 0) return;
        if (e.target === e.target.getStage() && activeAction === 'select') {
            if (wasDraggingLeftRef.current) {
                wasDraggingLeftRef.current = false;
                return;
            }
            selectElement(null);
        }
    };

    const handleWheel = (e: any) => {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = e.target.getStage();
        const oldScale = stage.scaleX();
        const mousePointTo = {
            x: stage.getPointerPosition().x / oldScale - stage.x() / oldScale,
            y: stage.getPointerPosition().y / oldScale - stage.y() / oldScale,
        };
        const newScale = e.evt.deltaY < 0 ? oldScale * scaleBy : oldScale / scaleBy;
        setCameraZoom(Math.max(0.1, Math.min(newScale, 5)));
        if (newScale >= 5) return;
        setStagePos({
            x: -(mousePointTo.x - stage.getPointerPosition().x / newScale) * newScale,
            y: -(mousePointTo.y - stage.getPointerPosition().y / newScale) * newScale
        });
    };


    const renderKonvaZone = (zone: IZone, isGhost = false, isPreview = false, onlyLabel = false) => {
        const minRow = Math.min(zone.start.row, zone.end.row);
        const maxRow = Math.max(zone.start.row, zone.end.row);
        const minCol = Math.min(zone.start.col, zone.end.col);
        const maxCol = Math.max(zone.start.col, zone.end.col);

        const x = (minCol - 1) * canvaSize;
        const y = (minRow - 1) * canvaSize;
        const w = (maxCol - minCol + 1) * canvaSize;
        const h = (maxRow - minRow + 1) * canvaSize;

        const idsToMove = selectedElementIds.length > 0 ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        const isBeingMoved = activeAction === 'move' && idsToMove.includes(zone.id);
        const effectiveIsGhost = isGhost || isBeingMoved;
        const isActive = zone.id === hoveredZoneId || zone.id === selectedElementId || selectedElementIds.includes(zone.id);
        const config = MAP_STRUCTURES[zone.type];

        const renderer = STRUCTURE_RENDERERS[zone.type];
        if (isPreview && renderer?.renderPreview) {
            return renderer.renderPreview({
                start: zone.start, end: zone.end,
                canvaSize, activeWalls, activeDirections
            });
        }

        const styles = resolveZoneStyles({ isError: false, isGhost: effectiveIsGhost, isActive, isPreview }, config);
        if (onlyLabel) {
            styles.fill = 'transparent';
            styles.stroke = 'transparent';
            styles.strokeWidth = 0;
            styles.shadowBlur = 0;
        }
        if (zone.type === 'Area' && zone.color) {
            try {
                const r = parseInt(zone.color.slice(1, 3), 16);
                const g = parseInt(zone.color.slice(3, 5), 16);
                const b = parseInt(zone.color.slice(5, 7), 16);
                const rgb = `${r}, ${g}, ${b}`;
                styles.fill = `rgba(${rgb}, ${isActive ? 0.5 : 0.3})`;
                styles.stroke = `rgba(${rgb}, ${isActive ? 0.8 : 0.3})`;
            } catch { /* fallback */ }
        }

        const padding = config.drawConfig.getPadding ? config.drawConfig.getPadding(canvaSize) : 0;
        let totalPadding = padding;

        if (zone.parentId) {
            const parent = (zonesByLevel[currentLevel] || []).find(z => z.id === zone.parentId);
            if (parent) {
                const parentConfig = MAP_STRUCTURES[parent.type];
                if (parentConfig.drawConfig.getMargin) {
                    const margin = parentConfig.drawConfig.getMargin(canvaSize);
                    const normalize = (p: any) => typeof p === 'number' ? { top: p, right: p, bottom: p, left: p } : p;
                    const pObj = normalize(totalPadding);
                    const mObj = normalize(margin);
                    totalPadding = {
                        top: (pObj.top || 0) + (mObj.top || 0),
                        right: (pObj.right || 0) + (mObj.right || 0),
                        bottom: (pObj.bottom || 0) + (mObj.bottom || 0),
                        left: (pObj.left || 0) + (mObj.left || 0)
                    };
                }
            }
        }



        return drawElement({
            id: zone.id || 'preview',
            x, y, width: w, height: h,
            ...styles,
            listening: !onlyLabel,
            padding: totalPadding,
            isDashed: isPreview || isActive,
            cornerTexts: !isGhost ? {
                topLeft: zone.type !== 'Unidad' ? cutPath(zone.path ?? '', zone.type) : '',
                bottomRight: `${maxRow - minRow + 1} x ${maxCol - minCol + 1}`,
                isTitle: zone.type === 'Grupo' || zone.type === 'Area'
            } : undefined,
            text: zone.type === 'Unidad' ? cutPath(zone.path ?? '', zone.type) : undefined,
            textColor: isPreview ? 'rgba(255,255,255,0.4)' : 'rgba(255, 255, 255, 0.89)',
            innerGridSize: config.showInnerGrid ? 1 : undefined,
            canvaSize,
            subdivisions: zone.type === 'Unidad' ? (() => {
                const base = internalStructures?.[zone.id];
                if (!base || !isPreview) return base;
                if (rotation % 180 !== 0) return { ...base, rows: base.cols, cols: base.rows };
                return base;
            })() : undefined,
            onPointerDown: !isPreview && activeAction === 'select' ? (e: any) => {
                if (e.evt.button !== 0) return;
                e.cancelBubble = true;

                if (!selectedElementIds.includes(zone.id)) {
                    selectElement(zone.id);
                }

                if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
                moveTimerRef.current = setTimeout(() => {
                    setActiveAction('move');
                    setIsSelecting(false);
                    setSelectionStart(null);
                    setSelectionEnd(null);

                    const stage = e.target.getStage();
                    const relPos = stage.getRelativePointerPosition();
                    const row = Math.floor(relPos.y / canvaSize) + 1;
                    const col = Math.floor(relPos.x / canvaSize) + 1;

                    const idsToMove = selectedElementIds.includes(zone.id) ? selectedElementIds : [zone.id];
                    const zonesToMove = zones.filter(z => idsToMove.includes(z.id));

                    const { minR: bMinR, maxR: bMaxR, minC: bMinC, maxC: bMaxC } = getMultiZoneBoundingBox(zonesToMove);

                    setMovePreviewPos({ row, col });
                    setMoveOffset({ r: Math.floor((bMaxR - bMinR) / 2), c: Math.floor((bMaxC - bMinC) / 2) });
                    moveTimerRef.current = null;
                }, 200);
            } : undefined,
            onPointerUp: () => {
                if (moveTimerRef.current) {
                    clearTimeout(moveTimerRef.current);
                    moveTimerRef.current = null;
                }
            }
        });
    };


    const handleSetMaxLevel = (newMaxLevel: number) => {
        if (newMaxLevel < maxLevel) {
            let hasStructures = false;
            for (let l = newMaxLevel + 1; l <= maxLevel; l++) {
                if (zonesByLevel[l] && zonesByLevel[l].length > 0) {
                    hasStructures = true;
                    break;
                }
            }

            if (hasStructures) {
                notify("No se puede reducir el nivel máximo. Existen estructuras en los niveles superiores que deben ser eliminadas primero.", "error", 3000);
                return;
            }

            if (currentLevel > newMaxLevel) {
                setCurrentLevel(0);
            }
        }
        setMaxLevel(newMaxLevel);
    };

    return (
        <div className="w-full h-full py-2 rounded-dx">
            <div className="flex flex-row h-full w-full items-stretch">
                <LeftPanel
                    clearZones={clearZones}
                    blueprintCatalog={blueprintCatalog}
                    collapsedGroups={collapsedGroups}
                    setCollapsedGroups={setCollapsedGroups}
                    setPendingStructure={setPendingStructure}
                    fetchLocations={fetchLocations}
                />


                <div
                    className="flex-1 h-full bg-primary-900/35 flex items-center justify-center overflow-hidden relative cursor-crosshair"
                    onContextMenu={(e) => e.preventDefault()}
                >
                    <div className="absolute right-4 top-4 z-[90] flex gap-2">
                        {blueprintCatalog && pendingCount > 0 && (
                            <button
                                className={`px-4 py-2 text-xs text-variant rounded shadow transition-all flex items-center gap-2 ${activeAction === 'blueprint' ? 'bg-focus-500 shadow-sm shadow-black/20' : 'bg-emerald-600 hover:bg-emerald-500'}`}
                                onClick={() => {
                                    if (activeAction === 'blueprint') {
                                        setActiveAction('select');
                                    } else {
                                        const placedPaths = new Set(Object.values(zonesByLevel).flat().filter((z: any) => z.type === 'Grupo').map((z: any) => z.path));
                                        const pending = blueprintCatalog.blueprints.filter(b => !placedPaths.has(b.path));
                                        setPendingStructure({ ...blueprintCatalog, totalGroups: pending.length, blueprints: pending });
                                        setActiveAction('blueprint');
                                    }
                                }}
                            >
                                <i className={activeAction === 'blueprint' ? "dx-icon-close" : "dx-icon-add"}></i>
                                {activeAction === 'blueprint' ? `Cancelar (${pendingStructure?.totalGroups} res.)` : `Ubicar (${pendingCount})`}
                            </button>
                        )}
                        {activeAction === 'blueprint' && (
                            <button
                                className="px-4 py-2 bg-blue-500/80 hover:bg-blue-400 text-variant rounded shadow text-xs  font-bold transition-all flex items-center gap-2"
                                onClick={() => onRotate()}
                            >
                                <i className="dx-icon-refresh"></i>
                                {rotation}°
                            </button>
                        )}
                        <button
                            className={`px-4 py-2 rounded shadow text-xs  font-bold transition-all flex items-center gap-2 ${hasUnsavedChanges
                                ? 'bg-focus-300 text-variant hover:bg-focus-300 shadow-md shadow-black/20'
                                : 'bg-primary-900/90 hover:bg-primary-900/60'
                                }`}
                            onClick={handleSave}
                        >
                            <i className="dx-icon-save"></i>
                            Guardar Data
                        </button>
                    </div>
                    <Stage
                        ref={stageRef} width={window.innerWidth * 0.7} height={900}
                        scaleX={cameraZoom} scaleY={cameraZoom} x={stagePos.x} y={stagePos.y}
                        draggable
                        onDragEnd={(e) => setStagePos({ x: e.target.x(), y: e.target.y() })}
                        onWheel={handleWheel}
                        onPointerDown={handlePointerDown}
                        onPointerMove={handlePointerMove}
                        onPointerUp={handlePointerUp}
                        onPointerLeave={handlePointerLeave}
                        onClick={handleStageClick}
                    >
                        <Layer>

                            <Shape
                                sceneFunc={(context, shape) => {
                                    context.beginPath();
                                    for (let i = 0; i <= cols; i++) { context.moveTo(i * canvaSize, 0); context.lineTo(i * canvaSize, rows * canvaSize); }
                                    for (let j = 0; j <= rows; j++) { context.moveTo(0, j * canvaSize); context.lineTo(cols * canvaSize, j * canvaSize); }
                                    context.fillStrokeShape(shape);
                                }}
                                stroke="rgba(95, 95, 95, 0.5)" strokeWidth={1}
                                listening={false} perfectDrawEnabled={false} transformsEnabled="position"
                            />


                            {Object.entries(STRUCTURE_RENDERERS)
                                .sort(([a], [b]) => (MAP_STRUCTURES[a as StructureType]?.drawConfig.zIndex || 0) - (MAP_STRUCTURES[b as StructureType]?.drawConfig.zIndex || 0))
                                .map(([, renderer]) =>
                                    renderer.renderElements({
                                        canvaSize, rows, cols, currentLevel, levels, callesMatrix, murosMatrix, directionsMatrix, zones, zonesByLevel,
                                        renderKonvaZone: (z: any, g: any, p: any) => renderKonvaZone(z, g, p),
                                        drawIcon
                                    })
                                )}


                            {zones.filter(z => z.type === 'Grupo').map(z => renderKonvaZone(z, false, false, true))}


                            {selectionStart && selectionEnd && activeAction === 'create' && renderKonvaZone({ start: selectionStart, end: selectionEnd, id: '', type: structureType }, false, true)}
                            {selectionStart && selectionEnd && activeAction === 'delete' && renderKonvaZone({ start: selectionStart, end: selectionEnd, id: '', type: 'Area', color: '#ef4444' }, false, true)}
                            {selectionStart && selectionEnd && activeAction === 'clone' && renderKonvaZone({ start: selectionStart, end: selectionEnd, id: '', type: 'Area', color: '#3b82f6' }, false, true)}
                            {selectionStart && selectionEnd && activeAction === 'select' && renderKonvaZone({ start: selectionStart, end: selectionEnd, id: '', type: 'Area', color: '#0ea5e9' }, false, true)}


                            {activeAction === 'blueprint' && blueprintPreviewPos && pendingStructure && (
                                <BlueprintPreview
                                    pendingStructure={pendingStructure}
                                    blueprintPreviewPos={blueprintPreviewPos}
                                    rotation={rotation}
                                    renderKonvaZone={renderKonvaZone}
                                />
                            )}


                            {activeAction === 'move' && movePreviewPos && (selectedElementId || selectedElementIds.length > 0) && moveOffset && (
                                <MovePreview
                                    zones={zones}
                                    selectedElementId={selectedElementId}
                                    selectedElementIds={selectedElementIds}
                                    movePreviewPos={movePreviewPos}
                                    moveOffset={moveOffset}
                                    rotation={rotation}
                                    renderKonvaZone={renderKonvaZone}
                                />
                            )}
                        </Layer>
                    </Stage>

                    <FooterPanel currentLevel={currentLevel} levels={levels} />
                </div>

                <RightPanel
                    cols={cols} rows={rows}
                    maxLevel={maxLevel} setMaxLevel={handleSetMaxLevel}
                    handleResizeCols={handleResizeCols} handleResizeRows={handleResizeRows}
                    cameraZoom={cameraZoom} setCameraZoom={setCameraZoom}
                    clearZones={clearZones} handleRotate={onRotate}
                />
            </div>
        </div>
    )
}

const GridMapViewWithProvider = () => {
    return (<Gridmap />);
};

export default GridMapViewWithProvider;

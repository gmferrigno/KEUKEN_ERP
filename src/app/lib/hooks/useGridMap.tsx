import { IDrawElementProps, IMapStructureTranslation, IZone, StructureType } from "@/types/gridMap.types";
import { generateUUID } from '@/lib/utils/id.helper';
import notify from 'devextreme/ui/notify';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { Shape } from 'react-konva';
import { useGridMapContext } from '../../../contexts/GridMapContext';
import { BASE_LEVEL, DEFAULT_SHAPE, DX_ICON_MAP, MAP_STRUCTURES } from '../constants/gridMap.constants';
import { checkRangesOverlap, createInitialMatrix, DEFAULT_MATRIX_VALUES, expandMatrixRange, getBlueprintBatchDimensions, isCellInZone, mutateMatrixArea, rotateCoords, rotateDirections, runPlacementValidations, shrinkMatrixRange, updatePathInUrl } from '../utils/gridMap.helper';

interface IUseGridMapLocalProps {
    canvaSize: number;
    setPendingStructure: (structure: IMapStructureTranslation | null) => void;
    levels?: number[];
}

export const useGridMap = (props?: Partial<IUseGridMapLocalProps>) => {
    const { canvaSize = 40, setPendingStructure = () => { }, levels = [BASE_LEVEL] } = props || {};

    const {
        zonesByLevel, currentLevel, setCurrentLevel,
        callesMatrix, murosMatrix, directionsMatrix, activeDirections, activeWalls,
        setZonesByLevel, setCallesMatrix, setMurosMatrix, setDirectionsMatrix,
        structureType, setRows, setCols, setInternalStructures, internalStructures,
        rows, cols,
        selectedElementId, setSelectedElementId,
        selectedElementIds, setSelectedElementIds,
        cloneFilters, setActiveAction,
        rotation, setRotation, activeAction
    } = useGridMapContext();

    const zones = zonesByLevel[currentLevel] || [];

    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();

    useEffect(() => {
        const pathParam = searchParams.get('path');
        if (pathParam) {
            const allZones = Object.values(zonesByLevel).flat() as IZone[];
            if (allZones.length === 0) return;

            const foundZone = allZones.find(z => z.path === pathParam);

            if (foundZone) {
                const levelStr = Object.keys(zonesByLevel).find(lvl => zonesByLevel[Number(lvl)].some(z => z.path === pathParam));
                if (levelStr && setCurrentLevel) setCurrentLevel(Number(levelStr));
                selectElement(foundZone.id);
            } else {
                updatePathInUrl(null, searchParams, router, pathname);
                selectElement(null);
            }
        } else {
            updatePathInUrl(null, searchParams, router, pathname);
            selectElement(null);
        }
    }, []);


    const handleRotate = (direction: 'cw' | 'ccw' = 'cw', setMoveOffset?: (offset: { r: number, c: number }) => void) => {
        const increment = direction === 'cw' ? 90 : -90;
        const nextRotation = (rotation + increment + 360) % 360;
        setRotation(nextRotation);

        const ids = (selectedElementIds && selectedElementIds.length > 0) ? selectedElementIds : (selectedElementId ? [selectedElementId] : []);
        if (ids.length === 0) return;

        if (activeAction === 'blueprint') return;

        if (activeAction !== 'move') {
            setActiveAction('move');
        }

        let minR = Infinity, minC = Infinity, maxR = -Infinity, maxC = -Infinity;
        const targets = zones.filter(z => ids.includes(z.id));

        if (targets.length === 0) return;

        targets.forEach(z => {
            minR = Math.min(minR, z.start.row, z.end.row);
            minC = Math.min(minC, z.start.col, z.end.col);
            maxR = Math.max(maxR, z.start.row, z.end.row);
            maxC = Math.max(maxC, z.start.col, z.end.col);
        });

        let w = maxC - minC + 1;
        let h = maxR - minR + 1;

        if (nextRotation % 180 !== 0) {
            [w, h] = [h, w];
        }

        if (setMoveOffset) {
            setMoveOffset({ r: Math.floor(h / 2), c: Math.floor(w / 2) });
        }
    };

    const clearZones = (zoneId?: string) => {
        const tempLevel = zoneId && zonesByLevel[BASE_LEVEL]?.some(z => z.id === zoneId && z.type === 'Area') ? BASE_LEVEL : currentLevel;
        const currentZones = zonesByLevel[tempLevel] || [];
        if (currentZones.length === 0 && !zoneId) return;

        const zonesToDelete = zoneId ? currentZones.filter(z => z.id === zoneId || z.parentId === zoneId) : currentZones;
        if (zonesToDelete.length === 0) return;

        let allZonesToDelete = [...zonesToDelete];
        let currentDeletionBatch = [...zonesToDelete];
        const allLevels = Object.keys(zonesByLevel).map(Number);
        const maxLvl = Math.max(...allLevels, tempLevel);

        for (let l = tempLevel + 1; l <= maxLvl; l++) {
            const levelZones = zonesByLevel[l] || [];
            if (levelZones.length === 0) continue;

            const nextBatch = levelZones.filter(lz => {
                if (lz.type === 'Area') return false;
                return currentDeletionBatch.some(deleted => checkRangesOverlap(lz.start, lz.end, deleted.start, deleted.end));
            });

            if (nextBatch.length > 0) {
                const nextBatchWithChildren = levelZones.filter(lz => nextBatch.includes(lz) || nextBatch.some(nb => nb.id === lz.parentId));
                allZonesToDelete.push(...nextBatchWithChildren);
                currentDeletionBatch = nextBatchWithChildren;
            } else {
                break;
            }
        }

        const idsToDelete = new Set(allZonesToDelete.map(z => z.id));

        setZonesByLevel((prev: any) => {
            const next = { ...prev };
            Object.keys(next).forEach(lvlStr => {
                const lvl = Number(lvlStr);
                if (next[lvl]) {
                    next[lvl] = next[lvl].filter((z: IZone) => !idsToDelete.has(z.id) && !idsToDelete.has(z.parentId!));
                }
            });

            if (tempLevel === BASE_LEVEL && zoneId) {
                const zoneToDelete = zonesToDelete.find(z => z.id === zoneId);
                if (zoneToDelete && zoneToDelete.type !== 'Area') {
                    const filteredLevel0 = next[BASE_LEVEL] || [];
                    setCallesMatrix((prevMatrix: any) => mutateMatrixArea(prevMatrix, BASE_LEVEL, zoneToDelete.start, zoneToDelete.end, (r, c, prevVal) => {
                        const isCovered = filteredLevel0.some((z: IZone) => z.type !== 'Area' && isCellInZone(r, c, z.start, z.end));
                        return isCovered ? prevVal : true;
                    }));

                    setDirectionsMatrix((prevDirs: any) => mutateMatrixArea(prevDirs, BASE_LEVEL, zoneToDelete.start, zoneToDelete.end, (r, c, oldDir) => {
                        const isCovered = filteredLevel0.some((z: IZone) => z.type !== 'Area' && isCellInZone(r, c, z.start, z.end));
                        if (isCovered) return oldDir;

                        const walls = murosMatrix[BASE_LEVEL]?.[r]?.[c] || {};
                        return { up: !walls.up, down: !walls.down, left: !walls.left, right: !walls.right };
                    }));
                }
            } else if (!zoneId && tempLevel === BASE_LEVEL) {
                const emptyFaces = { up: false, down: false, left: false, right: false };
                const fullFaces = { up: true, down: true, left: true, right: true };
                setCallesMatrix({ [BASE_LEVEL]: createInitialMatrix(rows, cols, true) });
                setMurosMatrix({ [BASE_LEVEL]: createInitialMatrix(rows, cols, emptyFaces) });
                setDirectionsMatrix({ [BASE_LEVEL]: createInitialMatrix(rows, cols, fullFaces) });
            }

            return next;
        });

        if (selectedElementId && idsToDelete.has(selectedElementId) && setSelectedElementId) {
            setSelectedElementId(null);
        }
    };

    const clearArea = (start: { row: number, col: number }, end: { row: number, col: number }, filters: Record<string, boolean>) => {
        const minR = Math.min(start.row, end.row);
        const maxR = Math.max(start.row, end.row);
        const minC = Math.min(start.col, end.col);
        const maxC = Math.max(start.col, end.col);

        if (filters['Muro']) {
            setMurosMatrix((prevMuros: any) => {
                const nextLevel = { ...(prevMuros[BASE_LEVEL] || {}) };
                for (let r = minR; r <= maxR; r++) {
                    for (let c = minC; c <= maxC; c++) {
                        nextLevel[r] = { ...(nextLevel[r] || {}) };
                        nextLevel[r][c] = { up: false, down: false, left: false, right: false };
                    }
                }
                return { ...prevMuros, [BASE_LEVEL]: nextLevel };
            });
        }

        if (filters['Direcciones']) {
            setDirectionsMatrix((prevDirs: any) => {
                const nextLevel = { ...(prevDirs[BASE_LEVEL] || {}) };
                for (let r = minR; r <= maxR; r++) {
                    for (let c = minC; c <= maxC; c++) {
                        nextLevel[r] = { ...(nextLevel[r] || {}) };
                        nextLevel[r][c] = { up: true, down: true, left: true, right: true };
                    }
                }
                return { ...prevDirs, [BASE_LEVEL]: nextLevel };
            });
        }

        const typesToDelete = Object.keys(filters).filter(k => filters[k] && k !== 'Muro' && k !== 'Direcciones');
        if (typesToDelete.length > 0) {
            const zonesToDelete = levels.flatMap(l => zonesByLevel[l] || []).filter(z => {
                if (!typesToDelete.includes(z.type)) return false;
                const zMinR = Math.min(z.start.row, z.end.row);
                const zMaxR = Math.max(z.start.row, z.end.row);
                const zMinC = Math.min(z.start.col, z.end.col);
                const zMaxC = Math.max(z.start.col, z.end.col);

                return (minR <= zMaxR && maxR >= zMinR) && (minC <= zMaxC && maxC >= zMinC);
            });

            zonesToDelete.forEach(z => {
                clearZones(z.id);
            });
        }
        notify?.("Limpieza por área completada", "success", 2000);
    };

    const selectElement = (zoneId: string | null) => {
        if (setSelectedElementId) {
            setSelectedElementId(zoneId);
        }
        if (setSelectedElementIds) {
            setSelectedElementIds(zoneId ? [zoneId] : []);
        }

        if (zoneId) {
            const zone = getElementById(zoneId);
            if (zone && (zone.type === 'Grupo' || zone.type === 'Unidad') && zone.path) {
                updatePathInUrl(zone.path, searchParams, router, pathname);
            } else {
                updatePathInUrl(null, searchParams, router, pathname);
            }
        } else {
            updatePathInUrl(null, searchParams, router, pathname);
        }
    };

    const handleMove = (zoneIds: string | string[], newStart: { row: number, col: number }, currentRotation: number = 0) => {
        if (currentLevel !== BASE_LEVEL) {
            notify?.({ message: "El movimiento manual solo está permitido en el Nivel 0. Mueve la base para mover todo el bloque.", type: 'warning', displayTime: 3000 });
            setActiveAction?.('select');
            return false;
        }

        const level = currentLevel;
        const currentZones = zonesByLevel[level] || [];
        const ids = Array.isArray(zoneIds) ? zoneIds : [zoneIds];
        const initialTargets = currentZones.filter(z => ids.includes(z.id));

        if (initialTargets.length === 0) return false;

        const unmovable = initialTargets.some(z => {
            const config = MAP_STRUCTURES[z.type];
            return config && config.canMove === true;
        });

        if (!unmovable) {
            notify?.({ message: `El movimiento no está permitido para estructuras de tipo.`, type: 'warning', displayTime: 3000 });
            setActiveAction?.('select');
            return false;
        }

        if (initialTargets.length === 0) return false;

        let bMinR = Infinity, bMinC = Infinity, bMaxR = -Infinity, bMaxC = -Infinity;
        initialTargets.forEach(z => {
            bMinR = Math.min(bMinR, Math.min(z.start.row, z.end.row));
            bMinC = Math.min(bMinC, Math.min(z.start.col, z.end.col));
            bMaxR = Math.max(bMaxR, Math.max(z.start.row, z.end.row));
            bMaxC = Math.max(bMaxC, Math.max(z.start.col, z.end.col));
        });

        const containerH = bMaxR - bMinR + 1;
        const containerW = bMaxC - bMinC + 1;

        const itemsToMove: { item: IZone, level: number }[] = [];
        const allLevels = Object.keys(zonesByLevel).map(Number);
        const maxLvl = Math.max(...allLevels, BASE_LEVEL);

        let currentBatch: IZone[] = [];
        for (let l = BASE_LEVEL; l <= maxLvl; l++) {
            const levelZones = zonesByLevel[l] || [];
            if (l === BASE_LEVEL) {
                const targets = [...initialTargets];
                initialTargets.forEach(t => {
                    const children = levelZones.filter(z => z.parentId === t.id && !ids.includes(z.id));
                    targets.push(...children);
                });
                targets.forEach(t => itemsToMove.push({ item: t, level: BASE_LEVEL }));
                currentBatch = targets;
            } else {
                const overlapping = levelZones.filter(z => z.type !== 'Area' && currentBatch.some(cb => checkRangesOverlap(z.start, z.end, cb.start, cb.end)));

                for (const o of overlapping) {
                    const minR = Math.min(o.start.row, o.end.row);
                    const maxR = Math.max(o.start.row, o.end.row);
                    const minC = Math.min(o.start.col, o.end.col);
                    const maxC = Math.max(o.start.col, o.end.col);
                    let covered = true;
                    for (let r = minR; r <= maxR; r++) {
                        for (let c = minC; c <= maxC; c++) {
                            const supported = currentBatch.some(cb => isCellInZone(r, c, cb.start, cb.end));
                            if (!supported) { covered = false; break; }
                        }
                        if (!covered) break;
                    }
                    if (!covered) {
                        notify?.({ message: `No se puede mover porque fragmenta la estructura ${o.type} en el Nivel ${l}.`, type: 'error', displayTime: 3000 });
                        return false;
                    }
                }

                const targets = [...overlapping];
                overlapping.forEach(o => {
                    const children = levelZones.filter(z => z.parentId === o.id && !targets.includes(z));
                    targets.push(...children);
                });

                targets.forEach(t => itemsToMove.push({ item: t, level: l }));
                currentBatch = targets;
            }
        }

        const itemsToMoveIds = itemsToMove.map(m => m.item.id);

        const newTargets = itemsToMove.map(({ item, level: itemLevel }) => {
            const relR = item.start.row - bMinR;
            const relC = item.start.col - bMinC;
            const itemW = item.end.col - item.start.col;
            const itemH = item.end.row - item.start.row;

            const { rS, cS, rE, cE } = rotateCoords(relR, relC, relR + itemH, relC + itemW, containerH, containerW, currentRotation);

            const targetStart = { row: newStart.row + rS, col: newStart.col + cS };
            const targetEnd = { row: newStart.row + rE, col: newStart.col + cE };
            return { item, targetStart, targetEnd, itemLevel };
        });

        for (const { item, targetStart, targetEnd, itemLevel } of newTargets) {
            const isMovingWithParent = true;
            const check = validatePlacement(item.type, targetStart, targetEnd, itemLevel, itemsToMoveIds, isMovingWithParent);
            if (!check.isValid) {
                notify?.({ message: check.error || "Movimiento inválido", type: 'error', displayTime: 2000 });
                return false;
            }
        }

        setZonesByLevel((prevMatrix: any) => {
            const newState = { ...prevMatrix };
            allLevels.forEach(l => {
                if (!newState[l]) return;
                newState[l] = newState[l].map((z: IZone) => {
                    const movingTarget = newTargets.find(t => t.item.id === z.id);
                    if (movingTarget) {
                        const { targetStart, targetEnd } = movingTarget;
                        let newParentId = z.parentId;
                        if (z.type === 'Unidad') {
                            const isWithParent = !!(z.parentId && itemsToMoveIds.includes(z.parentId));
                            if (!isWithParent) {
                                const { contained, parentZone } = checkContainmentInGroup(targetStart, targetEnd);
                                if (contained) newParentId = parentZone?.id;
                            }
                        }

                        return {
                            ...z,
                            start: targetStart,
                            end: targetEnd,
                            parentId: newParentId
                        };
                    }
                    return z;
                });
            });
            return newState;
        });

        const allRemainingZones = levels.flatMap(l => zonesByLevel[l] || []).filter(z => !itemsToMove.some(m => m.item.id === z.id));

        itemsToMove.forEach(({ item, level }) => {
            if (level !== BASE_LEVEL) return;
            setCallesMatrix((prev: any) => mutateMatrixArea(prev, BASE_LEVEL, item.start, item.end, (r, c, prevVal) => {
                const isOccupiedByOthers = allRemainingZones.some(z => z.type !== 'Area' && isCellInZone(r, c, z.start, z.end));
                return isOccupiedByOthers ? prevVal : true;
            }));

            setDirectionsMatrix((prevDirs: any) => mutateMatrixArea(prevDirs, BASE_LEVEL, item.start, item.end, (r, c, oldDir) => {
                const isOccupiedByOthers = allRemainingZones.some(z => z.type !== 'Area' && isCellInZone(r, c, z.start, z.end));
                if (isOccupiedByOthers) return oldDir;

                const walls = murosMatrix[BASE_LEVEL]?.[r]?.[c] || {};
                return {
                    up: !walls.up,
                    down: !walls.down,
                    left: !walls.left,
                    right: !walls.right
                };
            }));
        });

        newTargets.forEach(({ item, targetStart, targetEnd, itemLevel }) => {
            if (itemLevel !== BASE_LEVEL) return;
            const config = MAP_STRUCTURES[item.type];
            if (config?.placementRules?.collisionScore === 0 && item.type !== 'Area' && config?.clearUnderneath) {
                setCallesMatrix((prev: any) => mutateMatrixArea(prev, BASE_LEVEL, targetStart, targetEnd, () => false));
            }
        });

        notify?.({ message: "Elemento desplazado correctamente", type: 'success', displayTime: 2000 });
        return true;
    };

    const drawIcon = (context: any, iconName: keyof typeof DX_ICON_MAP, x: number, y: number, size: number, color: string = 'rgba(255,255,255,0.8)') => {
        const char = DX_ICON_MAP[iconName];
        if (!char) return;
        context.save();
        context.font = `${size}px DXIcons`;
        context.fillStyle = color;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(char, x, y);
        context.restore();
    };

    const validatePlacement = (
        type: StructureType,
        start: { row: number; col: number },
        end: { row: number; col: number },
        level: number,
        excludeIds: string[] = [],
        ignoreParentCheck: boolean = false
    ) => {
        return runPlacementValidations({
            start, end, type, level, excludeIds, ignoreParentCheck,
            rows, cols, levels, zonesByLevel, murosMatrix, zones, baseLevel: BASE_LEVEL
        });
    };

    const drawElement = (config: IDrawElementProps) => {
        const {
            id, fill, stroke,
            strokeWidth = 1, shadowBlur = 0, shadowColor = 'transparent',
            isDashed = false, onClick, onPointerDown, onPointerUp, listening = true
        } = config;

        return (
            <Shape
                key={id}
                listening={listening}
                onClick={onClick}
                onTap={onClick}
                onPointerDown={onPointerDown}
                onPointerUp={onPointerUp}
                sceneFunc={(context: any, shape: any) => DEFAULT_SHAPE.draw(context, shape, config, canvaSize)}
                fill={fill}
                stroke={stroke}
                strokeWidth={strokeWidth}
                shadowBlur={shadowBlur}
                shadowColor={shadowColor}
                dash={isDashed ? [5, 5] : []}
                perfectDrawEnabled={false}
                transformsEnabled="position"
            />
        );
    };

    const checkContainmentInGroup = (start: any, end: any) => {
        const nMinR = Math.min(start.row, end.row);
        const nMaxR = Math.max(start.row, end.row);
        const nMinC = Math.min(start.col, end.col);
        const nMaxC = Math.max(start.col, end.col);

        const parent = zones.find(zone => {
            if (zone.type !== 'Grupo') return false;
            const zMinR = Math.min(zone.start.row, zone.end.row);
            const zMaxR = Math.max(zone.start.row, zone.end.row);
            const zMinC = Math.min(zone.start.col, zone.end.col);
            const zMaxC = Math.max(zone.start.col, zone.end.col);
            return nMinR >= zMinR && nMaxR <= zMaxR && nMinC >= zMinC && nMaxC <= zMaxC;
        });
        return { contained: !!parent, parentZone: parent || null };
    };

    const finalizeZone = (start: any, end: any) => {
        if (activeAction === 'clone') {
            finalizeClone(start, end);
            return;
        }
        if (activeAction === 'select') {
            finalizeSelect(start, end);
            return;
        }
        if (!structureType || !MAP_STRUCTURES) return;
        const rowsCount = Math.abs(start.row - end.row) + 1;
        const colsCount = Math.abs(start.col - end.col) + 1;
        const config = MAP_STRUCTURES[structureType];
        const minSize = config.minSize;

        if (rowsCount < minSize || colsCount < minSize) {
            return notify?.(`La unidad mínima para ${structureType} es ${minSize}x${minSize} celdas.`, 'warning', 2000);
        }

        const areaTotal = rowsCount * colsCount;
        const targetLvlToAdd = config.hasLevel ? currentLevel : BASE_LEVEL;

        const checkFixedStructuresOverlap = () => {
            const levelZones = zonesByLevel[targetLvlToAdd] || [];
            return levelZones.filter(z => z.type !== 'Area').some(z => {
                const nMinR = Math.min(start.row, end.row), nMaxR = Math.max(start.row, end.row);
                const nMinC = Math.min(start.col, end.col), nMaxC = Math.max(start.col, end.col);
                const zMinR = Math.min(z.start.row, z.end.row), zMaxR = Math.max(z.start.row, z.end.row);
                const zMinC = Math.min(z.start.col, z.end.col), zMaxC = Math.max(z.start.col, z.end.col);
                return (nMinR <= zMaxR && nMaxR >= zMinR) && (nMinC <= zMaxC && nMaxC >= zMinC);
            });
        };

        const addZone = (parentId?: string) => {
            const newZone: IZone = { start, end, id: generateUUID(), type: structureType, parentId };
            setZonesByLevel?.((prev: any) => ({ ...prev, [targetLvlToAdd]: [...(prev[targetLvlToAdd] || []), newZone] }));
        };

        const clearUnderneath = () => {
            const fullFaces = { up: true, down: true, left: true, right: true };
            setCallesMatrix?.((prev: any) => mutateMatrixArea(prev, targetLvlToAdd, start, end, () => false));
            setDirectionsMatrix?.((prev: any) => mutateMatrixArea(prev, targetLvlToAdd, start, end, () => fullFaces));
        };

        if (config.actions?.onFinalize) {
            config.actions.onFinalize({
                start, end, currentLevel, targetLvlToAdd, areaTotal, zones, callesMatrix, murosMatrix, directionsMatrix, activeDirections, activeWalls,
                checkContainmentInGroup, notify, setCallesMatrix, setMurosMatrix, setDirectionsMatrix,
                addZone, clearUnderneath, checkFixedStructuresOverlap, validatePlacement, structureType,
                zonesByLevel, rows, cols
            }, config);
        }
    };

    const finalizeSelect = (start: { row: number, col: number }, end: { row: number, col: number }) => {
        const nMinR = Math.min(start.row, end.row);
        const nMaxR = Math.max(start.row, end.row);
        const nMinC = Math.min(start.col, end.col);
        const nMaxC = Math.max(start.col, end.col);

        const selectedZones = zones.filter(z => {
            const zMinR = Math.min(z.start.row, z.end.row);
            const zMaxR = Math.max(z.start.row, z.end.row);
            const zMinC = Math.min(z.start.col, z.end.col);
            const zMaxC = Math.max(z.start.col, z.end.col);

            return (nMinR <= zMaxR && nMaxR >= zMinR) && (nMinC <= zMaxC && nMaxC >= zMinC);
        });

        const ids = selectedZones.map(z => z.id);
        if (setSelectedElementIds) setSelectedElementIds(ids);
        if (setSelectedElementId) setSelectedElementId(ids.length === 1 ? ids[0] : null);

        if (ids.length !== 1) {
            updatePathInUrl(null, searchParams, router, pathname);
        } else {
            const zone = selectedZones[0];
            if (zone && (zone.type === 'Grupo' || zone.type === 'Unidad') && zone.path) {
                updatePathInUrl(zone.path, searchParams, router, pathname);
            }
        }
    };

    const finalizeClone = (start: { row: number, col: number }, end: { row: number, col: number }) => {
        const nMinR = Math.min(start.row, end.row);
        const nMaxR = Math.max(start.row, end.row);
        const nMinC = Math.min(start.col, end.col);
        const nMaxC = Math.max(start.col, end.col);

        const topLevelZones = zones.filter(z => {
            if (!cloneFilters[z.type]) return false;
            if (z.type !== 'Grupo' && z.type !== 'Area') return false;

            const zMinR = Math.min(z.start.row, z.end.row);
            const zMaxR = Math.max(z.start.row, z.end.row);
            const zMinC = Math.min(z.start.col, z.end.col);
            const zMaxC = Math.max(z.start.col, z.end.col);

            return (nMinR <= zMaxR && nMaxR >= zMinR) && (nMinC <= zMaxC && nMaxC >= zMinC);
        });

        const finalCaptured: IZone[] = [];
        topLevelZones.forEach(parent => {
            finalCaptured.push(parent);
            if (parent.type === 'Grupo') {
                const children = zones.filter(z => z.parentId === parent.id);
                finalCaptured.push(...children);
            }
        });

        if (finalCaptured.length === 0) {
            notify?.("No hay elementos seleccionados para clonar en esta área.", "warning", 2000);
            return;
        }

        let bMinR = Infinity, bMaxR = -Infinity, bMinC = Infinity, bMaxC = -Infinity;
        finalCaptured.forEach(z => {
            bMinR = Math.min(bMinR, z.start.row, z.end.row);
            bMaxR = Math.max(bMaxR, z.start.row, z.end.row);
            bMinC = Math.min(bMinC, z.start.col, z.end.col);
            bMaxC = Math.max(bMaxC, z.start.col, z.end.col);
        });

        const bundleZones = finalCaptured.map(z => ({
            ...z,
            path: undefined,
            name: undefined,
            relStart: { row: z.start.row - bMinR, col: z.start.col - bMinC },
            relEnd: { row: z.end.row - bMinR, col: z.end.col - bMinC }
        }));

        const cloneStructure: IMapStructureTranslation = {
            totalGroups: 1,
            groupDimensions: { rows: bMaxR - bMinR + 1, cols: bMaxC - bMinC + 1 },
            unitsPerGroup: 0,
            subdivisionsPerUnit: 0,
            totalSubdivisions: 0,
            totalEntities: bundleZones.length,
            message: "Clonando selección",
            blueprints: [],
            cloneBundle: {
                zones: bundleZones,
                groupDimensions: { rows: bMaxR - bMinR + 1, cols: bMaxC - nMinC + 1 }
            }
        };

        cloneStructure.cloneBundle!.groupDimensions.cols = bMaxC - bMinC + 1;

        setPendingStructure?.(cloneStructure);
        setActiveAction?.('blueprint');
        notify?.("Selección capturada. Haz clic para colocar el clon.", "success", 2000);
    };

    const handleResize = (axis: 'rows' | 'cols', newSize: number) => {
        const currentSize = axis === 'rows' ? rows : cols;
        const setSize = axis === 'rows' ? setRows : setCols;
        if (!newSize || newSize === currentSize || !setSize) return;

        const crossSize = axis === 'rows' ? cols : rows;

        if (newSize < currentSize) {
            const allZones = levels.flatMap(l => zonesByLevel[l] || []);
            const overlapping = allZones.find(z => {
                const maxVal = axis === 'rows'
                    ? Math.max(z.start.row, z.end.row)
                    : Math.max(z.start.col, z.end.col);
                return maxVal > newSize;
            });
            if (overlapping) {
                const label = axis === 'rows' ? 'fila' : 'columna';
                const maxVal = axis === 'rows'
                    ? Math.max(overlapping.start.row, overlapping.end.row)
                    : Math.max(overlapping.start.col, overlapping.end.col);
                notify?.({ message: `No se puede achicar: interfiere con zona en ${label} ${maxVal}`, type: 'error', displayTime: 3000 });
                return;
            }

            const clean = (prev: any) => shrinkMatrixRange(prev, levels, axis, currentSize, newSize, crossSize);
            setCallesMatrix?.(clean);
            setMurosMatrix?.(clean);
            setDirectionsMatrix?.(clean);
        }

        if (newSize > currentSize) {
            setCallesMatrix?.((prev: any) => expandMatrixRange(prev, levels, axis, currentSize, newSize, crossSize, DEFAULT_MATRIX_VALUES.calles));
            setMurosMatrix?.((prev: any) => expandMatrixRange(prev, levels, axis, currentSize, newSize, crossSize, DEFAULT_MATRIX_VALUES.muros));
            setDirectionsMatrix?.((prev: any) => expandMatrixRange(prev, levels, axis, currentSize, newSize, crossSize, DEFAULT_MATRIX_VALUES.directions));
        }

        setSize(newSize);
    };

    const handleResizeCols = (newCols: number) => handleResize('cols', newCols);
    const handleResizeRows = (newRows: number) => handleResize('rows', newRows);

    const handleClonePlacement = (
        config: IMapStructureTranslation,
        startRow: number,
        startCol: number,
        currentRotation: number
    ) => {
        const { zones: bundleZones, groupDimensions } = config.cloneBundle!;

        for (const z of bundleZones) {
            const { rS, cS, rE, cE } = rotateCoords(
                z.relStart.row, z.relStart.col, z.relEnd.row, z.relEnd.col,
                groupDimensions.rows, groupDimensions.cols, currentRotation
            );

            const check = validatePlacement(z.type, { row: startRow + rS, col: startCol + cS }, { row: startRow + rE, col: startCol + cE }, currentLevel, [], true);
            if (!check.isValid) {
                notify?.({ message: `Conflicto en el clon: ${check.error}`, type: 'error', displayTime: 2000 });
                return false;
            }
        }

        const newZones = [...(zonesByLevel[currentLevel] || [])];
        const newInternals = { ...internalStructures };
        const idMap: Record<string, string> = {};

        bundleZones.forEach(z => {
            const newId = generateUUID();
            idMap[z.id] = newId;

            const { rS, cS, rE, cE } = rotateCoords(
                z.relStart.row, z.relStart.col, z.relEnd.row, z.relEnd.col,
                groupDimensions.rows, groupDimensions.cols, currentRotation
            );

            newZones.push({
                ...z,
                id: newId,
                start: { row: startRow + rS, col: startCol + cS },
                end: { row: startRow + rE, col: startCol + cE },
                parentId: z.parentId ? idMap[z.parentId] : undefined
            });

            if (internalStructures?.[z.id]) {
                newInternals[newId] = { ...internalStructures[z.id] };
            }
        });

        if (config.cloneBundle!.matrices) {
            const { muros, directions, calles } = config.cloneBundle!.matrices;

            for (let r = 0; r < groupDimensions.rows; r++) {
                for (let c = 0; c < groupDimensions.cols; c++) {
                    const { rS: targetR, cS: targetC } = rotateCoords(r, c, r, c, groupDimensions.rows, groupDimensions.cols, currentRotation);

                    const finalR = startRow + targetR;
                    const finalC = startCol + targetC;

                    const cellMuros = rotateDirections(muros[r + 1]?.[c + 1], currentRotation);
                    const cellDirs = rotateDirections(directions[r + 1]?.[c + 1], currentRotation);
                    const isCalle = calles[r + 1]?.[c + 1];

                    if (cellMuros) {
                        setMurosMatrix?.((prev: any) => ({
                            ...prev,
                            [currentLevel]: {
                                ...prev[currentLevel],
                                [finalR]: { ...prev[currentLevel]?.[finalR], [finalC]: cellMuros }
                            }
                        }));
                    }
                    if (cellDirs) {
                        setDirectionsMatrix?.((prev: any) => ({
                            ...prev,
                            [currentLevel]: {
                                ...prev[currentLevel],
                                [finalR]: { ...prev[currentLevel]?.[finalR], [finalC]: cellDirs }
                            }
                        }));
                        setCallesMatrix?.((prev: any) => ({
                            ...prev,
                            [currentLevel]: {
                                ...prev[currentLevel],
                                [finalR]: { ...prev[currentLevel]?.[finalR], [finalC]: isCalle }
                            }
                        }));
                    }
                }
            }
        }

        setZonesByLevel((prev: any) => ({ ...prev, [currentLevel]: newZones }));
        setInternalStructures?.(newInternals);

        bundleZones.forEach(z => {
            if (z.type !== 'Area' && MAP_STRUCTURES[z.type]?.clearUnderneath) {
                const { rS, cS, rE, cE } = rotateCoords(
                    z.relStart.row, z.relStart.col, z.relEnd.row, z.relEnd.col,
                    groupDimensions.rows, groupDimensions.cols, currentRotation
                );
                setCallesMatrix?.((prev: any) => mutateMatrixArea(prev, currentLevel, { row: startRow + rS, col: startCol + cS }, { row: startRow + rE, col: startCol + cE }, () => false));
            }
        });

        notify?.({ message: "Clon colocado correctamente", type: 'success', displayTime: 2000 });
        return true;
    };

    const handleBlueprintPlacement = (
        config: IMapStructureTranslation,
        startRow: number,
        startCol: number,
        currentRotation: number
    ) => {
        const { totalRows, maxCols, processed } = getBlueprintBatchDimensions(config, currentRotation);

        const check = validatePlacement('Grupo', { row: startRow, col: startCol }, { row: startRow + totalRows - 1, col: startCol + maxCols - 1 }, currentLevel);
        if (!check.isValid) {
            notify?.({ message: check.error || "Ubicación inválida para el lote", type: 'error', displayTime: 2000 });
            return false;
        }

        const newZones = [...(zonesByLevel[currentLevel] || [])];
        const newInternals = { ...internalStructures };

        let currentOffsetRow = startRow;
        processed.forEach((p) => {
            const bStartRow = currentOffsetRow;
            const bEndRow = bStartRow + p.bRows - 1;
            const bStartCol = startCol;
            const bEndCol = startCol + p.bCols - 1;

            const groupId = generateUUID();
            newZones.push({
                id: groupId,
                type: 'Grupo',
                path: p.blueprint.path,
                start: { row: bStartRow, col: bStartCol },
                end: { row: bEndRow, col: bEndCol }
            });

            for (let j = 0; j < p.blueprint.units.length; j++) {
                const { rS: uRS, cS: uCS, rE: uRE, cE: uCE } = rotateCoords(
                    0, j * 3, 2, j * 3 + 2,
                    p.origH, p.origW,
                    currentRotation
                );

                const unitStartRow = bStartRow + uRS;
                const unitStartCol = bStartCol + uCS;
                const unitEndRow = bStartRow + uRE;
                const unitEndCol = bStartCol + uCE;

                const unitBlueprint = p.blueprint.units[j];
                const unitId = generateUUID();

                newZones.push({
                    id: unitId,
                    type: 'Unidad',
                    parentId: groupId,
                    path: unitBlueprint?.path,
                    start: { row: unitStartRow, col: unitStartCol },
                    end: { row: unitEndRow, col: unitEndCol }
                });

                newInternals[unitId] = {
                    rows: unitBlueprint?.subdivisions.length || config.subdivisionsPerUnit,
                    cols: 1,
                    pattern: 0,
                    path: unitBlueprint?.path,
                    subdivisionPaths: unitBlueprint?.subdivisions.map(s => s.path)
                };
            }
            currentOffsetRow += p.bRows;
        });

        setZonesByLevel((prev: any) => ({ ...prev, [currentLevel]: newZones }));
        setInternalStructures?.(newInternals);

        if (currentLevel === BASE_LEVEL && MAP_STRUCTURES['Grupo']?.clearUnderneath) {
            setCallesMatrix?.((prev: any) => mutateMatrixArea(prev, BASE_LEVEL, { row: startRow, col: startCol }, { row: startRow + totalRows - 1, col: startCol + maxCols - 1 }, () => false));
        }

        notify?.({ message: config.isBatch ? `${processed.length} grupos ubicados correctamente` : `Grupo ${processed[0].blueprint.path} ubicado correctamente`, type: 'success', displayTime: 2000 });
        return true;
    };

    const placeBlueprintGroup = (
        config: IMapStructureTranslation,
        startRow: number,
        startCol: number,
        currentRotation: number = 0
    ) => {
        if (config.cloneBundle) {
            return handleClonePlacement(config, startRow, startCol, currentRotation);
        }
        return handleBlueprintPlacement(config, startRow, startCol, currentRotation);
    };

    const getElementById = (id: string, hasLevel?: boolean) => {
        if (!id) return undefined;

        let element = zonesByLevel[currentLevel]?.find(z => z.id === id);
        if (element) return element;

        if (hasLevel === false || hasLevel === undefined) {
            for (const lvlZones of Object.values(zonesByLevel)) {
                const found = (lvlZones as IZone[]).find(z => z.id === id);
                if (found) {
                    if (hasLevel === false) return found;
                    const structConfig = MAP_STRUCTURES[found.type as keyof typeof MAP_STRUCTURES];
                    if (structConfig && structConfig.hasLevel === false) {
                        return found;
                    }
                }
            }
        }
        return undefined;
    };

    return {
        getElementById,
        placeBlueprintGroup,
        handleMove,
        isCellInZone,
        drawElement,
        checkContainmentInGroup,
        finalizeZone,
        drawIcon,
        clearZones,
        clearArea,
        selectElement,
        validatePlacement,
        handleRotate,
        rotateCoords,
        handleResizeCols,
        handleResizeRows
    };
};




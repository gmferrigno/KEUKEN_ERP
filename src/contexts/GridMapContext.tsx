'use client';

import { GridAction, ICellData, IDirections, IGridMapContext, IGridMapData, IInternalStructure, IZone, StructureType } from "@/types/gridMap.types";
import { useSearchParams } from 'next/navigation';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { BASE_LEVEL } from '../app/lib/constants/gridMap.constants';
import { createInitialMatrix } from '../app/lib/utils/gridMap.helper';

const DEFAULT_ROWS = 22;
const DEFAULT_COLS = 25;

const GridMapContext = createContext<IGridMapContext | undefined>(undefined);

export const GridMapProvider = ({ children }: { children: ReactNode }) => {
    const searchParams = useSearchParams();
    const warehouseId = searchParams.get('warehouseId');
    const [rows, setRows] = useState(DEFAULT_ROWS);
    const [cols, setCols] = useState(DEFAULT_COLS);
    const [currentLevel, setCurrentLevel] = useState(BASE_LEVEL);
    const [maxLevel, setMaxLevel] = useState(BASE_LEVEL);
    const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
    const [selectedElementIds, setSelectedElementIds] = useState<string[]>([]);
    const [activeAction, _setActiveAction] = useState<GridAction>('select');
    const [structureType, setStructureType] = useState<StructureType>('Grupo');
    const [activeDirections, setActiveDirections] = useState<IDirections>({ up: true, down: true, left: true, right: true });
    const [activeWalls, setActiveWalls] = useState<IDirections>({ up: false, down: false, left: false, right: true });

    const [internalStructures, setInternalStructures] = useState<Record<string, IInternalStructure>>({});

    const [deleteFilters, setDeleteFilters] = useState<Record<string, boolean>>({
        Grupo: true,
        Unidad: true,
        Area: true,
        Muro: true,
        Direcciones: true
    });

    const [cloneFilters, setCloneFilters] = useState<Record<string, boolean>>({
        Grupo: false,
        Area: true
    });

    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
    const [rotation, setRotation] = useState(0);
    const isImporting = useRef(true);

    const [lastData, setLastData] = useState<IGridMapData | null>(null);

    const [zonesByLevel, setZonesByLevel] = useState<Record<number, IZone[]>>({ [BASE_LEVEL]: [] });

    const [callesMatrix, setCallesMatrix] = useState<any>(() => ({
        [BASE_LEVEL]: createInitialMatrix(DEFAULT_ROWS, DEFAULT_COLS, true)
    }));

    const [murosMatrix, setMurosMatrix] = useState<any>(() => ({
        [BASE_LEVEL]: createInitialMatrix(DEFAULT_ROWS, DEFAULT_COLS, { up: false, down: false, left: false, right: false })
    }));

    const [directionsMatrix, setDirectionsMatrix] = useState<any>(() => ({
        [BASE_LEVEL]: createInitialMatrix(DEFAULT_ROWS, DEFAULT_COLS, { up: true, down: true, left: true, right: true })
    }));

    useEffect(() => {
        if (isImporting.current) {
            isImporting.current = false;
            return;
        }
        setHasUnsavedChanges(true);
    }, [rows, cols, zonesByLevel, callesMatrix, murosMatrix, directionsMatrix, internalStructures]);



    const setActiveAction = useCallback((action: GridAction) => {
        if (action !== 'select' && action !== 'move' && action !== 'internal_structure') {
            setSelectedElementId(null);
            setSelectedElementIds([]);
        }
        _setActiveAction(action);
    }, []);

    const exportMapData = (): IGridMapData => {
        const levelsData: Record<number, Record<number, Record<number, ICellData>>> = {};

        Object.keys(callesMatrix).forEach((lvlStr) => {
            const lvl = parseInt(lvlStr);
            levelsData[lvl] = {};

            for (let r = 1; r <= rows; r++) {
                levelsData[lvl][r] = {};
                for (let c = 1; c <= cols; c++) {
                    levelsData[lvl][r][c] = {
                        isCalle: callesMatrix[lvl]?.[r]?.[c] ?? false,
                        muros: murosMatrix[lvl]?.[r]?.[c] ?? { up: false, down: false, left: false, right: false },
                        directions: directionsMatrix[lvl]?.[r]?.[c] ?? { up: true, down: true, left: true, right: true }
                    };
                }
            }
        });

        const dataToSave = {
            rows,
            cols,
            maxLevel,
            zonesByLevel,
            levelsData,
            internalStructures
        };

        if (warehouseId) {
            try {
                localStorage.setItem(`gridMapData_${warehouseId}`, JSON.stringify(dataToSave));
            } catch {
            }
        }

        setLastData(dataToSave);
        setHasUnsavedChanges(false);

        return dataToSave;
    };

    const importMapData = (data?: IGridMapData | null) => {
        let importedData = data;

        if (!importedData && warehouseId) {
            try {
                const savedItem = localStorage.getItem(`gridMapData_${warehouseId}`);
                if (savedItem) {
                    importedData = JSON.parse(savedItem);
                }
            } catch (e) {
                console.error("Error reading saved map data", e);
            }
        }

        if (!importedData) return;
        isImporting.current = true;
        setLastData(importedData);
        const newCalles: any = {};
        const newMuros: any = {};
        const newDirs: any = {};

        Object.keys(importedData.levelsData).forEach((lvlStr) => {
            const lvl = parseInt(lvlStr);
            newCalles[lvl] = {};
            newMuros[lvl] = {};
            newDirs[lvl] = {};

            for (let r = 1; r <= importedData.rows; r++) {
                newCalles[lvl][r] = {};
                newMuros[lvl][r] = {};
                newDirs[lvl][r] = {};
                for (let c = 1; c <= importedData.cols; c++) {
                    const cell = importedData.levelsData[lvl][r][c];
                    newCalles[lvl][r][c] = cell.isCalle;
                    newMuros[lvl][r][c] = cell.muros;
                    newDirs[lvl][r][c] = cell.directions;
                }
            }
        });

        setRows(importedData.rows);
        setCols(importedData.cols);
        setMaxLevel(importedData.maxLevel || 0);
        setZonesByLevel(importedData.zonesByLevel);
        setCallesMatrix(newCalles);
        setMurosMatrix(newMuros);
        setDirectionsMatrix(newDirs);
        setInternalStructures(importedData.internalStructures || {});
        setCurrentLevel(BASE_LEVEL);
        setSelectedElementId(null);
        setSelectedElementIds([]);
        setHasUnsavedChanges(false);
    };

    const value = useMemo(() => ({
        rows, cols, setRows, setCols,
        currentLevel, setCurrentLevel,
        maxLevel, setMaxLevel,
        selectedElementId, setSelectedElementId,
        activeDirections, setActiveDirections,
        activeWalls, setActiveWalls,
        zonesByLevel, setZonesByLevel,
        callesMatrix, setCallesMatrix,
        murosMatrix, setMurosMatrix,
        directionsMatrix, setDirectionsMatrix,
        activeAction, setActiveAction,
        structureType, setStructureType,
        internalStructures, setInternalStructures,
        hasUnsavedChanges,
        deleteFilters, setDeleteFilters,
        cloneFilters, setCloneFilters,
        selectedElementIds, setSelectedElementIds,
        exportMapData,
        importMapData,
        rotation, setRotation,
        warehouseId
    }), [
        rows, cols, currentLevel, maxLevel, selectedElementId, selectedElementIds, activeDirections, activeWalls,
        zonesByLevel, callesMatrix, murosMatrix, directionsMatrix,
        activeAction, structureType, internalStructures, hasUnsavedChanges, deleteFilters, cloneFilters,
        setActiveAction, exportMapData, importMapData,
        rotation
    ]);

    useEffect(() => {
        if (lastData) {
            importMapData(lastData);
        } else if (warehouseId) {
            importMapData();
        }
    }, [lastData, warehouseId]);

    return (
        <GridMapContext.Provider value={value}>
            {children}
        </GridMapContext.Provider>
    );
};

export const useGridMapContext = () => {
    const context = useContext(GridMapContext);
    if (!context) {
        throw new Error('useGridMapContext must be used within a GridMapProvider');
    }
    return context;
};

import { DX_ICON_MAP } from "@/app/lib/constants/gridMap.constants";
import { ReactNode } from "react";

export interface IRenderContext {
    canvaSize: number;
    rows: number;
    cols: number;
    currentLevel: number;
    levels: number[];
    callesMatrix: any;
    murosMatrix: any;
    directionsMatrix: any;
    zones: IZone[];
    zonesByLevel: Record<number, IZone[]>;
    renderKonvaZone: (zone: IZone, isGhost?: boolean, isPreview?: boolean) => ReactNode;
    drawIcon: (context: any, iconName: keyof typeof DX_ICON_MAP, x: number, y: number, size: number, color?: string) => void;
}

export type StructureType = 'Grupo' | 'Unidad' | 'Area' | 'Muro' | 'Direcciones';

export interface IPlacementRules {
    collisionScore: number;
    requiresParent?: StructureType;
    forbiddenOverlaps?: StructureType[];
    mustBeOnSpecificGround?: 'Muro';
    levelRequirements?: { mustBeContainedByLowerLevel: boolean };
}

export interface IZone {
    start: { row: number; col: number };
    end: { row: number; col: number };
    id: string;
    type: StructureType;
    parentId?: string;
    name?: string;
    color?: string;
    path?: string;
}

export interface IInteractionContext {
    e: any;
    canvaSize: number;
    rows: number;
    cols: number;
    isSelecting: boolean;
    selectionStart: { row: number; col: number } | null;
    selectionEnd: { row: number; col: number } | null;
    setIsSelecting: (val: boolean) => void;
    setSelectionStart: (val: { row: number; col: number } | null) => void;
    setSelectionEnd: (val: { row: number; col: number } | null) => void;
    finalizeZone: (start: any, end: any) => void;
}

export interface IFinalizeContext {
    start: { row: number; col: number };
    end: { row: number; col: number };
    currentLevel: number;
    targetLvlToAdd: number;
    areaTotal: number;
    zones: IZone[];
    callesMatrix: any;
    murosMatrix: any;
    directionsMatrix: any;
    activeDirections: IDirections;
    activeWalls: IDirections;
    checkContainmentInGroup: (start: any, end: any) => { contained: boolean; parentZone: IZone | null };
    notify: (message: string, type: string, timeout: number) => void;
    setCallesMatrix: (updater: (prev: any) => any) => void;
    setMurosMatrix: (updater: (prev: any) => any) => void;
    setDirectionsMatrix: (updater: (prev: any) => any) => void;
    addZone: (parentId?: string) => void;
    clearUnderneath: () => void;
    checkFixedStructuresOverlap: () => boolean;
    validatePlacement: (type: StructureType, start: { row: number, col: number }, end: { row: number, col: number }, level: number, excludeIds?: string[], ignoreParentCheck?: boolean) => { isValid: boolean, error?: string };
    structureType: StructureType;
    zonesByLevel: Record<number, IZone[]>;
    rows: number;
    cols: number;
}

export interface IDirections { up: boolean; down: boolean; left: boolean; right: boolean; }

export interface IDrawElementProps {
    id: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fill: string;
    stroke: string;
    strokeWidth?: number;
    shadowBlur?: number;
    shadowColor?: string;
    padding?: number | { top?: number, right?: number, bottom?: number, left?: number };
    isDashed?: boolean;
    text?: string;
    cornerTexts?: {
        topLeft?: string;
        topRight?: string;
        bottomLeft?: string;
        bottomRight?: string;
        center?: string;
        isTitle?: boolean;
    };
    textColor?: string;
    innerGridSize?: number;
    canvaSize?: number;
    subdivisions?: { rows: number; cols: number };
    listening?: boolean;
    onClick?: (e: any) => void;
    onPointerDown?: (e: any) => void;
    onPointerUp?: (e: any) => void;
}

export interface IStructureActions {
    onPointerDown?: (ctx: IInteractionContext, config: IStructureConfig) => void;
    onPointerMove?: (ctx: IInteractionContext, config: IStructureConfig) => void;
    onPointerUp?: (ctx: IInteractionContext, config: IStructureConfig) => void;
    onFinalize?: (ctx: IFinalizeContext, config: IStructureConfig) => void;
}

export interface IStructureConfig {
    id: StructureType;
    label: string;
    icon: string;
    hasLevel: boolean;
    minSize: number;
    maxSize?: number;
    isMatrix: boolean;
    showInnerGrid?: boolean;
    canDelete?: boolean;
    canMove?: boolean;
    canClear?: boolean;
    clearUnderneath?: boolean;
    actions?: IStructureActions;
    placementRules?: IPlacementRules;
    drawConfig: {
        fill: string;
        stroke: string;
        activeFill: string;
        activeStroke: string;
        previewFill: string;
        zIndex?: number;
        getPadding?: (canvaSize: number) => number | { top?: number, right?: number, bottom?: number, left?: number };
        getMargin?: (canvaSize: number) => number | { top?: number, right?: number, bottom?: number, left?: number };
    }
}

export interface IPreviewRenderContext {
    start: { row: number; col: number };
    end: { row: number; col: number };
    canvaSize: number;
    activeWalls: IDirections;
    activeDirections: IDirections;
}

export interface ICellData {
    isCalle: boolean;
    muros: IDirections;
    directions: IDirections;
}

export interface IInternalStructure {
    rows: number;
    cols: number;
    pattern: number;
    path?: string;
    subdivisionPaths?: string[];
}

export interface IGridMapData {
    rows: number;
    cols: number;
    maxLevel: number;
    zonesByLevel: Record<number, IZone[]>;
    levelsData: Record<number, Record<number, Record<number, ICellData>>>;
    internalStructures: Record<string, IInternalStructure>;
}

export interface IGridMapState {
    zonesByLevel: Record<number, IZone[]>;
    callesMatrix: any;
    murosMatrix: any;
    directionsMatrix: any;
    currentLevel: number;
    maxLevel: number;
    selectedElementId: string | null;
    selectedElementIds: string[];
    activeDirections: IDirections;
    activeWalls: IDirections;
    rows: number;
    cols: number;
    activeAction: GridAction;
    structureType: StructureType;
    internalStructures: Record<string, IInternalStructure>;
    hasUnsavedChanges: boolean;
    deleteFilters: Record<string, boolean>;
    rotation: number;
}

export interface IGridMapContext extends IGridMapState {
    setZonesByLevel: React.Dispatch<React.SetStateAction<Record<number, IZone[]>>>;
    setCallesMatrix: React.Dispatch<React.SetStateAction<any>>;
    setMurosMatrix: React.Dispatch<React.SetStateAction<any>>;
    setDirectionsMatrix: React.Dispatch<React.SetStateAction<any>>;
    setCurrentLevel: React.Dispatch<React.SetStateAction<number>>;
    setMaxLevel: React.Dispatch<React.SetStateAction<number>>;
    setSelectedElementId: React.Dispatch<React.SetStateAction<string | null>>;
    setSelectedElementIds: React.Dispatch<React.SetStateAction<string[]>>;
    setActiveDirections: React.Dispatch<React.SetStateAction<IDirections>>;
    setActiveWalls: React.Dispatch<React.SetStateAction<IDirections>>;
    setRows: React.Dispatch<React.SetStateAction<number>>;
    setCols: React.Dispatch<React.SetStateAction<number>>;
    setActiveAction: (action: GridAction) => void;
    setStructureType: React.Dispatch<React.SetStateAction<StructureType>>;
    setInternalStructures: React.Dispatch<React.SetStateAction<Record<string, IInternalStructure>>>;
    exportMapData: () => IGridMapData;
    importMapData: (data?: IGridMapData | null) => void;
    setDeleteFilters: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    cloneFilters: Record<string, boolean>;
    setCloneFilters: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    rotation: number;
    setRotation: React.Dispatch<React.SetStateAction<number>>;
    warehouseId: string | null;
}

export type GridAction = 'select' | 'create' | 'edit' | 'delete' | 'clear' | 'move' | 'internal_structure' | 'blueprint' | 'clone';


export interface IGroupBlueprint {
    path: string;
    groupDimensions?: { rows: number; cols: number };
    units: {
        path: string;
        subdivisions: { path: string }[];
    }[];
}

export interface IMapStructureTranslation {
    totalGroups: number;
    groupDimensions: { rows: number; cols: number };
    subdivisionsPerUnit: number;
    unitsPerGroup: number;
    totalSubdivisions: number;
    totalEntities: number;
    message: string;
    blueprints: IGroupBlueprint[];
    isBatch?: boolean;
    cloneBundle?: {
        zones: (IZone & { relStart: { row: number, col: number }, relEnd: { row: number, col: number } })[];
        groupDimensions: { rows: number; cols: number };
        matrices?: {
            muros: Record<number, Record<number, any>>;
            directions: Record<number, Record<number, any>>;
            calles: Record<number, Record<number, any>>;
        };
    };
}
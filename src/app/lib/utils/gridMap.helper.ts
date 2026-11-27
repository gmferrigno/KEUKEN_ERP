import { IGroupBlueprint, IMapStructureTranslation, IPlacementRules, IStructureConfig, IZone, StructureType } from "@/types/gridMap.types";
import { MAP_STRUCTURES, ZONE_STYLES } from "../constants/gridMap.constants";
import { IFLocation } from "@repo/api-contracts/erp";

export const resolveZoneStyles = (
    state: { isError?: boolean; isGhost?: boolean; isActive?: boolean; isPreview?: boolean },
    config: IStructureConfig
) => {
    if (state.isError) {
        return ZONE_STYLES.error;
    }
    if (state.isGhost && config.id !== 'Area' && !config.isMatrix) {
        return { ...ZONE_STYLES.ghost, strokeWidth: 1, shadowBlur: 0, shadowColor: 'transparent' };
    }
    if (state.isActive) {
        return { fill: config.drawConfig.activeFill, stroke: config.drawConfig.activeStroke, strokeWidth: 2, shadowBlur: 20, shadowColor: 'rgba(0,0,0,0.5)' };
    }
    if (state.isPreview) {
        return { fill: config.drawConfig.previewFill, stroke: 'rgba(255,255,255,0.4)', strokeWidth: 2, shadowBlur: 0, shadowColor: 'transparent' };
    }

    return {
        fill: config.drawConfig.fill,
        stroke: config.drawConfig.stroke,
        strokeWidth: config.id === 'Grupo' || config.id === 'Unidad' ? 2 : 1,
        shadowBlur: 0,
        shadowColor: 'transparent'
    };
};

export const updatePathInUrl = (path: string | null, searchParams: any, router: any, pathname: string) => {
    const currentPath = searchParams.get('path');
    if (currentPath === path) return;

    const params = new URLSearchParams(searchParams.toString());
    if (path) {
        params.set('path', path);
    } else {
        params.delete('path');
    }
    router.push(`${pathname}?${params.toString()}`);
};

export const checkRangesOverlap = (start1: any, end1: any, start2: any, end2: any) => {
    const minR1 = Math.min(start1.row, end1.row), maxR1 = Math.max(start1.row, end1.row);
    const minC1 = Math.min(start1.col, end1.col), maxC1 = Math.max(start1.col, end1.col);
    const minR2 = Math.min(start2.row, end2.row), maxR2 = Math.max(start2.row, end2.row);
    const minC2 = Math.min(start2.col, end2.col), maxC2 = Math.max(start2.col, end2.col);
    return (minR1 <= maxR2 && maxR1 >= minR2) && (minC1 <= maxC2 && maxC1 >= minC2);
};

export const createInitialMatrix = (r: number, c: number, initialValue: any) => {
    const matrix: Record<number, Record<number, any>> = {};
    Array.from({ length: r }, (_, i) => i + 1).forEach(i => {
        matrix[i] = {};
        Array.from({ length: c }, (_, j) => j + 1).forEach(j => {
            matrix[i][j] = typeof initialValue === 'object' ? { ...initialValue } : initialValue;
        });
    });
    return matrix;
};

export const mutateMatrixArea = (prevMatrix: any, level: number, start: any, end: any, valueFn: (r: number, c: number, prevVal: any) => any) => {
    const minR = Math.min(start.row, end.row), maxR = Math.max(start.row, end.row);
    const minC = Math.min(start.col, end.col), maxC = Math.max(start.col, end.col);

    const nextLevel = { ...(prevMatrix[level] || {}) };
    Array.from({ length: maxR - minR + 1 }, (_, i) => minR + i).forEach(r => {
        nextLevel[r] = { ...(nextLevel[r] || {}) };
        Array.from({ length: maxC - minC + 1 }, (_, j) => minC + j).forEach(c => {
            nextLevel[r][c] = valueFn(r, c, nextLevel[r][c]);
        });
    });

    return { ...prevMatrix, [level]: nextLevel };
};

export const getFirstInternalLocationPath = (locations: IFLocation[]): string | undefined => {
    return locations.find(loc => loc.usage === 'internal')?.path;
};

export const getInternalPathParentCounts = (locations: IFLocation[]): Record<string, number> => {
    const firstInternalPath = getFirstInternalLocationPath(locations);
    if (!firstInternalPath) return {};

    const parentCounts: Record<string, number> = {};
    for (const loc of locations) {
        if (!loc.path) continue;
        const lastDotIndex = loc.path.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            const parentPath = loc.path.substring(0, lastDotIndex);
            parentCounts[parentPath] = (parentCounts[parentPath] || 0) + 1;
        } else {
            parentCounts['warehouse'] = (parentCounts['warehouse'] || 0) + 1;
        }
    }

    const parts = firstInternalPath.split('.');
    const result: Record<string, number> = {};

    for (let i = parts.length - 1; i > 0; i--) {
        const currentPath = parts.slice(0, i).join('.');
        result[currentPath] = parentCounts[currentPath] || 0;
    }

    result['warehouse'] = parentCounts['warehouse'] || 0;

    return result;
};

export const translateMapStructures = (locations: IFLocation[]): IMapStructureTranslation | null => {
    const counts = getInternalPathParentCounts(locations);
    const keys = Object.keys(counts).sort((a, b) => {
        const lenA = a === 'warehouse' ? 0 : a.split('.').length;
        const lenB = b === 'warehouse' ? 0 : b.split('.').length;
        return lenB - lenA;
    });
    if (keys.length === 0) return null;

    const values = keys.map(k => counts[k]);
    const subdivisionsPerUnit = values[0] || 0;
    const unitsPerGroup = values.length > 1 ? values[1] : 1;

    let totalGroups = 1;
    if (values.length > 2) {
        totalGroups = values.slice(2).reduce((acc, val) => acc * val, 1);
    }

    const groupRows = 3;
    const groupCols = unitsPerGroup * 3;

    const blueprints: IGroupBlueprint[] = [];

    const getPathDepth = (path: string) => path === 'warehouse' ? 0 : path.split('.').length;

    const subdivisionDepth = getPathDepth(keys[0]) + 1;
    const unitDepth = keys.length > 1 ? getPathDepth(keys[1]) + 1 : subdivisionDepth - 1;
    const groupDepth = keys.length > 2 ? getPathDepth(keys[2]) + 1 : unitDepth - 1;

    const groupPaths = locations
        .filter(loc => loc.path && getPathDepth(loc.path) === groupDepth)
        .map(loc => loc.path!);

    for (const gPath of groupPaths) {
        const unitPaths = locations
            .filter(loc => {
                if (!loc.path) return false;
                return getPathDepth(loc.path) === unitDepth && loc.path.startsWith(gPath + '.');
            })
            .map(loc => loc.path!);

        const groupUnits = unitPaths.map(uPath => {
            const subdivisionPaths = locations
                .filter(loc => {
                    if (!loc.path) return false;
                    return getPathDepth(loc.path) === subdivisionDepth && loc.path.startsWith(uPath + '.');
                })
                .map(loc => ({ path: loc.path! }));

            return {
                path: uPath,
                subdivisions: subdivisionPaths
            };
        });

        blueprints.push({
            path: gPath,
            groupDimensions: { rows: groupRows, cols: unitPaths.length * 3 },
            units: groupUnits
        });
    }

    const totalUnits = totalGroups * unitsPerGroup;
    const totalSubdivisions = totalUnits * subdivisionsPerUnit;
    const totalEntities = totalGroups + totalUnits + totalSubdivisions;

    const message = `Necesitamos ${totalGroups} grupos de ${groupRows}x${groupCols}. Y cada unidad contendra ${subdivisionsPerUnit} subdivisiones`;

    return {
        totalGroups,
        groupDimensions: { rows: groupRows, cols: groupCols },
        subdivisionsPerUnit,
        unitsPerGroup,
        totalSubdivisions,
        totalEntities,
        message,
        blueprints
    };
};

export const cutPath = (path: string, zoneType: StructureType): string => {
    const parts = path.split('.');
    if (zoneType === 'Unidad') {
        return parts[parts.length - 1];
    }
    return path;
}


export interface IBoundingBox {
    minR: number;
    maxR: number;
    minC: number;
    maxC: number;
}

export const getZoneBoundingBox = (zone: { start: { row: number; col: number }; end: { row: number; col: number } }): IBoundingBox => ({
    minR: Math.min(zone.start.row, zone.end.row),
    maxR: Math.max(zone.start.row, zone.end.row),
    minC: Math.min(zone.start.col, zone.end.col),
    maxC: Math.max(zone.start.col, zone.end.col),
});

export const getMultiZoneBoundingBox = (zones: { start: { row: number; col: number }; end: { row: number; col: number } }[]): IBoundingBox => {
    let minR = Infinity, maxR = -Infinity, minC = Infinity, maxC = -Infinity;
    for (const z of zones) {
        const bb = getZoneBoundingBox(z);
        minR = Math.min(minR, bb.minR);
        maxR = Math.max(maxR, bb.maxR);
        minC = Math.min(minC, bb.minC);
        maxC = Math.max(maxC, bb.maxC);
    }
    return { minR, maxR, minC, maxC };
};

export const isCellInZone = (r: number, c: number, start: { row: number; col: number }, end: { row: number; col: number }): boolean => {
    const minRow = Math.min(start.row, end.row);
    const maxRow = Math.max(start.row, end.row);
    const minCol = Math.min(start.col, end.col);
    const maxCol = Math.max(start.col, end.col);
    return r >= minRow && r <= maxRow && c >= minCol && c <= maxCol;
};

export const rotateCoords = (
    rS: number, cS: number, rE: number, cE: number,
    H: number, W: number, angle: number
): { rS: number; cS: number; rE: number; cE: number } => {
    const normAngle = (angle + 360) % 360;
    if (normAngle === 0) return { rS, cS, rE, cE };
    if (normAngle === 90) return { rS: cS, rE: cE, cS: H - 1 - rE, cE: H - 1 - rS };
    if (normAngle === 180) return { rS: H - 1 - rE, rE: H - 1 - rS, cS: W - 1 - cE, cE: W - 1 - cS };
    if (normAngle === 270) return { rS: W - 1 - cE, rE: W - 1 - cS, cS: rS, cE: rE };
    return { rS, cS, rE, cE };
};

export const rotateDirections = (dirs: any, currentRotation: number): any => {
    if (!dirs) return dirs;
    const times = (currentRotation / 90) % 4;
    let result = { ...dirs };
    for (let t = 0; t < times; t++) {
        result = { up: result.left, right: result.up, down: result.right, left: result.down };
    }
    return result;
};

export const getBlueprintBatchDimensions = (
    pendingStructure: IMapStructureTranslation,
    rotation: number
) => {
    if (pendingStructure.cloneBundle) {
        let bRows = pendingStructure.cloneBundle.groupDimensions.rows;
        let bCols = pendingStructure.cloneBundle.groupDimensions.cols;
        if (rotation % 180 !== 0) {
            const tmp = bRows;
            bRows = bCols;
            bCols = tmp;
        }
        return { totalRows: bRows, maxCols: bCols, processed: [] };
    }
    const blueprints = pendingStructure.isBatch ? pendingStructure.blueprints : [pendingStructure.blueprints?.[0]];
    let totalRows = 0;
    let maxCols = 0;

    const processed = (blueprints || []).filter(Boolean).map(bp => {
        let { rows: bRows, cols: bCols } = bp.groupDimensions || pendingStructure.groupDimensions;
        const origH = bRows;
        const origW = bCols;

        if (rotation % 180 !== 0) {
            const tmp = bRows;
            bRows = bCols;
            bCols = tmp;
        }

        return {
            blueprint: bp,
            bRows,
            bCols,
            origH,
            origW
        };
    });

    processed.forEach(p => {
        totalRows += p.bRows;
        maxCols = Math.max(maxCols, p.bCols);
    });

    return { totalRows, maxCols, processed };
};


interface IMatrixDefaults {
    calles: any;
    muros: any;
    directions: any;
}

const DEFAULT_MATRIX_VALUES: IMatrixDefaults = {
    calles: true,
    muros: { up: false, down: false, left: false, right: false },
    directions: { up: true, down: true, left: true, right: true },
};

export const expandMatrixRange = (
    prev: any, levels: number[],
    axis: 'rows' | 'cols',
    oldSize: number, newSize: number,
    crossSize: number,
    defaultValue: any
): any => {
    const newState = { ...prev };
    levels.forEach(lvl => {
        const next = { ...(newState[lvl] || {}) };
        if (axis === 'rows') {
            for (let r = oldSize + 1; r <= newSize; r++) {
                next[r] = {};
                for (let c = 1; c <= crossSize; c++) {
                    next[r][c] = typeof defaultValue === 'object' ? { ...defaultValue } : defaultValue;
                }
            }
        } else {
            for (let r = 1; r <= crossSize; r++) {
                next[r] = { ...(next[r] || {}) };
                for (let c = oldSize + 1; c <= newSize; c++) {
                    next[r][c] = typeof defaultValue === 'object' ? { ...defaultValue } : defaultValue;
                }
            }
        }
        newState[lvl] = next;
    });
    return newState;
};

export const shrinkMatrixRange = (
    prev: any, levels: number[],
    axis: 'rows' | 'cols',
    oldSize: number, newSize: number,
    crossSize: number
): any => {
    const newState = { ...prev };
    levels.forEach(lvl => {
        const next = { ...(newState[lvl] || {}) };
        if (axis === 'rows') {
            for (let r = newSize + 1; r <= oldSize; r++) {
                delete next[r];
            }
        } else {
            for (let r = 1; r <= crossSize; r++) {
                if (next[r]) {
                    const newRow = { ...next[r] };
                    for (let c = newSize + 1; c <= oldSize; c++) {
                        delete newRow[c];
                    }
                    next[r] = newRow;
                }
            }
        }
        newState[lvl] = next;
    });
    return newState;
};

export { DEFAULT_MATRIX_VALUES };


export interface IValidationContext {
    start: { row: number, col: number };
    end: { row: number, col: number };
    type: StructureType;
    level: number;
    excludeIds: string[];
    ignoreParentCheck: boolean;
    rows: number;
    cols: number;
    levels: number[];
    zonesByLevel: Record<number, IZone[]>;
    murosMatrix: any;
    zones: IZone[];
    baseLevel: number;
}

export const validateBoundaries = (ctx: IValidationContext) => {
    const nMinR = Math.min(ctx.start.row, ctx.end.row);
    const nMaxR = Math.max(ctx.start.row, ctx.end.row);
    const nMinC = Math.min(ctx.start.col, ctx.end.col);
    const nMaxC = Math.max(ctx.start.col, ctx.end.col);

    if (nMinR < 1 || nMaxR > ctx.rows || nMinC < 1 || nMaxC > ctx.cols) {
        return { isValid: false, error: "Fuera de los límites de la grilla." };
    }
    return { isValid: true };
};

export const validateOverlaps = (ctx: IValidationContext, rules: IPlacementRules) => {
    if (rules.collisionScore !== 0) return { isValid: true };
    const forbidden = rules.forbiddenOverlaps || [];

    for (let l = ctx.level; l <= Math.max(...ctx.levels, ctx.level); l++) {
        const levelZones = ctx.zonesByLevel[l] || [];
        const overlap = levelZones.find(z => {
            if (ctx.excludeIds.includes(z.id)) return false;
            if (rules.requiresParent === z.type) return false;

            const otherConfig = MAP_STRUCTURES[z.type];
            const otherRules = otherConfig?.placementRules;

            const isForbidden = forbidden.includes(z.type);
            const isOtherExclusive = otherRules?.collisionScore === 0;

            if (isForbidden || (isOtherExclusive && z.type !== 'Area')) {
                return checkRangesOverlap(ctx.start, ctx.end, z.start, z.end);
            }
            return false;
        });
        if (overlap) return { isValid: false, error: `Colisión con ${overlap.type} en Nivel ${l}.` };
    }
    return { isValid: true };
};

export const validateSpecificGround = (ctx: IValidationContext, rules: IPlacementRules) => {
    if (ctx.level !== ctx.baseLevel || !rules.mustBeOnSpecificGround) return { isValid: true };
    const nMinR = Math.min(ctx.start.row, ctx.end.row);
    const nMaxR = Math.max(ctx.start.row, ctx.end.row);
    const nMinC = Math.min(ctx.start.col, ctx.end.col);
    const nMaxC = Math.max(ctx.start.col, ctx.end.col);
    const targetMatrix = ctx.murosMatrix[ctx.baseLevel];

    for (let r = nMinR; r <= nMaxR; r++) {
        for (let c = nMinC; c <= nMaxC; c++) {
            if (!targetMatrix?.[r]?.[c]) {
                const isOccupiedByMovingItem = ctx.excludeIds.some(id => {
                    const z = ctx.zonesByLevel[ctx.baseLevel]?.find(zone => zone.id === id);
                    return z && isCellInZone(r, c, z.start, z.end);
                });
                if (!isOccupiedByMovingItem) {
                    return { isValid: false, error: `Debe colocarse sobre ${rules.mustBeOnSpecificGround}.` };
                }
            }
        }
    }
    return { isValid: true };
};

export const validateWallCollisions = (ctx: IValidationContext, rules: IPlacementRules) => {
    if (ctx.level !== ctx.baseLevel || rules.collisionScore !== 0) return { isValid: true };
    if (ctx.type !== 'Grupo' && ctx.type !== 'Unidad') return { isValid: true };

    const nMinR = Math.min(ctx.start.row, ctx.end.row);
    const nMaxR = Math.max(ctx.start.row, ctx.end.row);
    const nMinC = Math.min(ctx.start.col, ctx.end.col);
    const nMaxC = Math.max(ctx.start.col, ctx.end.col);

    for (let r = nMinR; r <= nMaxR; r++) {
        for (let c = nMinC; c <= nMaxC; c++) {
            const murosCell = ctx.murosMatrix[ctx.baseLevel]?.[r]?.[c];
            if (murosCell) {
                const isInternalR = r > nMinR && r < nMaxR;
                const isInternalC = c > nMinC && c < nMaxC;

                if (isInternalR && (murosCell.up || murosCell.down)) return { isValid: false, error: 'La estructura choca con un muro transversal.' };
                if (isInternalC && (murosCell.left || murosCell.right)) return { isValid: false, error: 'La estructura choca con un muro transversal.' };

                if (r === nMinR && murosCell.down && nMaxR > nMinR) return { isValid: false, error: 'La estructura intersecta un muro interior.' };
                if (r === nMaxR && murosCell.up && nMaxR > nMinR) return { isValid: false, error: 'La estructura intersecta un muro interior.' };
                if (c === nMinC && murosCell.right && nMaxC > nMinC) return { isValid: false, error: 'La estructura intersecta un muro interior.' };
                if (c === nMaxC && murosCell.left && nMaxC > nMinC) return { isValid: false, error: 'La estructura intersecta un muro interior.' };
            }
        }
    }
    return { isValid: true };
};

export const validateParentContainment = (ctx: IValidationContext, rules: IPlacementRules) => {
    if (!rules.requiresParent || ctx.ignoreParentCheck) return { isValid: true };

    const nMinR = Math.min(ctx.start.row, ctx.end.row);
    const nMaxR = Math.max(ctx.start.row, ctx.end.row);
    const nMinC = Math.min(ctx.start.col, ctx.end.col);
    const nMaxC = Math.max(ctx.start.col, ctx.end.col);

    const parentZone = ctx.zones.find(zone => {
        if (zone.type !== rules.requiresParent) return false;
        const zMinR = Math.min(zone.start.row, zone.end.row);
        const zMaxR = Math.max(zone.start.row, zone.end.row);
        const zMinC = Math.min(zone.start.col, zone.end.col);
        const zMaxC = Math.max(zone.start.col, zone.end.col);
        return nMinR >= zMinR && nMaxR <= zMaxR && nMinC >= zMinC && nMaxC <= zMaxC;
    });

    if (!parentZone) {
        return { isValid: false, error: `Debe estar contenido en un ${rules.requiresParent}.` };
    }
    return { isValid: true };
};

export const validateLevelSupport = (ctx: IValidationContext, rules: IPlacementRules) => {
    if (!rules.levelRequirements?.mustBeContainedByLowerLevel || ctx.level <= ctx.baseLevel || ctx.ignoreParentCheck) return { isValid: true };

    const predecessorLevel = ctx.level - 1;
    const levelZones = ctx.zonesByLevel[predecessorLevel] || [];

    const nMinR = Math.min(ctx.start.row, ctx.end.row);
    const nMaxR = Math.max(ctx.start.row, ctx.end.row);
    const nMinC = Math.min(ctx.start.col, ctx.end.col);
    const nMaxC = Math.max(ctx.start.col, ctx.end.col);

    for (let r = nMinR; r <= nMaxR; r++) {
        for (let c = nMinC; c <= nMaxC; c++) {
            const hasSupport = levelZones.some(z => z.type === 'Grupo' &&
                r >= Math.min(z.start.row, z.end.row) && r <= Math.max(z.start.row, z.end.row) &&
                c >= Math.min(z.start.col, z.end.col) && c <= Math.max(z.start.col, z.end.col));
            if (!hasSupport) {
                return { isValid: false, error: `La estructura debe estar 100% apoyada sobre Grupos del Nivel ${predecessorLevel}.` };
            }
        }
    }
    return { isValid: true };
};

export const runPlacementValidations = (ctx: IValidationContext): { isValid: boolean; error?: string } => {
    const config = MAP_STRUCTURES[ctx.type];
    if (!config || !config.placementRules) return { isValid: true };
    const rules = config.placementRules;

    const boundaryCheck = validateBoundaries(ctx);
    if (!boundaryCheck.isValid) return boundaryCheck;

    const overlapCheck = validateOverlaps(ctx, rules);
    if (!overlapCheck.isValid) return overlapCheck;

    const groundCheck = validateSpecificGround(ctx, rules);
    if (!groundCheck.isValid) return groundCheck;

    const wallCheck = validateWallCollisions(ctx, rules);
    if (!wallCheck.isValid) return wallCheck;

    const parentCheck = validateParentContainment(ctx, rules);
    if (!parentCheck.isValid) return parentCheck;

    const levelCheck = validateLevelSupport(ctx, rules);
    if (!levelCheck.isValid) return levelCheck;

    return { isValid: true };
};

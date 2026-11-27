import { IDrawElementProps, IStructureActions, IStructureConfig, StructureType } from "@/types/gridMap.types";
import { mutateMatrixArea } from "../utils/gridMap.helper";

export const defaultBoxInteraction: IStructureActions = {
    onPointerDown: (ctx, config) => {
        if (ctx.e.evt.button !== 0) return;
        const stage = ctx.e.target.getStage();
        const pointerPos = stage.getRelativePointerPosition();
        const col = Math.floor(pointerPos.x / ctx.canvaSize) + 1;
        const row = Math.floor(pointerPos.y / ctx.canvaSize) + 1;

        if (col < 1 || col > ctx.cols || row < 1 || row > ctx.rows) return;
        ctx.setIsSelecting(true);
        ctx.setSelectionStart({ row, col });
        ctx.setSelectionEnd({ row, col });
    },
    onPointerMove: (ctx, config) => {
        if (!ctx.isSelecting || !ctx.selectionStart) return;
        const stage = ctx.e.target.getStage();
        const pointerPos = stage.getRelativePointerPosition();
        let targetCol = Math.floor(pointerPos.x / ctx.canvaSize) + 1;
        let targetRow = Math.floor(pointerPos.y / ctx.canvaSize) + 1;

        const snapFactor = config.minSize;

        const diffR = Math.abs(targetRow - ctx.selectionStart.row) + 1;
        const snappedDiffR = Math.max(snapFactor, Math.round(diffR / snapFactor) * snapFactor);
        let snappedRow = targetRow >= ctx.selectionStart.row
            ? ctx.selectionStart.row + snappedDiffR - 1
            : ctx.selectionStart.row - snappedDiffR + 1;

        const diffC = Math.abs(targetCol - ctx.selectionStart.col) + 1;
        const snappedDiffC = Math.max(snapFactor, Math.round(diffC / snapFactor) * snapFactor);
        let snappedCol = targetCol >= ctx.selectionStart.col
            ? ctx.selectionStart.col + snappedDiffC - 1
            : ctx.selectionStart.col - snappedDiffC + 1;

        if (config.maxSize) {
            const currentDR = Math.abs(snappedRow - ctx.selectionStart.row) + 1;
            const currentDC = Math.abs(snappedCol - ctx.selectionStart.col) + 1;
            if (currentDR > config.maxSize) {
                snappedRow = targetRow >= ctx.selectionStart.row
                    ? ctx.selectionStart.row + config.maxSize - 1
                    : ctx.selectionStart.row - config.maxSize + 1;
            }
            if (currentDC > config.maxSize) {
                snappedCol = targetCol >= ctx.selectionStart.col
                    ? ctx.selectionStart.col + config.maxSize - 1
                    : ctx.selectionStart.col - config.maxSize + 1;
            }
        }

        const row = Math.max(1, Math.min(ctx.rows, snappedRow));
        const col = Math.max(1, Math.min(ctx.cols, snappedCol));

        ctx.setSelectionEnd({ row, col });
    },
    onPointerUp: (ctx, config) => {
        if (ctx.e.evt.button !== 0) return;
        ctx.setIsSelecting(false);
        if (ctx.selectionStart && ctx.selectionEnd) {
            ctx.finalizeZone(ctx.selectionStart, ctx.selectionEnd);
        }
        ctx.setSelectionStart(null);
        ctx.setSelectionEnd(null);
    }
};

export const BASE_LEVEL = 0;

export const MAP_STRUCTURES: Record<StructureType, IStructureConfig> = {
    Grupo: {
        id: 'Grupo', label: 'Grupo', icon: 'box', hasLevel: true, minSize: 3, isMatrix: false, showInnerGrid: true,
        canDelete: true, canMove: true, clearUnderneath: false,
        placementRules: { collisionScore: 0, forbiddenOverlaps: ['Grupo'], levelRequirements: { mustBeContainedByLowerLevel: true } },
        actions: {
            ...defaultBoxInteraction,
            onFinalize: (ctx) => {
                const check = ctx.validatePlacement(ctx.structureType, ctx.start, ctx.end, ctx.currentLevel);
                if (!check.isValid) return ctx.notify(check.error ?? 'Error al validar superposición', 'error', 2000);

                ctx.addZone();
                if (ctx.targetLvlToAdd === BASE_LEVEL && MAP_STRUCTURES['Grupo']?.clearUnderneath) ctx.clearUnderneath();
            }
        },

        drawConfig: { fill: 'rgba(47, 105, 192, 0.9)', stroke: 'rgba(47, 105, 192, 1)', activeFill: 'rgba(56,189,248,0.7)', activeStroke: 'rgba(56,189,248,0.8)', previewFill: 'rgba(56,189,248,0.2)', zIndex: 40, getPadding: () => 6, getMargin: () => 4 }
    },
    Unidad: {
        id: 'Unidad', label: 'Unidad', icon: 'menu', hasLevel: true, minSize: 1, maxSize: 3, isMatrix: false,
        canDelete: true, canMove: false,
        placementRules: { collisionScore: 0, requiresParent: 'Grupo', forbiddenOverlaps: ['Unidad'], levelRequirements: { mustBeContainedByLowerLevel: true } },
        actions: {
            ...defaultBoxInteraction,
            onFinalize: (ctx) => {
                const check = ctx.validatePlacement(ctx.structureType, ctx.start, ctx.end, ctx.currentLevel);
                if (!check.isValid) return ctx.notify(check.error ?? 'Error al validar superposición', 'error', 2000);

                const { parentZone } = ctx.checkContainmentInGroup(ctx.start, ctx.end);
                ctx.addZone(parentZone?.id);
            }
        },

        drawConfig: { fill: 'rgba(16,185,129,0.5)', stroke: 'rgba(16,185,129,0.8)', activeFill: 'rgba(16,185,129,0.7)', activeStroke: 'rgba(16,185,129,1)', previewFill: 'rgba(16,185,129,0.2)', zIndex: 50, getPadding: () => 8 }
    },
    Area: {
        id: 'Area', label: 'Área', icon: 'map', hasLevel: false, minSize: 1, isMatrix: false,
        canDelete: true, canMove: true,
        placementRules: { collisionScore: -1 },
        actions: {
            ...defaultBoxInteraction,
            onFinalize: (ctx) => ctx.addZone()
        },

        drawConfig: { fill: 'rgba(168,85,247,0.3)', stroke: 'rgba(168,85,247,0.1)', activeFill: 'rgba(168,85,247,0.5)', activeStroke: 'rgba(168,85,247,0.8)', previewFill: 'rgba(168,85,247,0.2)', zIndex: 10, getPadding: () => 0 }
    },

    Muro: {
        id: 'Muro', label: 'Muro', icon: 'clear', hasLevel: false, minSize: 1, isMatrix: true,
        canClear: true, canMove: false,
        placementRules: { collisionScore: -1 },
        actions: {
            ...defaultBoxInteraction,
            onFinalize: (ctx) => {
                const dr = Math.abs(ctx.start.row - ctx.end.row);
                const dc = Math.abs(ctx.start.col - ctx.end.col);

                if (dr > 0 && dc > 0) {
                    return ctx.notify("Los muros deben trazarse como líneas (1xN o Nx1)", "warning", 2000);
                }

                ctx.setMurosMatrix((prevMuros: any) => {
                    const minR = Math.min(ctx.start.row, ctx.end.row);
                    const maxR = Math.max(ctx.start.row, ctx.end.row);
                    const minC = Math.min(ctx.start.col, ctx.end.col);
                    const maxC = Math.max(ctx.start.col, ctx.end.col);

                    const nextLevel = { ...(prevMuros[ctx.targetLvlToAdd] || {}) };

                    const toggleWall = (r: number, c: number, face: "up" | "down" | "left" | "right") => {
                        if (r < 1 || r > ctx.rows || c < 1 || c > ctx.cols) return;
                        nextLevel[r] = { ...(nextLevel[r] || {}) };
                        const current = nextLevel[r][c] || { up: false, down: false, left: false, right: false };
                        nextLevel[r][c] = { ...current, [face]: !current[face] };
                    };

                    for (let r = minR; r <= maxR; r++) {
                        for (let c = minC; c <= maxC; c++) {
                            const currentZones = ctx.zonesByLevel[ctx.targetLvlToAdd] || [];
                            const isInternalToStructure = currentZones.some(z => {
                                if (z.type === 'Area') return false;
                                const zMinR = Math.min(z.start.row, z.end.row);
                                const zMaxR = Math.max(z.start.row, z.end.row);
                                const zMinC = Math.min(z.start.col, z.end.col);
                                const zMaxC = Math.max(z.start.col, z.end.col);

                                const isCellInside = r >= zMinR && r <= zMaxR && c >= zMinC && c <= zMaxC;
                                if (!isCellInside) return false;

                                if (ctx.activeWalls.up && r > zMinR) return true;
                                if (ctx.activeWalls.down && r < zMaxR) return true;
                                if (ctx.activeWalls.left && c > zMinC) return true;
                                if (ctx.activeWalls.right && c < zMaxC) return true;

                                return false;
                            });

                            if (isInternalToStructure) {
                                ctx.notify("No se pueden colocar muros cruzando estructuras. Solo en sus bordes externos.", "warning", 2000);
                                continue;
                            }

                            if (ctx.activeWalls.up) { toggleWall(r, c, "up"); toggleWall(r - 1, c, "down"); }
                            if (ctx.activeWalls.down) { toggleWall(r, c, "down"); toggleWall(r + 1, c, "up"); }
                            if (ctx.activeWalls.left) { toggleWall(r, c, "left"); toggleWall(r, c - 1, "right"); }
                            if (ctx.activeWalls.right) { toggleWall(r, c, "right"); toggleWall(r, c + 1, "left"); }
                        }
                    }

                    const nextMuros = { ...prevMuros, [ctx.targetLvlToAdd]: nextLevel };

                    ctx.setDirectionsMatrix((prevDirs: any) => {
                        const startWithNeighbors = { row: Math.max(1, minR - 1), col: Math.max(1, minC - 1) };
                        const endWithNeighbors = { row: Math.min(ctx.rows || 100, maxR + 1), col: Math.min(ctx.cols || 100, maxC + 1) };

                        return mutateMatrixArea(prevDirs, ctx.targetLvlToAdd, startWithNeighbors, endWithNeighbors, (r, c, oldDir) => {
                            const isStreet = ctx.callesMatrix[ctx.targetLvlToAdd]?.[r]?.[c];
                            if (!isStreet) return oldDir;

                            const walls = nextMuros[ctx.targetLvlToAdd][r]?.[c] || {};
                            const upWall = nextMuros[ctx.targetLvlToAdd]?.[r - 1]?.[c]?.down || false;
                            const downWall = nextMuros[ctx.targetLvlToAdd]?.[r + 1]?.[c]?.up || false;
                            const leftWall = nextMuros[ctx.targetLvlToAdd]?.[r]?.[c - 1]?.right || false;
                            const rightWall = nextMuros[ctx.targetLvlToAdd]?.[r]?.[c + 1]?.left || false;

                            return {
                                up: !walls.up && !upWall,
                                down: !walls.down && !downWall,
                                left: !walls.left && !leftWall,
                                right: !walls.right && !rightWall,
                            };
                        });
                    });

                    return nextMuros;
                });
            }
        },

        drawConfig: { fill: 'rgba(119, 5, 5, 0.9)', stroke: 'rgba(110, 9, 9, 1)', activeFill: 'rgba(126, 21, 21, 0.7)', activeStroke: 'rgba(175, 0, 0, 1)', previewFill: 'rgba(138, 1, 1, 0.4)', zIndex: 65, getPadding: () => 0 }
    },
    Direcciones: {
        id: 'Direcciones', label: 'Direcciones', icon: 'arrowright', hasLevel: false, minSize: 1, isMatrix: true,
        canClear: true, canMove: false,
        placementRules: { collisionScore: -1 },
        actions: {
            ...defaultBoxInteraction,
            onFinalize: (ctx) => {
                ctx.setDirectionsMatrix((prev: any) =>
                    mutateMatrixArea(prev, ctx.targetLvlToAdd, ctx.start, ctx.end, (r, c, prevVal) => {
                        if (!ctx.callesMatrix[ctx.targetLvlToAdd]?.[r]?.[c]) return prevVal;
                        const walls = ctx.murosMatrix[ctx.targetLvlToAdd]?.[r]?.[c] || {};

                        const upWall = ctx.murosMatrix[ctx.targetLvlToAdd]?.[r - 1]?.[c]?.down || false;
                        const downWall = ctx.murosMatrix[ctx.targetLvlToAdd]?.[r + 1]?.[c]?.up || false;
                        const leftWall = ctx.murosMatrix[ctx.targetLvlToAdd]?.[r]?.[c - 1]?.right || false;
                        const rightWall = ctx.murosMatrix[ctx.targetLvlToAdd]?.[r]?.[c + 1]?.left || false;

                        return {
                            up: ctx.activeDirections.up && !walls.up && !upWall,
                            down: ctx.activeDirections.down && !walls.down && !downWall,
                            left: ctx.activeDirections.left && !walls.left && !leftWall,
                            right: ctx.activeDirections.right && !walls.right && !rightWall,
                        };
                    })
                );
            }
        },

        drawConfig: { fill: 'rgba(255,255,255,0.2)', stroke: 'rgba(255,255,255,0.4)', activeFill: 'rgba(255,255,255,0.4)', activeStroke: 'rgba(255,255,255,0.8)', previewFill: 'rgba(56,189,248,0.2)', zIndex: 60, getPadding: () => 0 }
    }
};

export const DEFAULT_SHAPE = {
    draw: (context: any, shape: any, config: IDrawElementProps, canvaSize?: number) => {
        const { padding = 0, x, y, width, height, subdivisions, innerGridSize, text, textColor = 'rgba(255,255,255,0.8)' } = config;

        const pads = typeof padding === 'number'
            ? { top: padding, right: padding, bottom: padding, left: padding }
            : { top: padding.top ?? 0, right: padding.right ?? 0, bottom: padding.bottom ?? 0, left: padding.left ?? 0 };

        const px = x + pads.left;
        const py = y + pads.top;
        const w = width - (pads.left + pads.right);
        const h = height - (pads.top + pads.bottom);
        const r = 4;

        context.beginPath();
        if (w < 2 * r || h < 2 * r) {
            context.rect(px, py, w, h);
        } else {
            context.moveTo(px + r, py);
            context.lineTo(px + w - r, py);
            context.quadraticCurveTo(px + w, py, px + w, py + r);
            context.lineTo(px + w, py + h - r);
            context.quadraticCurveTo(px + w, py + h, px + w - r, py + h);
            context.lineTo(px + r, py + h);
            context.quadraticCurveTo(px, py + h, px, py + h - r);
            context.lineTo(px, py + r);
            context.quadraticCurveTo(px, py, px + r, py);
            context.closePath();
        }
        context.fillStrokeShape(shape);

        GRID_CONFIG.drawInternalGrid(
            context, px, py, w, h, x, y, width, height, pads,
            subdivisions, innerGridSize, canvaSize
        );

        if (config.cornerTexts || text) {
            const mergedTexts = { ...config.cornerTexts, center: text || config.cornerTexts?.center };
            TEXT_CONFIG.drawCornerTexts(context, mergedTexts, px, py, w, h, 5, textColor);
        }
    }
};


export const TEXT_CONFIG = {
    drawPill: (context: any, text: string, px: number, py: number, margin: number) => {
        const textWidth = context.measureText(text).width;
        const pillHeight = 16;
        const pillWidth = textWidth + 12;
        const pillX = px + margin - 4;
        const pillY = py + margin - 3;
        const r = pillHeight / 6;

        context.save();
        context.beginPath();
        context.fillStyle = "rgba(0, 0, 0, 0.85)";
        context.moveTo(pillX + r, pillY);
        context.lineTo(pillX + pillWidth - r, pillY);
        context.quadraticCurveTo(pillX + pillWidth, pillY, pillX + pillWidth, pillY + r);
        context.lineTo(pillX + pillWidth, pillY + pillHeight - r);
        context.quadraticCurveTo(pillX + pillWidth, pillY + pillHeight, pillX + pillWidth - r, pillY + pillHeight);
        context.lineTo(pillX + r, pillY + pillHeight);
        context.quadraticCurveTo(pillX, pillY + pillHeight, pillX, pillY + pillHeight - r);
        context.lineTo(pillX, pillY + r);
        context.quadraticCurveTo(pillX, pillY, pillX + r, pillY);
        context.closePath();
        context.fill();

        context.fillStyle = "#ffffff";
        context.textAlign = "left";
        context.textBaseline = "top";
        context.fillText(text, px + margin + 2, py + margin + 1);
        context.restore();
    },
    drawCornerTexts: (
        context: any,
        cornerTexts: { topLeft?: string; topRight?: string; bottomLeft?: string; bottomRight?: string; center?: string; isTitle?: boolean },
        px: number,
        py: number,
        w: number,
        h: number,
        margin: number,
        textColor: string
    ) => {
        const { topLeft, topRight, bottomLeft, bottomRight, center, isTitle } = cornerTexts;

        if (topLeft) {
            context.font = "bold 9px monospace";
            if (isTitle) {
                TEXT_CONFIG.drawPill(context, topLeft, px, py, margin);
            } else {
                context.fillStyle = textColor;
                context.textAlign = "left";
                context.textBaseline = "top";
                context.fillText(topLeft, px + margin, py + margin);
            }
        }
        if (topRight) {
            context.font = "bold 9px monospace";
            context.fillStyle = textColor;
            context.textAlign = "right";
            context.textBaseline = "top";
            context.fillText(topRight, px + w - margin, py + margin);
        }
        if (bottomLeft) {
            context.font = "bold 9px monospace";
            context.fillStyle = textColor;
            context.textAlign = "left";
            context.textBaseline = "bottom";
            context.fillText(bottomLeft, px + margin, py + h - margin);
        }
        if (bottomRight) {
            context.font = "bold 5px monospace";
            context.textAlign = "right";
            context.textBaseline = "bottom";
            context.fillStyle = "#ffffff4d";
            context.fillText(bottomRight, px + w - margin, py + h - margin);
        }
        if (center) {
            const lines = center.split('\n');
            context.font = "bold 9px monospace";
            context.fillStyle = textColor;
            context.textAlign = "center";
            context.textBaseline = "middle";
            lines.forEach((line: string, i: number) => {
                context.fillText(line, px + w / 2, py + h / 2 + (i - (lines.length - 1) / 2) * 11);
            });
        }
    }
};

export const GRID_CONFIG = {
    drawInternalGrid: (
        context: any,
        px: number, py: number, w: number, h: number,
        x: number, y: number, width: number, height: number,
        pads: { top: number, right: number, bottom: number, left: number },
        subdivisions?: { rows: number, cols: number },
        innerGridSize?: number,
        canvaSize?: number
    ) => {
        if (subdivisions && subdivisions.rows > 0 && subdivisions.cols > 0) {
            context.beginPath();
            context.setLineDash([]);
            context.strokeStyle = 'rgba(16, 185, 129, 1)';
            context.lineWidth = 1;

            const { rows: sRows, cols: sCols } = subdivisions;

            for (let i = 1; i < sCols; i++) {
                const lx = px + (i * w) / sCols;
                context.moveTo(lx, py);
                context.lineTo(lx, py + h);
            }
            for (let i = 1; i < sRows; i++) {
                const ly = py + (i * h) / sRows;
                context.moveTo(px, ly);
                context.lineTo(px + w, ly);
            }
            context.stroke();
        }

        if (innerGridSize && innerGridSize > 0 && canvaSize) {
            context.beginPath();
            context.setLineDash([2, 5]);
            context.strokeStyle = 'rgba(255, 255, 255, 0.15)';
            context.lineWidth = 0.5;
            const step = innerGridSize * canvaSize;

            const startX = step - (x % step);
            for (let lx = startX; lx < width - pads.right; lx += step) {
                if (lx > pads.left) {
                    context.moveTo(x + lx, py);
                    context.lineTo(x + lx, py + h);
                }
            }

            const startY = step - (y % step);
            for (let ly = startY; ly < height - pads.bottom; ly += step) {
                if (ly > pads.top) {
                    context.moveTo(px, y + ly);
                    context.lineTo(px + w, y + ly);
                }
            }
            context.stroke();
            context.setLineDash([]);
        }
    }
};

export const ZONE_STYLES = {
    error: { fill: 'rgba(250,204,21,0.3)', stroke: 'rgba(250,204,21,1)', strokeWidth: 3, shadowBlur: 15, shadowColor: 'rgba(250,204,21,0.5)' },
    ghost: { fill: 'rgba(255,255,255,0.05)', stroke: 'rgba(255,255,255,0.1)' }
};

export { DX_ICON_MAP } from '@repo/icons/dx';

export const PATTERNS = [
    { id: 'zigzag', icon: 'Z' },
    { id: 'linear', icon: 'S' },
    { id: 'spiral', icon: 'O' },
    { id: 'vertical', icon: 'I' },
    { id: 'horizontal', icon: 'H' },
];

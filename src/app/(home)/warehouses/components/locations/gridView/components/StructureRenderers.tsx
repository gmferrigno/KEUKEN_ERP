
import { IDirections, IZone, StructureType } from "@/types/gridMap.types";
import React from 'react';
import { Shape } from 'react-konva';

import { BASE_LEVEL, DX_ICON_MAP, MAP_STRUCTURES } from '@/app/lib/constants/gridMap.constants';

interface StructureRenderContext {
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
    renderKonvaZone: (z: IZone, isGhost?: boolean, isPreview?: boolean) => any;
    drawIcon: (context: any, iconName: keyof typeof DX_ICON_MAP, cx: number, cy: number, size: number, color?: string) => void;
}

interface PreviewRenderContext {
    start: { row: number; col: number };
    end: { row: number; col: number };
    canvaSize: number;
    activeWalls: IDirections;
    activeDirections: IDirections;
}


const renderGrupo = (ctx: StructureRenderContext) => (
    <React.Fragment key="Grupo">
        {ctx.levels.filter(lvl => lvl < ctx.currentLevel).map(lvl => (
            <React.Fragment key={`grupo-lvl-${lvl}`}>
                {ctx.zonesByLevel[lvl]?.filter(z => z.type === 'Grupo').map(z => (
                    <React.Fragment key={z.id}>{ctx.renderKonvaZone(z, true)}</React.Fragment>
                ))}
            </React.Fragment>
        ))}
        {ctx.zones.filter(z => z.type === 'Grupo').map(z => (
            <React.Fragment key={z.id}>{ctx.renderKonvaZone(z)}</React.Fragment>
        ))}
    </React.Fragment>
);

const renderUnidad = (ctx: StructureRenderContext) => (
    <React.Fragment key="Unidad">
        {ctx.zones.filter(z => z.type === 'Unidad').map(z => (
            <React.Fragment key={z.id}>{ctx.renderKonvaZone(z)}</React.Fragment>
        ))}
    </React.Fragment>
);

const renderArea = (ctx: StructureRenderContext) => (
    <React.Fragment key="Area">
        {ctx.zonesByLevel[BASE_LEVEL]?.filter(z => z.type === 'Area').map(z => (
            <React.Fragment key={z.id}>{ctx.renderKonvaZone(z)}</React.Fragment>
        ))}
    </React.Fragment>
);

const renderMuro = (ctx: StructureRenderContext) => (
    <Shape
        key="Muro"
        sceneFunc={(context, shape) => {
            context.beginPath();
            const currentMuros = ctx.murosMatrix[BASE_LEVEL] || {};
            Object.entries(currentMuros).forEach(([rStr, rowCols]: any) => {
                Object.entries(rowCols).forEach(([cStr, faces]: any) => {
                    if (!faces || (!faces.up && !faces.down && !faces.left && !faces.right)) return;
                    const r = parseInt(rStr), c = parseInt(cStr);
                    const x = (c - 1) * ctx.canvaSize;
                    const y = (r - 1) * ctx.canvaSize;
                    const s = ctx.canvaSize;

                    if (faces.up) { context.moveTo(x, y); context.lineTo(x + s, y); }
                    if (faces.down) { context.moveTo(x, y + s); context.lineTo(x + s, y + s); }
                    if (faces.left) { context.moveTo(x, y); context.lineTo(x, y + s); }
                    if (faces.right) { context.moveTo(x + s, y); context.lineTo(x + s, y + s); }
                });
            });
            context.strokeShape(shape);
        }}
        stroke={MAP_STRUCTURES.Muro.drawConfig.stroke}
        strokeWidth={2}
        listening={false}
    />
);

const renderMuroPreview = (ctx: PreviewRenderContext) => (
    <Shape
        sceneFunc={(context, shape) => {
            context.beginPath();
            const minR = Math.min(ctx.start.row, ctx.end.row);
            const maxR = Math.max(ctx.start.row, ctx.end.row);
            const minC = Math.min(ctx.start.col, ctx.end.col);
            const maxC = Math.max(ctx.start.col, ctx.end.col);

            for (let r = minR; r <= maxR; r++) {
                for (let c = minC; c <= maxC; c++) {
                    const x = (c - 1) * ctx.canvaSize;
                    const y = (r - 1) * ctx.canvaSize;
                    const s = ctx.canvaSize;

                    if (ctx.activeWalls.up) { context.moveTo(x, y); context.lineTo(x + s, y); }
                    if (ctx.activeWalls.down) { context.moveTo(x, y + s); context.lineTo(x + s, y + s); }
                    if (ctx.activeWalls.left) { context.moveTo(x, y); context.lineTo(x, y + s); }
                    if (ctx.activeWalls.right) { context.moveTo(x + s, y); context.lineTo(x + s, y + s); }
                }
            }
            context.strokeShape(shape);
        }}
        stroke={MAP_STRUCTURES.Muro.drawConfig.previewFill}
        strokeWidth={6}
        dash={[4, 4]}
        listening={false}
    />
);

const renderDirecciones = (ctx: StructureRenderContext) => (
    <Shape
        key="Direcciones"
        sceneFunc={(context) => {
            context.beginPath();
            const currentCalles = ctx.callesMatrix[BASE_LEVEL] || {};
            const currentDirs = ctx.directionsMatrix[BASE_LEVEL] || {};
            const arrowSize = Math.max(12, ctx.canvaSize * 0.4);
            const offset = ctx.canvaSize * 0.25;

            Object.entries(currentCalles).forEach(([rStr, rowCols]: any) => {
                Object.entries(rowCols).forEach(([cStr, val]) => {
                    if (val) {
                        const r = parseInt(rStr), c = parseInt(cStr);
                        const dirs = currentDirs[r]?.[c];
                        if (!dirs) return;
                        const cx = (c - 1) * ctx.canvaSize + ctx.canvaSize / 2;
                        const cy = (r - 1) * ctx.canvaSize + ctx.canvaSize / 2;

                        if (dirs.up) ctx.drawIcon(context, 'arrowup', cx, cy - offset, arrowSize);
                        if (dirs.down) ctx.drawIcon(context, 'arrowdown', cx, cy + offset, arrowSize);
                        if (dirs.left) ctx.drawIcon(context, 'arrowleft', cx - offset, cy, arrowSize);
                        if (dirs.right) ctx.drawIcon(context, 'arrowright', cx + offset, cy, arrowSize);
                    }
                });
            });
        }}
        stroke={MAP_STRUCTURES.Direcciones.drawConfig.stroke}
        strokeWidth={1.5}
        listening={false}
    />
);


export const STRUCTURE_RENDERERS: Record<StructureType, {
    renderElements: (ctx: StructureRenderContext) => any;
    renderPreview?: (ctx: PreviewRenderContext) => any;
}> = {
    Grupo: { renderElements: renderGrupo },
    Unidad: { renderElements: renderUnidad },
    Area: { renderElements: renderArea },
    Muro: { renderElements: renderMuro, renderPreview: renderMuroPreview },
    Direcciones: { renderElements: renderDirecciones },
};

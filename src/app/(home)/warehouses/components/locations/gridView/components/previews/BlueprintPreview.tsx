import { getBlueprintBatchDimensions, rotateCoords } from '@/app/lib/utils/gridMap.helper';
import { IMapStructureTranslation, IZone } from "@/types/gridMap.types";
import { memo } from 'react';
import { Group } from 'react-konva';

interface BlueprintPreviewProps {
    pendingStructure: IMapStructureTranslation;
    blueprintPreviewPos: { row: number; col: number };
    rotation: number;
    renderKonvaZone: (zone: Partial<IZone> & { start: any; end: any; id: string; type: any }, isGhost?: boolean, isPreview?: boolean) => any;
}

const BlueprintPreview = memo(({
    pendingStructure,
    blueprintPreviewPos,
    rotation,
    renderKonvaZone
}: BlueprintPreviewProps) => {
    if (pendingStructure.cloneBundle) {
        const { zones: bundleZones, groupDimensions } = pendingStructure.cloneBundle;
        return (
            <Group key="clone-preview">
                {bundleZones.map((z: any, idx: number) => {
                    const { rS: frS, cS: fcS, rE: frE, cE: fcE } = rotateCoords(
                        z.relStart.row, z.relStart.col,
                        z.relEnd.row, z.relEnd.col,
                        groupDimensions.rows, groupDimensions.cols,
                        rotation
                    );
                    return renderKonvaZone({
                        ...z,
                        id: `clone-preview-${idx}`,
                        start: { row: blueprintPreviewPos.row + frS, col: blueprintPreviewPos.col + fcS },
                        end: { row: blueprintPreviewPos.row + frE, col: blueprintPreviewPos.col + fcE }
                    }, false, true);
                })}
            </Group>
        );
    }

    const { processed } = getBlueprintBatchDimensions(pendingStructure, rotation);
    let currentOffsetRow = blueprintPreviewPos.row;

    return (
        <Group key="blueprint-preview-group">
            {processed.map((p, bIdx) => {
                const bStartRow = currentOffsetRow;
                const bEndRow = bStartRow + p.bRows - 1;
                const bStartCol = blueprintPreviewPos.col;
                const bEndCol = blueprintPreviewPos.col + p.bCols - 1;

                const result = (
                    <Group key={`blueprint-${bIdx}`}>
                        {renderKonvaZone({
                            start: { row: bStartRow, col: bStartCol },
                            end: { row: bEndRow, col: bEndCol },
                            id: `blueprint-preview-${bIdx}`,
                            type: 'Grupo'
                        }, false, true)}
                        {p.blueprint.units.map((_, j) => {
                            const { rS: uRS, cS: uCS, rE: uRE, cE: uCE } = rotateCoords(
                                0, j * 3, 2, j * 3 + 2,
                                p.origH, p.origW,
                                rotation
                            );
                            return renderKonvaZone({
                                start: { row: bStartRow + uRS, col: bStartCol + uCS },
                                end: { row: bStartRow + uRE, col: bStartCol + uCE },
                                id: `unit-preview-${bIdx}-${j}`,
                                type: 'Unidad'
                            }, false, true);
                        })}
                    </Group>
                );
                currentOffsetRow += p.bRows;
                return result;
            })}
        </Group>
    );
});

BlueprintPreview.displayName = 'BlueprintPreview';
export default BlueprintPreview;

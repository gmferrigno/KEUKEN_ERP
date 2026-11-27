import { getMultiZoneBoundingBox, rotateCoords } from '@/app/lib/utils/gridMap.helper';
import { IZone } from "@/types/gridMap.types";
import { memo } from 'react';
import { Group } from 'react-konva';

interface MovePreviewProps {
    zones: IZone[];
    selectedElementId: string | null;
    selectedElementIds: string[];
    movePreviewPos: { row: number; col: number };
    moveOffset: { r: number; c: number };
    rotation: number;
    renderKonvaZone: (zone: Partial<IZone> & { start: any; end: any; id: string; type: any }, isGhost?: boolean, isPreview?: boolean) => any;
}

const MovePreview = memo(({
    zones,
    selectedElementId,
    selectedElementIds,
    movePreviewPos,
    moveOffset,
    rotation,
    renderKonvaZone
}: MovePreviewProps) => {
    const explicitIds = selectedElementIds.length > 0 ? selectedElementIds : [selectedElementId!];
    const initialZones = zones.filter(z => explicitIds.includes(z.id));
    const zonesToMove = [...initialZones];

    initialZones.forEach(parent => {
        const children = zones.filter(z => z.parentId === parent.id && !explicitIds.includes(z.id));
        zonesToMove.push(...children);
    });

    if (zonesToMove.length === 0) return null;

    const { minR: bMinR, minC: bMinC, maxR: bMaxR, maxC: bMaxC } = getMultiZoneBoundingBox(zonesToMove);

    const previewStartBase = {
        row: movePreviewPos.row - moveOffset.r,
        col: movePreviewPos.col - moveOffset.c
    };

    const effectiveH = bMaxR - bMinR + 1;
    const effectiveW = bMaxC - bMinC + 1;

    return (
        <Group key="move-preview-group">
            {zonesToMove.map(zone => {
                const relR = zone.start.row - bMinR;
                const relC = zone.start.col - bMinC;
                const itemW = zone.end.col - zone.start.col;
                const itemH = zone.end.row - zone.start.row;

                const { rS, cS, rE, cE } = rotateCoords(
                    relR, relC, relR + itemH, relC + itemW,
                    effectiveH, effectiveW,
                    rotation
                );

                return renderKonvaZone({
                    start: { row: previewStartBase.row + rS, col: previewStartBase.col + cS },
                    end: { row: previewStartBase.row + rE, col: previewStartBase.col + cE },
                    id: `move-preview-${zone.id}`,
                    type: zone.type
                }, false, true);
            })}
        </Group>
    );
});

MovePreview.displayName = 'MovePreview';
export default MovePreview;

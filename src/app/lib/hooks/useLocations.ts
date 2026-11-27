import { translateMapStructures } from '@/app/lib/utils/gridMap.helper';
import { locationService } from '@repo/erp-services/warehouse/locations.service';
import { IMapStructureTranslation } from "@/types/gridMap.types";
import { IFLocation } from "@repo/api-contracts/erp";
import { useAuth } from '@/contexts/AuthContext';
import { useGridMapContext } from '@/contexts/GridMapContext';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

export const useLocations = () => {
    const searchParams = useSearchParams();
    const warehouseId = searchParams.get('warehouseId');
    const { token } = useAuth();
    const { zonesByLevel } = useGridMapContext();

    const [locations, setLocations] = useState<IFLocation[]>([]);
    const [blueprintCatalog, setBlueprintCatalog] = useState<IMapStructureTranslation | null>(null);
    const [pendingStructure, setPendingStructure] = useState<IMapStructureTranslation | null>(null);
    const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

    const fetchLocations = async (): Promise<void> => {
        try {
            const res = await locationService.getAll({
                limit: 9999, offset: 0,
                warehouseId: warehouseId || "",
                parent: null
            }, token);
            setLocations(res.items);
        } catch (error) {
            console.error("Error fetching locations:", error);
        }
    };
    useEffect(() => {
        if (!warehouseId || !token) return;
        fetchLocations();
    }, [warehouseId, token]);

    useEffect(() => {
        if (locations.length === 0) return;
        const translation = translateMapStructures(locations);
        setBlueprintCatalog(translation);
        setPendingStructure(translation);
        const initialCollapsed: Record<string, boolean> = {};
        translation?.blueprints.forEach(b => {
            initialCollapsed[b.path] = true;
        });
        setCollapsedGroups(initialCollapsed);
    }, [locations]);

    const pendingCount = useMemo(() => {
        if (!blueprintCatalog) return 0;
        const placedPaths = new Set(
            Object.values(zonesByLevel).flat().filter((z: any) => z.type === 'Grupo').map((z: any) => z.path)
        );
        return blueprintCatalog.blueprints.filter(b => !placedPaths.has(b.path)).length;
    }, [zonesByLevel, blueprintCatalog]);

    return {
        locations,
        blueprintCatalog,
        pendingStructure, setPendingStructure,
        collapsedGroups, setCollapsedGroups,
        pendingCount,
        warehouseId,
        fetchLocations,
    };
};

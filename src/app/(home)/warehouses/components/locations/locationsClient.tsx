'use client';

import { locationService } from "@repo/erp-services/warehouse/locations.service";
import { warehouseService } from "@repo/erp-services/warehouse/warehouse.service";
import { IFLocation } from "@repo/api-contracts/erp";
import { useAuth } from "@/contexts/AuthContext";
import { useLocations } from "@/contexts/LocationsContext";
import Splitter, { Item as SplitterItem } from 'devextreme-react/splitter';
import notify from "devextreme/ui/notify";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import LocationDetailCard from "./cardView/detailCard";
import LocationsCarousel from "./cardView/listCard";
import Gridmap from "./gridView";
import LocationsList from "./listView/listGrid";
import LocationBreadcrumbs from "./locationsBreadcrums";

interface LocationsClientProps {
    warehouseId: string;
}

const LocationsClient = ({ warehouseId }: LocationsClientProps) => {
    const [isGridVisible, setIsGridVisible] = useState(false);
    const { setSelectedLocation, selectedLocation } = useLocations();
    const [warehouseName, setWarehouseName] = useState<string>('');
    const searchParams = useSearchParams();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();

    const [path, setPath] = useState<IFLocation[]>([]);
    const [isTable, setIsTable] = useState(false);
    const [viewMode, setViewMode] = useState<'table' | 'card' | 'map'>('table');

    const isInitialRender = useRef(true);

    const pathParam = searchParams.get('path') || '';
    const [activePath, setActivePath] = useState(pathParam);
    const lastSeenPathParam = useRef(pathParam);

    const { token } = useAuth();

    useEffect(() => {
        const fetchWarehouse = async () => {
            try {
                const warehouse = await warehouseService.getById(warehouseId, token);
                setWarehouseName(warehouse.title);
            } catch (error: any) {
                console.error("Error fetching warehouse:", error);
                const errorMessage = error instanceof Error && error.message ? error.message : "Error al cargar el almacén";
                notify(errorMessage, "error", 3000);
            }
        };
        fetchWarehouse();
    }, [warehouseId]);

    useEffect(() => {
        if (pathParam !== lastSeenPathParam.current) {
            setActivePath(pathParam);
            lastSeenPathParam.current = pathParam;
        }
    }, [pathParam]);

    useEffect(() => {
        const savedMode = localStorage.getItem('location_view_mode');
        if (savedMode !== null) {
            setIsTable(savedMode === 'true');
        }
    }, []);

    useEffect(() => {
        if (isInitialRender.current) {
            isInitialRender.current = false;
            return;
        }
        localStorage.setItem('location_view_mode', isTable.toString());
    }, [isTable]);

    useEffect(() => {
        if (!activePath) {
            if (path.length > 0) setPath([]);
            return;
        }

        const pathIndex = path.findIndex(p => p.path === activePath);

        if (pathIndex !== -1) {
            if (pathIndex !== path.length - 1) {
                setPath(prev => prev.slice(0, pathIndex + 1));
            }
            return;
        }

        const fetchLocation = async () => {
            try {
                const location = await locationService.getByPath(activePath, warehouseId, token);
                setPath(prev => {
                    const prevPathStr = prev.map(p => p.path).pop() || '';
                    if (activePath.startsWith(prevPathStr + '.') && prevPathStr !== '') {
                        return [...prev, location];
                    }
                    return [location];
                });
            } catch (error: any) {
                const errorMessage = error instanceof Error && error.message ? error.message : 'La ubicación no existe, se redirigió a la ubicación existente más cercana';
                notify(errorMessage, 'error', 3000);
                handleGoBack();
            }
        };
        fetchLocation();
    }, [activePath, warehouseId, path.length]);

    useEffect(() => {
        setSelectedLocation(path[path.length - 1] || null);
    }, [path, setSelectedLocation]);

    const navigate = (newPath: string | null) => {
        const params = new URLSearchParams(searchParams.toString());
        if (newPath === null) {
            params.delete('path');
        } else {
            params.set('path', newPath);
        }

        const nextPath = newPath || '';
        lastSeenPathParam.current = nextPath;

        startTransition(() => {
            setActivePath(nextPath);
            router.push(`${pathname}?${params.toString()}`);
            if (newPath === null) {
                setPath([]);
            } else {
                const parts = nextPath.split('.');
                setPath(prev => prev.slice(0, parts.length));
            }
        });
    };

    const handleSelectStorage = (location: IFLocation | null) => {
        if (!location) return;

        const nextPath = location.path;
        lastSeenPathParam.current = nextPath;

        startTransition(() => {
            setActivePath(nextPath);
            const params = new URLSearchParams(searchParams.toString());
            params.set('path', nextPath);
            router.push(`${pathname}?${params.toString()}`);

            const index = path.findIndex(u => u.id === location.id);
            if (index === -1) {
                setPath((prev) => [...prev, location]);
            }
        });
    };

    const handleGoBack = () => {
        const segments = activePath.split('.');
        if (segments.length <= 1) {
            navigate(null);
        } else {
            navigate(segments.slice(0, -1).join('.'));
        }
    };

    const handleUpdateLocation = (updatedLocation: IFLocation) => {
        setPath(prev => prev.map(loc => loc.id === updatedLocation.id ? updatedLocation : loc));
    };

    const isMode = (mode: 'table' | 'card' | 'map') => viewMode === mode;

    return (
        <>
            <div className="flex flex-col w-full h-full" >
                <div className={`w-full mt-2 mb-0.5 transition-opacity duration-300 ${isPending ? 'opacity-50' : 'opacity-100'}`} >
                    <LocationBreadcrumbs
                        currentPath={activePath}
                        onNavigate={navigate}
                        isMode={isMode}
                        setViewMode={setViewMode}
                        isGridVisible={isGridVisible}
                        setIsGridVisible={setIsGridVisible}
                    />
                </div>

                <div className="w-full h-[calc(100%-70px)]">

                    {isMode('table') &&
                        <LocationsList
                            warehouseId={warehouseId}
                            currentParentId={activePath || null}
                            onSelectStorage={handleSelectStorage}
                            onGoBack={handleGoBack}
                        />
                    }

                    {isMode('card') &&
                        <Splitter orientation="horizontal" width="100%" height="100%" className="gap-2 mt-2">
                            <SplitterItem
                                resizable={true}
                                maxSize={'70%'}
                            >
                                <div className="w-full h-full overflow-hidden">
                                    {
                                        selectedLocation ? (
                                            <LocationDetailCard
                                                onUpdate={handleUpdateLocation}
                                                onDelete={handleGoBack}
                                            />
                                        ) : (
                                            <div className="w-full h-full flex flex-col items-center justify-center bg-primary-500/20 rounded-dx border border-dashed border-primary-500/10 gap-4 group">
                                                <div>
                                                    <i className="dx-icon-packagebox !text-main/40"
                                                        style={{ fontSize: '100px' }} />
                                                </div>
                                                <div className="flex flex-col items-center justify-center gap-y-2">
                                                    <h3 className="!text-main/40 text-lg font-bold uppercase">
                                                        {warehouseName || 'Cargando almacén...'}
                                                    </h3>
                                                    <p className="!text-main/40 text-xs  font-medium text-nowrap">
                                                        Seleccione una unidad del inventario para ver detalles específicos
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </SplitterItem>
                            <SplitterItem
                                collapsed={false}
                                maxSize={'60%'}
                            >
                                <div className="w-full h-full overflow-hidden">
                                    <LocationsCarousel
                                        currentParentId={activePath || null}
                                        onSelectStorage={handleSelectStorage}
                                        onGoBack={handleGoBack}
                                        hasParent={!!activePath}
                                        onCreateNew={() => { console.log('create new'); }}
                                        warehouseId={warehouseId}
                                        levelName={activePath}
                                    />
                                </div>
                            </SplitterItem>
                        </Splitter>
                    }

                    {isMode('map') &&
                        <Gridmap />
                    }

                </div>

            </div>
        </>
    );
};


export default LocationsClient;

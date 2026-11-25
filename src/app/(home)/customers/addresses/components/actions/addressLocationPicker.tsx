"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { MapCoreProvider, useCreatePath, useMapCore } from "@repo/map-core";
import { Button } from "@repo/devextreme";
import "@repo/map-core/styles.css";

const DEFAULT_CENTER: [number, number] = [-34.60372, -58.38135];
const MARKER_PARENT_ID = "address-location";
const MARKER_POINT_ID = "pin";
const MARKER_MAP_REF = "pins";
/** Mismo marker de cliente/puesto que en maps (getDeliveryClientIcon / stall). */
const PIN_ICON_SIZE = 22;
const PIN_ICON_URL =
    "data:image/svg+xml," +
    encodeURIComponent(`
<svg viewBox="-6.24 -6.24 36.5 36.5" xmlns="http://www.w3.org/2000/svg" fill="none">
  <rect x="-6.24" y="-6.24" width="36.48" height="36.48" rx="18.24" fill="#777778"/>
  <g clip-path="url(#address-stall-clip)">
    <path fill-rule="evenodd" clip-rule="evenodd" d="M1.79279 0.725279C1.91545 0.295978 2.30783 0 2.75431 0H21.2457C21.6922 0 22.0846 0.295977 22.2072 0.725279L23.6358 5.72528C23.8183 6.36409 23.3387 7 22.6743 7H20V14H23C23.5523 14 24 14.4477 24 15C24 15.5523 23.5523 16 23 16H22V23C22 23.5523 21.5523 24 21 24H3C2.44772 24 2 23.5523 2 23V16H1C0.447715 16 0 15.5523 0 15C0 14.4477 0.447715 14 1 14H4V7H1.32574C0.661363 7 0.1817 6.3641 0.364219 5.72528L1.79279 0.725279ZM6 7H18V14H6V7ZM8 18C8 17.4477 7.55228 17 7 17C6.44772 17 6 17.4477 6 18V21C6 21.5523 6.44772 22 7 22C7.55228 22 8 21.5523 8 21V18ZM13 18C13 17.4477 12.5523 17 12 17C11.4477 17 11 17.4477 11 18V21C11 21.5523 11.4477 22 12 22C12.5523 22 13 21.5523 13 21V18ZM17 17C17.5523 17 18 17.4477 18 18V21C18 21.5523 17.5523 22 17 22C16.4477 22 16 21.5523 16 21V18C16 17.4477 16.4477 17 17 17Z" fill="#ffffff"/>
  </g>
  <defs>
    <clipPath id="address-stall-clip">
      <rect width="24" height="24" fill="white"/>
    </clipPath>
  </defs>
</svg>
`.trim());

export type AddressLocationCoords = {
    lat: number;
    lng: number;
};

export type AddressLocationChangeOptions = {
    /** false = actualización en vivo (drag); true/omitido = commit (click / drag end). */
    commit?: boolean;
};

export interface AddressLocationPickerProps {
    latitude?: number | null;
    longitude?: number | null;
    onChange: (
        coords: AddressLocationCoords,
        options?: AddressLocationChangeOptions
    ) => void;
    className?: string;
    height?: number;
    /** Si true, arranca visible. */
    defaultOpen?: boolean;
}

function toFiniteNumber(value: unknown): number | null {
    if (value === null || value === undefined || value === "") return null;
    const n = typeof value === "number" ? value : Number(value);
    return Number.isFinite(n) ? n : null;
}

function roundCoord(value: number): number {
    return Number(value.toFixed(6));
}

function AddressLocationPickerMap({
    latitude,
    longitude,
    onChange,
}: AddressLocationPickerProps) {
    const { initializeMap, mapContainerRef, mapRef, panToCoordinate } = useMapCore();
    const { handleMarkers } = useCreatePath();
    const markersStoreRef = useRef<Record<string, any>>({});
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;
    const draggingRef = useRef(false);
    const mapPanningRef = useRef(false);
    const readyRef = useRef(false);
    const scrollParentRef = useRef<HTMLElement | null>(null);
    const savedScrollTopRef = useRef(0);
    const emitRafRef = useRef<number | null>(null);
    const pendingCoordsRef = useRef<AddressLocationCoords | null>(null);

    const resolveCoords = useCallback((): [number, number] => {
        const lat = toFiniteNumber(latitude);
        const lng = toFiniteNumber(longitude);
        if (lat !== null && lng !== null) return [lat, lng];
        return DEFAULT_CENTER;
    }, [latitude, longitude]);

    const findScrollParent = (el: HTMLElement | null): HTMLElement | null => {
        let node = el?.parentElement ?? null;
        while (node) {
            const style = window.getComputedStyle(node);
            const overflowY = style.overflowY;
            if (
                (overflowY === "auto" || overflowY === "scroll") &&
                node.scrollHeight > node.clientHeight
            ) {
                return node;
            }
            node = node.parentElement;
        }
        return null;
    };

    const preserveScroll = () => {
        const parent =
            scrollParentRef.current ||
            findScrollParent(mapContainerRef.current);
        if (parent) {
            scrollParentRef.current = parent;
            savedScrollTopRef.current = parent.scrollTop;
            requestAnimationFrame(() => {
                parent.scrollTop = savedScrollTopRef.current;
            });
        }
    };

    const emitCoords = useCallback(
        (
            coords: AddressLocationCoords,
            options: AddressLocationChangeOptions & { immediate?: boolean } = {}
        ) => {
            const { commit = true, immediate = false } = options;
            const publish = (next: AddressLocationCoords) => {
                onChangeRef.current(next, { commit });
            };

            if (immediate || commit) {
                if (emitRafRef.current != null) {
                    cancelAnimationFrame(emitRafRef.current);
                    emitRafRef.current = null;
                }
                pendingCoordsRef.current = null;
                publish(coords);
                return;
            }

            pendingCoordsRef.current = coords;
            if (emitRafRef.current != null) return;
            emitRafRef.current = requestAnimationFrame(() => {
                emitRafRef.current = null;
                const next = pendingCoordsRef.current;
                pendingCoordsRef.current = null;
                if (next) publish(next);
            });
        },
        []
    );

    const upsertMarker = useCallback(
        (coords: [number, number]) => {
            handleMarkers({
                id: MARKER_PARENT_ID,
                pointData: {
                    id: MARKER_POINT_ID,
                    coordinates: coords,
                },
                Icon: {
                    size: PIN_ICON_SIZE,
                    iconUrl: PIN_ICON_URL,
                    zIndexOffset: 1000,
                },
                operation: "add",
                markerMapRef: MARKER_MAP_REF,
                target: markersStoreRef,
                isDraggable: true,
                dragAction: (latlng) => {
                    draggingRef.current = true;
                    emitCoords(
                        {
                            lat: roundCoord(latlng.lat),
                            lng: roundCoord(latlng.lng),
                        },
                        { commit: false }
                    );
                },
                dragEndAction: (latlng) => {
                    preserveScroll();
                    emitCoords(
                        {
                            lat: roundCoord(latlng.lat),
                            lng: roundCoord(latlng.lng),
                        },
                        { commit: true, immediate: true }
                    );
                    preserveScroll();
                    // Diferir el flag para que el sync por props no mueva el pin al soltar.
                    requestAnimationFrame(() => {
                        draggingRef.current = false;
                    });
                },
            });
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [emitCoords, handleMarkers]
    );

    useEffect(() => {
        initializeMap();
        readyRef.current = true;

        const map = mapRef.current;
        const container = mapContainerRef.current;
        if (!map || !container) return;

        scrollParentRef.current = findScrollParent(container);

        const initial = resolveCoords();
        upsertMarker(initial);
        panToCoordinate(initial);

        const handleClick = (e: any) => {
            if (draggingRef.current || mapPanningRef.current) return;
            const lat = roundCoord(e.latlng.lat);
            const lng = roundCoord(e.latlng.lng);
            preserveScroll();
            upsertMarker([lat, lng]);
            emitCoords({ lat, lng }, { commit: true, immediate: true });
            preserveScroll();
        };

        // Suelta el foco del form sin bloquear el pan de Leaflet.
        const releaseFormFocus = () => {
            const active = document.activeElement as HTMLElement | null;
            if (
                active &&
                typeof active.blur === "function" &&
                active.closest(".dx-texteditor, .dx-numberbox, input, textarea")
            ) {
                active.blur();
            }
            preserveScroll();
        };

        const handleMapDragStart = () => {
            mapPanningRef.current = true;
            releaseFormFocus();
        };
        const handleMapDragEnd = () => {
            // Evita que el click residual al soltar el pan mueva el pin.
            window.setTimeout(() => {
                mapPanningRef.current = false;
            }, 0);
        };

        map.on("click", handleClick);
        map.on("dragstart", handleMapDragStart);
        map.on("dragend", handleMapDragEnd);
        container.addEventListener("pointerdown", releaseFormFocus);

        const resizeTimer = window.setTimeout(() => {
            map.invalidateSize();
        }, 120);

        return () => {
            map.off("click", handleClick);
            map.off("dragstart", handleMapDragStart);
            map.off("dragend", handleMapDragEnd);
            container.removeEventListener("pointerdown", releaseFormFocus);
            window.clearTimeout(resizeTimer);
            if (emitRafRef.current != null) {
                cancelAnimationFrame(emitRafRef.current);
                emitRafRef.current = null;
            }
            handleMarkers({
                id: MARKER_PARENT_ID,
                pointData: {
                    id: MARKER_POINT_ID,
                    coordinates: initial,
                },
                Icon: {
                    size: PIN_ICON_SIZE,
                    iconUrl: PIN_ICON_URL,
                },
                operation: "remove",
                markerMapRef: MARKER_MAP_REF,
                target: markersStoreRef,
            });
            readyRef.current = false;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!readyRef.current || draggingRef.current) return;
        const lat = toFiniteNumber(latitude);
        const lng = toFiniteNumber(longitude);
        if (lat === null || lng === null) return;

        const marker =
            markersStoreRef.current?.[MARKER_PARENT_ID]?.[MARKER_MAP_REF]?.[
                MARKER_POINT_ID
            ];

        if (marker?.setLatLng) {
            const current = marker.getLatLng();
            if (
                Math.abs(current.lat - lat) < 1e-7 &&
                Math.abs(current.lng - lng) < 1e-7
            ) {
                return;
            }
            marker.setLatLng([lat, lng]);
            // Solo pan si el cambio viene de los inputs (no al soltar el drag).
            panToCoordinate([lat, lng]);
        } else {
            upsertMarker([lat, lng]);
            panToCoordinate([lat, lng]);
        }
    }, [latitude, longitude, panToCoordinate, upsertMarker]);

    return <div ref={mapContainerRef} className="w-full h-full min-h-[220px]" />;
}

/**
 * Mini-mapa colapsable para fijar geoLat/geoLon (click + pin arrastrable).
 */
export default function AddressLocationPicker(props: AddressLocationPickerProps) {
    const height = props.height ?? 240;
    const [open, setOpen] = useState(props.defaultOpen ?? true);
    const lat = toFiniteNumber(props.latitude);
    const lng = toFiniteNumber(props.longitude);
    // Última posición conocida (props + drags): al re-mostrar el mapa no vuelve al origen.
    const lastCoordsRef = useRef<[number, number]>(
        lat !== null && lng !== null ? [lat, lng] : DEFAULT_CENTER
    );
    const [mapEpoch, setMapEpoch] = useState(0);
    const [sessionCenter, setSessionCenter] = useState<[number, number]>(
        lastCoordsRef.current
    );

    useEffect(() => {
        if (lat === null || lng === null) return;
        lastCoordsRef.current = [lat, lng];
    }, [lat, lng]);

    const handleChange = useCallback(
        (
            coords: AddressLocationCoords,
            options?: AddressLocationChangeOptions
        ) => {
            lastCoordsRef.current = [coords.lat, coords.lng];
            props.onChange(coords, options);
        },
        [props.onChange]
    );

    const toggleOpen = () => {
        setOpen((wasOpen) => {
            if (wasOpen) return false;
            const next = lastCoordsRef.current;
            setSessionCenter(next);
            setMapEpoch((n) => n + 1);
            return true;
        });
    };

    return (
        <div className={`flex flex-col gap-2 ${props.className || ""}`}>
            <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-main/80">Ubicación en mapa</p>
                <Button
                    text={open ? "Ocultar mapa" : "Mostrar mapa"}
                    stylingMode="text"
                    onClick={toggleOpen}
                />
            </div>

            {open && (
                <>
                    <div
                        className="rounded-dx overflow-hidden border border-main/15 bg-primary-900/30"
                        style={{ height }}
                    >
                        <MapCoreProvider
                            key={mapEpoch}
                            config={{ center: sessionCenter, zoom: 14 }}
                        >
                            <AddressLocationPickerMap
                                {...props}
                                latitude={lat ?? sessionCenter[0]}
                                longitude={lng ?? sessionCenter[1]}
                                onChange={handleChange}
                            />
                        </MapCoreProvider>
                    </div>
                    <p className="text-[11px] text-main/50 leading-snug">
                        Arrastre el pin o haga click en el mapa para fijar latitud y
                        longitud.
                    </p>
                </>
            )}
        </div>
    );
}

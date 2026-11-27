'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MapCoreProvider, useMapCore, useCreatePath } from '@repo/map-core';
import { LocationExclamationSVGDataUri } from '@repo/icons';
import { Popup, Position } from 'devextreme-react/popup';
import { Button } from 'devextreme-react/button';
import '@repo/map-core/styles.css';

const MapContainer: React.FC = () => {
  const {
    initializeMap,
    mapContainerRef,
    mapRef,
    drawControl,
    editControl,
    drawnItemsRef,
  } = useMapCore();

  const { handleMarkers, createPolygon } = useCreatePath();
  const savedZonesRef = useRef<any>({});

  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnShape, setHasDrawnShape] = useState(false);
  const [zoneCount, setZoneCount] = useState(1);

  useEffect(() => {
    initializeMap();

    handleMarkers({
      id: 'demo-marker',
      pointData: {
        id: 'obelisco',
        coordinates: [-34.60372, -58.38135],
      },
      Icon: {
        size: 36,
        iconUrl: LocationExclamationSVGDataUri,
      },
      operation: 'add',
      markerMapRef: 'demoMarkers',
      target: { current: {} },
    });

    createPolygon({
      id: 'demo-zone',
      points: [
        [-34.601, -58.385],
        [-34.601, -58.378],
        [-34.606, -58.378],
        [-34.606, -58.385],
      ],
      options: {
        color: 'var(--focus-500, #4171bf)',
        fillColor: 'var(--focus-100, #5492f6)',
        fillOpacity: 0.25,
      },
      operation: 'add',
      polygonMapRef: 'savedZones',
      target: savedZonesRef,
      tooltipLabel: 'Zona Demo ERP #1',
    });

    const map = mapRef.current;
    if (map) {
      const handleCreated = () => {
        setIsDrawing(false);
        setHasDrawnShape(true);
      };

      map.on('draw:created', handleCreated);
      return () => {
        map.off('draw:created', handleCreated);
      };
    }
  }, [initializeMap, handleMarkers, createPolygon, mapRef]);

  const handleStartDraw = () => {
    if (drawControl.current) {
      setIsDrawing(true);
      setHasDrawnShape(false);
      drawnItemsRef.current?.clearLayers();
      drawControl.current.enable();
    }
  };

  const handleEnableEdit = () => {
    if (editControl.current) {
      editControl.current.enable();
    }
  };

  const handleSaveZone = () => {
    try {
      if (editControl.current) {
        editControl.current.save();
        editControl.current.disable();
      }
      if (drawControl.current) {
        drawControl.current.disable();
      }

      const layers = Object.values((drawnItemsRef.current as any)?._layers || {}) as any[];
      if (layers.length > 0) {
        const lastLayer = layers[layers.length - 1];
        const latlngs = lastLayer.getLatLngs()[0];
        const points = latlngs.map((l: any) => [l.lat, l.lng]);

        const nextCount = zoneCount + 1;
        createPolygon({
          id: `zona-${Date.now()}`,
          points,
          options: {
            color: 'var(--focus-500, #4171bf)',
            fillColor: 'var(--focus-100, #5492f6)',
            fillOpacity: 0.35,
          },
          operation: 'add',
          polygonMapRef: 'savedZones',
          target: savedZonesRef,
          tooltipLabel: `Zona Personalizada #${nextCount}`,
        });

        setZoneCount(nextCount);
      }
    } finally {
      drawnItemsRef.current?.clearLayers();
      setIsDrawing(false);
      setHasDrawnShape(false);
    }
  };

  const handleCancel = () => {
    if (drawControl.current) drawControl.current.disable();
    if (editControl.current) editControl.current.disable();
    drawnItemsRef.current?.clearLayers();
    setIsDrawing(false);
    setHasDrawnShape(false);
  };

  return (
    <div id="map-wrapper" className="relative w-full h-[calc(100vh-140px)] min-h-[500px] rounded-lg overflow-hidden border border-border shadow-xs">
      <div ref={mapContainerRef} className="w-full h-full" />


      <Popup
        visible={true}
        dragEnabled={true}
        hideOnOutsideClick={false}
        showCloseButton={false}
        showTitle={true}
        title="Herramientas de Zona"
        width={270}
        height="auto"
        shading={false}
      >
        <Position at={{ x: 'right', y: 'top' }} my={{ x: 'right', y: 'top' }} of="#map-wrapper" offset="-20 20" />
        <div className="flex flex-col gap-2.5 p-1 text-sm">
          <div className="flex items-center justify-between pb-1 border-b border-border/50 text-xs text-gray-400">
            <span>Estado:</span>
            <span className={`font-semibold ${isDrawing ? 'text-amber-400' : hasDrawnShape ? 'text-cyan-400' : 'text-emerald-400'}`}>
              {isDrawing ? 'Dibujando...' : hasDrawnShape ? 'Polígono cerrado' : 'En espera'}
            </span>
          </div>

          <Button
            text="Dibujar Zona"
            icon="add"
            type="default"
            stylingMode="contained"
            width="100%"
            onClick={handleStartDraw}
            disabled={isDrawing}
          />

          <Button
            text="Ajustar Vértices"
            icon="edit"
            type="normal"
            stylingMode="outlined"
            width="100%"
            onClick={handleEnableEdit}
            disabled={!hasDrawnShape || isDrawing}
          />

          <Button
            text="Guardar Zona"
            icon="check"
            type="success"
            stylingMode="contained"
            width="100%"
            onClick={handleSaveZone}
            disabled={!hasDrawnShape}
          />

          <Button
            text="Cancelar / Limpiar"
            icon="close"
            type="danger"
            stylingMode="outlined"
            width="100%"
            onClick={handleCancel}
            disabled={!isDrawing && !hasDrawnShape}
          />

          <div className="mt-1 text-[11px] text-gray-500 text-center">
            Zonas en mapa: <strong className="text-gray-300">{zoneCount}</strong>
          </div>
        </div>
      </Popup>
    </div>
  );
};

export default function MapViewer() {
  return (
    <MapCoreProvider config={{ center: [-34.60372, -58.38135], zoom: 14 }}>
      <MapContainer />
    </MapCoreProvider>
  );
}

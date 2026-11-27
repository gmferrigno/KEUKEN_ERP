'use client';

import PERMISSIONS_CONSTANTS from "@repo/access";
import { canDo } from "@repo/access";
import { IFLocation, TFLocationState } from "@repo/api-contracts/erp";
import { useAuth } from '@/contexts/AuthContext';
import { useLocations } from '@/contexts/LocationsContext';
import { locationService } from '@repo/erp-services/warehouse/locations.service';
import { Button } from '@repo/devextreme';
import { useMemo, useState } from 'react';
import LocationChangeState from '../actions/changeState';
import CompleteInventory from '../actions/completeInventory';
import LocationDeletion from '../actions/deletion';
import LocationEdition from '../actions/edition';
import StartInventory from '../actions/startInventory';
import AssignAreaModal from '../actions/assignArea';
import KPI from './kpi';

const STATE_CONFIG: Record<TFLocationState, { label: string; color: string; icon: string }> = {
    available: { label: 'Disponible', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: 'dx-icon-check' },
    full: { label: 'Lleno', color: 'bg-focus-500/20 text-focus-100 border-focus-500/30', icon: 'dx-icon-box' },
    blocked: { label: 'Bloqueado', color: 'bg-red-500/20 text-red-100 border-red-500/30', icon: 'dx-icon-lock' },
    maintenance: { label: 'Mantenimiento', color: 'bg-orange-500/20 text-orange-400 border-orange-500/30', icon: 'dx-icon-preferences' },
};

interface IDetailCardProps {
    onUpdate?: (updatedLocation: IFLocation) => void;
    onRefresh?: () => void;
    onDelete?: () => void;
}

const LocationDetailCard = ({ onUpdate, onRefresh, onDelete }: IDetailCardProps) => {
    const { triggerRefresh, selectedLocation: location, activeInventory: inventory, stock } = useLocations();

    const [isEditionVisible, setEditionVisible] = useState(false);
    const [isChangeStateVisible, setChangeStateVisible] = useState(false);
    const [isDeletionVisible, setDeletionVisible] = useState(false);
    const [isInventoryVisible, setInventoryVisible] = useState(false);
    const [isAssignAreaVisible, setAssignAreaVisible] = useState(false);

    const { token, permissions } = useAuth();

    const isActive = location?.active;
    const isStorage = location?.usage === 'internal';


    const handleStateChangeSuccess = (updatedLocation: IFLocation, isRecursive: boolean) => {
        onUpdate?.(updatedLocation);
        if (isRecursive) {
            triggerRefresh();
            onRefresh?.();
        }
    };

    const handleDeletionSuccess = () => {
        onDelete?.();
    };

    const handleInventorySuccess = () => {
        triggerRefresh();
        onRefresh?.();
    };

    const handleAssignAreaSuccess = async () => {
        if (!location) return;
        try {
            const updated = await locationService.getByPath(location.path, location.warehouseId, token);
            onUpdate?.(updated);
            triggerRefresh();
            onRefresh?.();
        } catch (error) {
            console.error("Error fetching updated location after area assignment:", error);
        }
    };

    if (!location) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center p-12 text-center bg-primary-900/40 rounded-dx border border-dashed border-primary-500/20 animate-in fade-in duration-700">
                <div className="size-16 bg-primary-500/10 rounded-full flex items-center justify-center mb-4 border border-primary-500/10">
                    <i className="dx-icon-box text-3xl"></i>
                </div>
                <h4 className="text-main opacity-70 font-bold mb-1 ">Sin detalles</h4>
                <p className="text-sm  text-main opacity-30   tracking-[0.2em]">
                    Selecciona una unidad para ver sus detalles
                </p>
            </div>
        );
    }

    const currentState = STATE_CONFIG[location.state as TFLocationState] || STATE_CONFIG.available;

    const canModify = useMemo((): boolean => {
        return permissions ? canDo('modify', PERMISSIONS_CONSTANTS.modifyInventory, permissions) : false;
    }, [permissions])

    return (
        <div className="w-full h-full flex flex-col bg-primary-500 backdrop-blur-xl border border-primary-500/30 rounded-dx overflow-hidden shadow-2xl transition-all duration-500">
            <div className={`flex flex-col border-b border-primary-500/20 shadow-black/25 ${isStorage ? 'bg-main/5' : 'bg-primary-900/20'}`}>
                <div className="p-5 flex justify-between items-start">
                    <div className="flex items-center gap-4">
                        <div className={`
                            size-14 rounded-dx flex items-center justify-center border shadow-sm transition-transform duration-500
                            ${isStorage
                                ? 'bg-gradient-to-br from-focus-500/30 to-focus-500/10 text-focus-100 border-focus-500/40 shadow-black/10'
                                : 'bg-primary-950/40 border-main/5'
                            }
                        `}>
                            <i className={`${isStorage ? 'dx-icon-box' : 'dx-icon-inactivefolder'} text-3xl`}></i>
                        </div>
                        <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-2xl font-bold text-main">{location.name}</h2>
                                <div className="flex gap-1.5">
                                    <span className={`
                                        px-2 py-0.5 text-xs  rounded-[3px] border
                                        ${isStorage ? 'bg-focus-500/20 text-focus-100 border-focus-500/20' : 'bg-primary-900/80 text-main border-main/5'}
                                    `}>
                                        {isStorage ? 'Almacén' : 'Ubicación'}
                                    </span>
                                    <span className={`
                                        px-2 py-0.5 text-xs  rounded-[3px] border flex items-center gap-1.5
                                        ${currentState.color}
                                    `}>
                                        <i className={`${currentState.icon} text-sm `}></i>
                                        {currentState.label}
                                    </span>
                                </div>
                            </div>
                            <div className="flex flex-col items-start gap-2.5 flex-wrap">
                                {location.path && (
                                    <span className="text-sm  !text-main/50 flex items-center gap-1">
                                        <i className="dx-icon-folder text-sm  !text-main/50" /> Ruta: {location.path}
                                    </span>
                                )}
                                <span className="text-sm !text-main/50 flex items-center gap-1">
                                    <i className="dx-icon-tags text-sm !text-main/50" /> Área: {location.areaId ? (location.areaName || location.areaCode) : 'Sin Área'}
                                </span>

                            </div>
                        </div>
                    </div>

                    {canModify &&
                        <div className="flex gap-1">
                            <Button
                                icon="edit"
                                stylingMode="text"
                                hint="Editar"
                                onClick={() => setEditionVisible(true)}
                                className="hover:!text-focus-100 hover:!bg-focus-500/10 !rounded-dx transition-colors"
                            />
                            <Button
                                icon="trash"
                                stylingMode="text"
                                hint="Eliminar"
                                onClick={() => setDeletionVisible(true)}
                                className="hover:!text-red-400 hover:!bg-red-500/10 !rounded-dx transition-colors"
                            />
                            <Button
                                icon="link"
                                stylingMode="text"
                                hint="Asignar Área"
                                onClick={() => setAssignAreaVisible(true)}
                                className="hover:!text-focus-100 hover:!bg-focus-500/10 !rounded-dx transition-colors"
                            />
                            {isStorage &&
                                <Button
                                    icon='clipboardtasklist'
                                    hint={inventory ? 'Confirmar Inventario' : 'Inventariar'}
                                    stylingMode='text'
                                    onClick={() => setInventoryVisible(true)}
                                    className=" hover:!text-focus-100 hover:!bg-focus-500/10 !rounded-dx transition-colors"
                                />
                            }
                        </div>
                    }
                </div>

                {canModify &&
                    <div className="px-5 pb-4 w-full">
                        <button
                            onClick={() => setChangeStateVisible(true)}
                            className="group flex items-center cursor-pointer gap-2.5 px-3 py-2 text-xs  bg-main/5 border border-main/10 rounded-dx hover:bg-focus-500/10 hover:border-focus-500/30 transition-all duration-300"
                        >
                            <i className="dx-icon-refresh text-md group-hover:rotate-180 transition-transform duration-500 text-focus-100/60 group-hover:text-focus-100"></i>
                            Cambiar Estado Operativo
                        </button>
                    </div>
                }
            </div>

            <div className="flex-1 min-h-0 flex flex-col p-5 gap-6 bg-primary-950/50 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                    <KPI
                        label="Capacidad Peso"
                        value={location.capacityWeight || 0}
                        unit="kg totales"
                        progress={isStorage ? {
                            used: stock?.lines.reduce((acc, line) => acc + line.quantity, 0) || 0,
                            available: location.capacityWeight || 1,
                            total: location.capacityWeight || 1,
                            unit: 'kg'
                        } : undefined}
                    />

                    <KPI
                        label="Capacidad Volumen"
                        value={location.capacityVolume || 0}
                        unit="m³ totales"
                        progress={isStorage ? {
                            used: stock?.lines.reduce((acc, line) => acc + line.quantity, 0) || 0,
                            available: location.capacityVolume || 1,
                            total: location.capacityVolume || 1,
                            unit: 'm³'
                        } : undefined}
                    />
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <KPI
                        label="Items distintos"
                        value={stock?.lines.length || 0}
                        unit="totales"
                        progress={undefined}
                    />

                    <KPI
                        label="Cantitdad de unidades"
                        value={stock?.lines.reduce((acc, line) => acc + line.quantity, 0) || 0}
                        unit="totales"
                        progress={undefined}
                    />
                </div>
            </div>

            <div className="h-1.5 w-full bg-gradient-to-r from-focus-500 to-primary-0 opacity-60"></div>
            <div className="p-4 bg-primary-950/40 backdrop-blur-sm border-t border-primary-500/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div
                        className={`
                        size-2 rounded-full animate-pulse ${isActive ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.6)]'}
                    `} />
                    <span className="text-xs  text-main opacity-60 font-medium  ">
                        Se encuentra {isActive ? 'activo' : 'inactivo'}
                    </span>
                </div>
            </div>

            <LocationEdition
                visible={isEditionVisible}
                onHiding={() => setEditionVisible(false)}
                location={location}
                onSuccess={onUpdate}
            />

            <LocationChangeState
                visible={isChangeStateVisible}
                onHiding={() => setChangeStateVisible(false)}
                location={location}
                onSuccess={handleStateChangeSuccess}
            />

            <LocationDeletion
                visible={isDeletionVisible}
                onHiding={() => setDeletionVisible(false)}
                location={location}
                onSuccess={handleDeletionSuccess}
                warehouseId={location.warehouseId}
            />

            {inventory ? (
                <CompleteInventory
                    visible={isInventoryVisible}
                    onHiding={() => setInventoryVisible(false)}
                    inventoryId={inventory.id}
                    onSuccess={handleInventorySuccess}
                />
            ) : (
                <StartInventory
                    visible={isInventoryVisible}
                    onHiding={() => setInventoryVisible(false)}
                    locationId={location.id}
                    onSuccess={handleInventorySuccess}
                />
            )}

            <AssignAreaModal
                visible={isAssignAreaVisible}
                onHiding={() => setAssignAreaVisible(false)}
                location={location}
                warehouseId={location.warehouseId}
                onSuccess={handleAssignAreaSuccess}
            />
        </div>
    );
};

export default LocationDetailCard;

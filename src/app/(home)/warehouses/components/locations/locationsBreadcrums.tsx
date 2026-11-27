'use client';

import { Dispatch, SetStateAction } from 'react';

interface LocationBreadcrumbsProps {
    currentPath: string;
    onNavigate: (newPath: string | null) => void;
    isMode: (mode: 'table' | 'card' | 'map') => boolean;
    setViewMode: Dispatch<SetStateAction<'table' | 'card' | 'map'>>;
    isGridVisible: boolean;
    setIsGridVisible: Dispatch<SetStateAction<boolean>>;
}

const LocationBreadcrumbs = ({ currentPath, onNavigate, isMode, setViewMode, isGridVisible, setIsGridVisible }: LocationBreadcrumbsProps) => {
    const breadcrumbs = currentPath ? currentPath.split('.') : [];

    const handleNavigate = (index: number | null) => {
        if (index === null) {
            onNavigate(null);
        } else {
            const newPath = breadcrumbs.slice(0, index + 1).join('.');
            onNavigate(newPath);
        }
    };

    return (
        <nav className="flex justify-between items-center flex-wrap gap-y-2 gap-x-1 p-2 bg-primary-500 backdrop-blur-md border border-primary-500/10 rounded-dx">
            <div className='flex items-center flex-wrap'>
                {}
                <div
                    className="flex items-center gap-2 cursor-pointer group transition-all"
                    onClick={() => handleNavigate(null)}
                >
                    <div className={`size-8 flex items-center justify-center rounded-dx border transition-all duration-300 ${breadcrumbs.length === 0
                        ? 'bg-focus-500 border-focus-500 shadow-xs shadow-black/20'
                        : 'bg-primary-900/50 border-primary-500/20 group-hover:bg-focus-500/10 group-hover:text-focus-100 group-hover:border-focus-500/30'
                        }`}>
                        <i className={`dx-icon-home text-base ${breadcrumbs.length === 0 ? '!text-variant' : '!text-main'}`}></i>
                    </div>
                    <span className={`text-sm font-medium transition-colors ${breadcrumbs.length === 0 ? 'text-focus-100' : ''
                        }`}>
                        Depósito
                    </span>
                </div>


                {breadcrumbs.map((segment, index) => {
                    const isLast = index === breadcrumbs.length - 1;
                    return (
                        <div
                            key={index}
                            className="flex items-center gap-1 animate-in fade-in slide-in-from-left-4 duration-500"
                            style={{ animationDelay: `${index * 50}ms` }}
                        >
                            <div className="flex items-center justify-center w-6">
                                <i className="dx-icon-chevronright text-[10px]"></i>
                            </div>

                            <div
                                className={`flex items-center px-3 py-1.5 rounded-dx cursor-pointer transition-all duration-300 border ${isLast
                                    ? 'bg-focus-500/10 border-focus-500/30 text-focus-100 shadow-sm'
                                    : 'bg-transparent border-transparent hover:bg-main/5'
                                    }`}
                                onClick={() => handleNavigate(index)}
                            >
                                <span className="text-xs  font-bold whitespace-nowrap tracking-tight">
                                    {segment}
                                </span>
                            </div>
                        </div>
                    );
                })}
            </div>


            <div className="flex items-center gap-x-1 bg-primary-950/10 rounded-dx p-1 border border-focus-500/25">
                <div
                    className="cursor-pointer group transition-all"
                    onClick={() => setViewMode('table')}
                    title={"Modo tabla"}
                >
                    <div className={`size-8 flex items-center justify-center rounded-dx transition-all duration-300 ${isMode('table')
                        ? 'bg-focus-500 text-variant shadow-xs'
                        : 'bg-transparent text-main/70 hover:bg-focus-500/10 hover:text-focus-100'
                        }`}>
                        <i className={`dx-icon-description text-base ${isMode('table') ? '!text-variant' : '!text-main'}`}></i>
                    </div>
                </div>

                <div
                    className="cursor-pointer group transition-all"
                    onClick={() => setViewMode('card')}
                    title={"Modo tarjetas"}
                >
                    <div className={`size-8 flex items-center justify-center rounded-dx transition-all duration-300 ${isMode('card')
                        ? 'bg-focus-500 text-variant shadow-xs'
                        : 'bg-transparent text-main/70 hover:bg-focus-500/10 hover:text-focus-100'
                        }`}>
                        <i className={`dx-icon-ordersbox text-base ${isMode('card') ? '!text-variant' : '!text-main'}`}></i>
                    </div>
                </div>

                <div
                    className="cursor-pointer group transition-all"
                    onClick={() => setViewMode('map')}
                    title={"Modo mapa"}
                >
                    <div className={`size-8 flex items-center justify-center rounded-dx transition-all duration-300 ${isMode('map')
                        ? 'bg-focus-500 text-variant shadow-xs'
                        : 'bg-transparent text-main/70 hover:bg-focus-500/10 hover:text-focus-100'
                        }`}>
                        <i className={`dx-icon-map text-base ${isMode('map') ? '!text-variant' : '!text-main'}`}></i>
                    </div>
                </div>
            </div>
        </nav>
    );
};

export default LocationBreadcrumbs;



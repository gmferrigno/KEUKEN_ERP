'use client';

import { BASE_LEVEL } from "@/app/lib/constants/gridMap.constants";
import { useGridMapContext } from "@/contexts/GridMapContext";

interface IFooterPanelProps {
    currentLevel: number;
    levels: number[];
}

const FooterPanel = ({ currentLevel, levels }: IFooterPanelProps) => {
    const { setCurrentLevel } = useGridMapContext();

    const handleLevelWheel = (e: React.WheelEvent) => {
        e.stopPropagation();
        if (e.deltaY < 0) {
            if (currentLevel < levels.length - 1) setCurrentLevel(currentLevel + 1);
        } else {
            if (currentLevel > BASE_LEVEL) setCurrentLevel(currentLevel - 1);
        }
    };

    const getVisibleLevels = () => {
        if (levels.length <= 3) return levels;
        if (currentLevel === BASE_LEVEL) return [BASE_LEVEL, BASE_LEVEL + 1, BASE_LEVEL + 2];
        if (currentLevel === levels[levels.length - 1]) return [levels[levels.length - 3], levels[levels.length - 2], levels[levels.length - 1]];
        return [currentLevel - 1, currentLevel, currentLevel + 1];
    };

    return (
        <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4 px-3 py-1.5 bg-primary-950/80 backdrop-blur-md border border-main/10 rounded-full shadow-2xl z-[100]"
            onPointerDown={e => e.stopPropagation()}
        >
            {}
            <div className="flex items-center gap-2 px-2">
                {levels.length > 1 ? (
                    <div className="flex items-center gap-1 p-1 rounded-dx" onWheel={handleLevelWheel}>
                        <button
                            onClick={() => currentLevel > BASE_LEVEL && setCurrentLevel(currentLevel - 1)}
                            disabled={currentLevel === BASE_LEVEL}
                            className={`px-1 py-0.5 rounded-full text-sm font-bold transition-all ${currentLevel === BASE_LEVEL ? 'text-main/20' : 'text-main/50 hover:bg-main/10 hover:text-main'}`}
                        >
                            <i className="dx-icon-chevronleft" />
                        </button>

                        {getVisibleLevels().map(lvl => (
                            <button
                                key={lvl}
                                onClick={() => setCurrentLevel(lvl)}
                                className={`px-2 py-0.5 rounded text-sm font-bold transition-all ${currentLevel === lvl
                                    ? ' text-focus-100 text-sm'
                                    : 'text-main/50 hover:bg-main/10 hover:text-main'
                                    }`}
                            >
                                {lvl}
                            </button>
                        ))}

                        <button
                            onClick={() => currentLevel < levels.length - 1 && setCurrentLevel(currentLevel + 1)}
                            disabled={currentLevel === levels.length - 1}
                            className={`px-1 py-0.5 rounded-full text-sm font-bold transition-all ${currentLevel === levels.length - 1 ? 'text-main/20' : 'text-main/50 hover:bg-main/10 hover:text-main'}`}
                        >
                            <i className="dx-icon-chevronright" />
                        </button>
                    </div>
                ) : (
                    <p className="text-sm text-focus-100 font-bold uppercase tracking-widest">Nivel {currentLevel}</p>
                )}
            </div>
        </div>
    );
};

export default FooterPanel;

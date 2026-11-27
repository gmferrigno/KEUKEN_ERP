

export interface GridStateStorageOptions {
    gridId: string;
    onBeforeSave?: (state: any) => any;
    onAfterLoad?: (state: any) => any;
}


export function createGridStateStorage(options: GridStateStorageOptions) {
    const { gridId, onBeforeSave, onAfterLoad } = options;
    const storageKey = `grid:${gridId}`;

    return {
        customLoad: () => {
            try {
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    const state = JSON.parse(stored);
                    if (onAfterLoad) {
                        return onAfterLoad(state);
                    }
                    return state;
                }
            } catch (error) {
                console.error(`Error loading grid state for ${gridId}:`, error);
            }
            return undefined;
        },

        customSave: (state: any) => {
            try {
                let stateToSave = state;
                if (onBeforeSave) {
                    stateToSave = onBeforeSave(state);
                }
                localStorage.setItem(storageKey, JSON.stringify(stateToSave));
            } catch (error) {
                console.error(`Error saving grid state for ${gridId}:`, error);
            }
        },
    };
}


export function clearGridState(gridId: string) {
    try {
        localStorage.removeItem(`grid:${gridId}`);
    } catch (error) {
        console.error(`Error clearing grid state for ${gridId}:`, error);
    }
}


export function getGridState(gridId: string) {
    try {
        const stored = localStorage.getItem(`grid:${gridId}`);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (error) {
        console.error(`Error getting grid state for ${gridId}:`, error);
    }
    return null;
}


export function setGridState(gridId: string, state: any) {
    try {
        localStorage.setItem(`grid:${gridId}`, JSON.stringify(state));
    } catch (error) {
        console.error(`Error setting grid state for ${gridId}:`, error);
    }
}

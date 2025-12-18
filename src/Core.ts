export enum CoreType {
    HERALD = 'herald',
    SWIFT = 'swift',
    DEFENDER = 'defender'
}

export interface CoreStats {
    strength: number;
    defense: number;
    speed: number;
}

// Core type configurations
export const CORE_CONFIGS: Record<CoreType, CoreStats> = {
    [CoreType.HERALD]: {
        strength: 32,
        defense: 2,
        speed: 0
    },
    [CoreType.SWIFT]: {
        strength: 0,
        defense: -2,
        speed: 4
    },
    [CoreType.DEFENDER]: {
        strength: -1,
        defense: 4,
        speed: 0
    }
};

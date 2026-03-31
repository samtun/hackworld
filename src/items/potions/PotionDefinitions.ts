export enum PotionType {
    HP = 'hp',
    TP = 'tp',
}

export interface PotionLevelDefinition {
    readonly level: number;
    readonly hpAmount: number;
    readonly tpAmount: number;
    readonly requiredPlayerLevel: number;
}

export const POTION_LEVELS: readonly PotionLevelDefinition[] = [
    { level: 1, hpAmount: 20,  tpAmount: 10,  requiredPlayerLevel: 0 },
    { level: 2, hpAmount: 40,  tpAmount: 15,  requiredPlayerLevel: 20 },
    { level: 3, hpAmount: 60,  tpAmount: 20,  requiredPlayerLevel: 40 },
    { level: 4, hpAmount: 100, tpAmount: 30,  requiredPlayerLevel: 70 },
    { level: 5, hpAmount: 200, tpAmount: 60,  requiredPlayerLevel: 120 },
    { level: 6, hpAmount: 400, tpAmount: 100, requiredPlayerLevel: 240 },
];

/**
 * Determine the highest potion level the player qualifies for based on their level.
 */
export function determinePotionLevel(playerLevel: number): number {
    let best = 1;
    for (const def of POTION_LEVELS) {
        if (playerLevel >= def.requiredPlayerLevel) {
            best = def.level;
        }
    }
    return best;
}

/**
 * Get the restoration amount for a given potion type and level.
 */
export function getPotionAmount(type: PotionType, level: number): number {
    const def = POTION_LEVELS.find(d => d.level === level);
    if (!def) return 0;
    return type === PotionType.HP ? def.hpAmount : def.tpAmount;
}

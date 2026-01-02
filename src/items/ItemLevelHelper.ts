
export class ItemLevelHelper {
    // Level metadata owned by the WeaponItem instance
    private static LEVELS: Record<number, string> = {
        1: 'α',
        2: 'β',
        3: 'γ',
        4: 'δ',
        5: 'ε',
        6: 'ω',
    };

    // Level definitions for chips and cores (based on player level, not tech)
    public static CHIP_CORE_LEVELS = [
        { requiredLevel: 1, statPercent: 1.00 },   // α - Lvl 1 +0%
        { requiredLevel: 10, statPercent: 1.10 },  // β - Lvl 10 +10%
        { requiredLevel: 24, statPercent: 1.25 },  // γ - Lvl 24 +25%
        { requiredLevel: 40, statPercent: 1.40 },  // δ - Lvl 40 +40%
        { requiredLevel: 72, statPercent: 1.60 },  // ε - Lvl 72 +60%
        { requiredLevel: 124, statPercent: 1.90 }  // ω - Lvl 124 +90%
    ];

    // Price multipliers for trader level variants
    public static readonly LEVEL_2_PRICE_MULTIPLIER = 1.5;
    public static readonly LEVEL_3_PRICE_MULTIPLIER = 2.0;

    public static getLevelChar(level: number): string {
        if (level <= 0) throw new Error('Level must be >= 1');
        if (level > Object.keys(this.LEVELS).length) {
            return this.LEVELS[Object.keys(this.LEVELS).length];
        }
        
        return this.LEVELS[level];
    }

    // Get level definition by numeric level (1-based) for chips/cores
    public static getChipCoreLevelByNumber(level: number): { requiredLevel: number; statPercent: number } {
        if (level <= 0) throw new Error('Level must be >= 1');
        if (level > this.CHIP_CORE_LEVELS.length) {
            return this.CHIP_CORE_LEVELS[this.CHIP_CORE_LEVELS.length - 1];
        }
        return this.CHIP_CORE_LEVELS[level - 1];
    }

    // Get stat multiplier for a given level
    public static getStatMultiplierForLevel(level: number): number {
        return this.getChipCoreLevelByNumber(level).statPercent;
    }
}
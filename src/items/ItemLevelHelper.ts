
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

    // Price multipliers for item levels
    public static PRICE_MULTIPLIERS = [1.0, 1.5, 2.0, 3.0, 5.0, 8.0];

    public static getLevelChar(level: number): string {
        if (level <= 0) throw new Error('Level must be >= 1');
        const maxLevel = Object.keys(this.LEVELS).length;
        if (level > maxLevel) {
            return this.LEVELS[maxLevel];
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

    /**
     * Determine the appropriate item level to drop based on player level
     * Logic:
     * - 70% chance to drop an item that is equippable (at or below player's level)
     * - If player is <= 5 levels away from next item level, 8% chance to drop one level higher
     * - Otherwise drop one level lower than currently equippable
     */
    public static determineDropLevel(playerLevel: number): number {
        // Find the highest level the player can equip
        let equippableLevel = 1;
        for (let i = this.CHIP_CORE_LEVELS.length - 1; i >= 0; i--) {
            if (playerLevel >= this.CHIP_CORE_LEVELS[i].requiredLevel) {
                equippableLevel = i + 1; // Convert from index to level (1-based)
                break;
            }
        }

        const roll = Math.random();

        // 70% chance to drop equippable level
        if (roll < 0.70) {
            return equippableLevel;
        }

        // 8% chance (70-78%) to drop one level higher if player is close to next level
        if (roll < 0.78) {
            const nextLevelIndex = equippableLevel; // Next level is current equippable + 1 (in 0-based index)
            if (nextLevelIndex < this.CHIP_CORE_LEVELS.length) {
                const nextRequiredLevel = this.CHIP_CORE_LEVELS[nextLevelIndex].requiredLevel;
                const levelsAway = nextRequiredLevel - playerLevel;
                
                // Only drop one level higher if within 5 levels of requirement
                if (levelsAway <= 5) {
                    return equippableLevel + 1;
                }
            }
        }

        // Otherwise (22% chance or roll >= 0.78 but not close to next level), drop one level lower
        return Math.max(1, equippableLevel - 1);
    }
}
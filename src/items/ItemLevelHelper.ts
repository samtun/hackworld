
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

    public static getLevelChar(level: number): string {
        if (level <= 0) throw new Error('Weapon level must be >= 1');
        if (level > Object.keys(this.LEVELS).length) {
            return this.LEVELS[Object.keys(this.LEVELS).length];
        }
        
        return this.LEVELS[level];
    }
}
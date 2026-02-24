/**
 * Tiers for weapons based on their damage bonus/malus percentage.
 */
export enum WeaponTier {
    BROKEN = 'Broken',
    STABLE = 'Stable',
    MAINTAINED = 'Maintained',
    OVERCLOCKED = 'Overclocked',
    ZERODAY = 'ZeroDay',
    LEET = 'Leet',
}

export interface WeaponTierDefinition {
    name: WeaponTier;
    /** Minimum bonus percentage (inclusive) for this tier */
    minPercent: number;
    /** Maximum bonus percentage (exclusive) for this tier. Use Infinity for the top tier. */
    maxPercent: number;
    /** Color to apply to the rim material */
    rimColor: string;
    /** Color to apply to the inner material */
    innerColor: string;
    /**
     * Probability (0–1) that a weapon of this tier appears as a random bonus entry
     * in the weapon trader inventory. Should decrease for higher tiers.
     */
    traderChance: number;
    /** Minimum player level for this tier to appear in the trader inventory */
    minLevel: number;
}

/**
 * ordered Map of weapon tier definitions.
 * Add new tiers here to extend the system.
 */
export const WEAPON_TIERS = new Map<WeaponTier, WeaponTierDefinition>([
    [WeaponTier.BROKEN, {
        name: WeaponTier.BROKEN,
        minPercent: -Infinity,
        maxPercent: -3,
        rimColor: '#aaaaaa',
        innerColor: '#555555',
        traderChance: 0.30,
        minLevel: 0,
    }],
    [WeaponTier.STABLE, {
        name: WeaponTier.STABLE,
        minPercent: -3,
        maxPercent: 3,
        rimColor: '#ffffff',
        innerColor: '#aaaaaa',
        traderChance: 0.44,
        minLevel: 0,
    }],
    [WeaponTier.MAINTAINED, {
        name: WeaponTier.MAINTAINED,
        minPercent: 3,
        maxPercent: 8,
        rimColor: '#7676ff',
        innerColor: '#3a3aae',
        traderChance: 0.15,
        minLevel: 0,
    }],
    [WeaponTier.OVERCLOCKED, {
        name: WeaponTier.OVERCLOCKED,
        minPercent: 8,
        maxPercent: 12,
        rimColor: '#00f97d',
        innerColor: '#00b36a',
        traderChance: 0.10,
        minLevel: 0,
    }],
    [WeaponTier.ZERODAY, {
        name: WeaponTier.ZERODAY,
        minPercent: 12,
        maxPercent: 16,
        rimColor: '#fd00d7',
        innerColor: '#83006f',
        traderChance: 0.06,
        minLevel: 20,
    }],
    [WeaponTier.LEET, {
        name: WeaponTier.LEET,
        minPercent: 16,
        maxPercent: Infinity,
        rimColor: '#ffae00',
        innerColor: '#b87e00',
        traderChance: 0.02,
        minLevel: 40,
    }],
]);

/**
 * Returns the tier definition that matches the given bonus multiplier.
 * Falls back to the STABLE tier if no tier matches.
 * @param bonusMultiplier - The ratio of final damage to base damage (e.g. 1.05 = +5%)
 */
export function getWeaponTierForMultiplier(bonusMultiplier: number): WeaponTierDefinition {
    const bonusPercent = (bonusMultiplier - 1) * 100;
    for (const tier of WEAPON_TIERS.values()) {
        if (bonusPercent >= tier.minPercent && bonusPercent < tier.maxPercent) {
            return tier;
        }
    }
    return WEAPON_TIERS.get(WeaponTier.STABLE)!;
}

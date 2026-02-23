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
        rimColor: '#cccccc',
        innerColor: '#717171',
    }],
    [WeaponTier.STABLE, {
        name: WeaponTier.STABLE,
        minPercent: -3,
        maxPercent: 3,
        rimColor: '#ffffff',
        innerColor: '#aaaaaa',
    }],
    [WeaponTier.MAINTAINED, {
        name: WeaponTier.MAINTAINED,
        minPercent: 3,
        maxPercent: 8,
        rimColor: '#7676ff',
        innerColor: '#3a3aae',
    }],
    [WeaponTier.OVERCLOCKED, {
        name: WeaponTier.OVERCLOCKED,
        minPercent: 8,
        maxPercent: 12,
        rimColor: '#00f97d',
        innerColor: '#00b36a',
    }],
    [WeaponTier.ZERODAY, {
        name: WeaponTier.ZERODAY,
        minPercent: 12,
        maxPercent: 16,
        rimColor: '#fd00d7',
        innerColor: '#83006f',
    }],
    [WeaponTier.LEET, {
        name: WeaponTier.LEET,
        minPercent: 16,
        maxPercent: Infinity,
        rimColor: '#ffae00',
        innerColor: '#b87e00',
    }],
]);

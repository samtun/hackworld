/**
 * Tiers for weapon drops based on their damage bonus/malus percentage.
 */
export enum WeaponDropTierName {
    BROKEN = 'broken',
    STABLE = 'stable',
    MAINTAINED = 'maintained',
    OVERCLOCKED = 'overclocked',
    ZERODAY = 'zeroday',
    LEET = 'leet',
}

export interface WeaponDropTierDefinition {
    name: WeaponDropTierName;
    /** Minimum bonus percentage (inclusive) for this tier */
    minPercent: number;
    /** Maximum bonus percentage (exclusive) for this tier. Use Infinity for the top tier. */
    maxPercent: number;
    /** Color to apply to the rim material */
    rimColor: string | null;
    /** Color to apply to the inner material */
    innerColor: string | null;
}

/**
 * Ordered list of weapon drop tier definitions.
 * Add new tiers here to extend the system.
 */
export const WEAPON_DROP_TIER: WeaponDropTierDefinition[] = [
    {
        name: WeaponDropTierName.BROKEN,
        minPercent: -Infinity,
        maxPercent: -3,
        rimColor: '#cccccc',
        innerColor: '#717171',
    },
    {
        name: WeaponDropTierName.STABLE,
        minPercent: -3,
        maxPercent: 3,
        rimColor: null,
        innerColor: null,
    },
    {
        name: WeaponDropTierName.MAINTAINED,
        minPercent: 3,
        maxPercent: 8,
        rimColor: '#aaaaff',
        innerColor: '#5555cc',
    },
    {
        name: WeaponDropTierName.OVERCLOCKED,
        minPercent: 8,
        maxPercent: 12,
        rimColor: '#d700fd',
        innerColor: '#9008a9',
    },
    {
        name: WeaponDropTierName.ZERODAY,
        minPercent: 12,
        maxPercent: 16,
        rimColor: '#ffae00',
        innerColor: '#b87e00',
    },
    {
        name: WeaponDropTierName.LEET,
        minPercent: 16,
        maxPercent: Infinity,
        rimColor: '#ff0000',
        innerColor: '#ae1010',
    },
];

/**
 * Tiers for weapon drops based on their damage bonus/malus percentage.
 * Each tier defines a display name and the colors to apply to the
 * "Rim" and "Inner" materials on the weapon drop mesh.
 * A null value for colors means the original model colors are kept.
 */
export enum WeaponDropTierName {
    BROKEN = 'broken',
    STABLE = 'stable',
    MAINTAINED = 'maintained',
    OVERCLOCKED = 'overclocked',
    ELITE = 'elite',
    ZERO_DAY = 'zero-day',
}

export interface WeaponDropTierColors {
    rim: string;
    inner: string;
}

export interface WeaponDropTierDefinition {
    name: WeaponDropTierName;
    /** Minimum bonus percentage (inclusive) for this tier */
    minPercent: number;
    /** Maximum bonus percentage (exclusive) for this tier. Use Infinity for the top tier. */
    maxPercent: number;
    /** Colors to apply, or null to keep the original model colors */
    colors: WeaponDropTierColors | null;
}

/**
 * Ordered list of weapon drop tier definitions.
 * Add new tiers here to extend the system.
 */
export const WEAPON_DROP_TIERS: WeaponDropTierDefinition[] = [
    {
        name: WeaponDropTierName.BROKEN,
        minPercent: -Infinity,
        maxPercent: -3,
        colors: { rim: '#cccccc', inner: '#999999' },
    },
    {
        name: WeaponDropTierName.STABLE,
        minPercent: -3,
        maxPercent: 3,
        colors: null,
    },
    {
        name: WeaponDropTierName.MAINTAINED,
        minPercent: 3,
        maxPercent: 8,
        colors: { rim: '#aaaaff', inner: '#5555cc' },
    },
    {
        name: WeaponDropTierName.OVERCLOCKED,
        minPercent: 8,
        maxPercent: 12,
        colors: { rim: '#d52df2', inner: '#a500c2' },
    },
    {
        name: WeaponDropTierName.ELITE,
        minPercent: 12,
        maxPercent: 16,
        colors: { rim: '#ffae00', inner: '#b87e00' },
    },
    {
        name: WeaponDropTierName.ZERO_DAY,
        minPercent: 16,
        maxPercent: Infinity,
        colors: { rim: '#ff0000', inner: '#c00303' },
    },
];

/**
 * Returns the tier definition for a given bonus multiplier.
 * @param bonusMultiplier - The ratio of final damage to base damage (e.g., 1.05 = +5%)
 */
export function getWeaponDropTier(bonusMultiplier: number): WeaponDropTierDefinition {
    const bonusPercent = (bonusMultiplier - 1) * 100;
    const tier = WEAPON_DROP_TIERS.find(
        t => bonusPercent >= t.minPercent && bonusPercent < t.maxPercent
    );
    // Fallback to stable tier if no match (should not happen with -Infinity/Infinity bounds)
    return tier ?? WEAPON_DROP_TIERS.find(t => t.name === WeaponDropTierName.STABLE)!;
}

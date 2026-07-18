import { singleton } from "tsyringe";

/**
 * Tiers for weapons and skills.
 */
export enum Tier {
    BROKEN = 'Broken',
    STABLE = 'Stable',
    MAINTAINED = 'Maintained',
    OVERCLOCKED = 'Overclocked',
    ZERODAY = 'ZeroDay',
    LEET = 'Leet',
}

export interface WeaponTierDefinition {
    name: Tier;
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
 * Singleton manager for weapon and skill tier logic.
 * Owns the ordered tier definitions, weapon-tier lookups, and skill-tier lookups.
 */
@singleton()
export class TierManager {
    /** Ordered Map of weapon tier definitions. */
    readonly tiers = new Map<Tier, WeaponTierDefinition>([
        [Tier.BROKEN, {
            name: Tier.BROKEN,
            minPercent: -Infinity,
            maxPercent: -3,
            rimColor: '#66DDDD',
            innerColor: '#66DDDD',
            traderChance: 0.30,
            minLevel: 0,
        }],
        [Tier.STABLE, {
            name: Tier.STABLE,
            minPercent: -3,
            maxPercent: 3,
            rimColor: '#ffffff',
            innerColor: '#999999',
            traderChance: 0.44,
            minLevel: 0,
        }],
        [Tier.MAINTAINED, {
            name: Tier.MAINTAINED,
            minPercent: 3,
            maxPercent: 8,
            rimColor: '#8f8fe9',
            innerColor: '#5454b3',
            traderChance: 0.15,
            minLevel: 0,
        }],
        [Tier.OVERCLOCKED, {
            name: Tier.OVERCLOCKED,
            minPercent: 8,
            maxPercent: 12,
            rimColor: '#06cf6b',
            innerColor: '#00965a',
            traderChance: 0.10,
            minLevel: 0,
        }],
        [Tier.ZERODAY, {
            name: Tier.ZERODAY,
            minPercent: 12,
            maxPercent: 16,
            rimColor: '#fd0076',
            innerColor: '#b00555',
            traderChance: 0.06,
            minLevel: 20,
        }],
        [Tier.LEET, {
            name: Tier.LEET,
            minPercent: 16,
            maxPercent: Infinity,
            rimColor: '#ffae00',
            innerColor: '#9d6c02',
            traderChance: 0.02,
            minLevel: 40,
        }],
    ]);

    /**
     * Returns the tier definition that matches the given bonus multiplier.
     * Falls back to the STABLE tier if no tier matches.
     * @param bonusMultiplier - The ratio of final damage to base damage (e.g. 1.05 = +5%)
     */
    getWeaponTierForMultiplier(bonusMultiplier: number): WeaponTierDefinition {
        const bonusPercent = (bonusMultiplier - 1) * 100;
        for (const tier of this.tiers.values()) {
            if (bonusPercent >= tier.minPercent && bonusPercent < tier.maxPercent) {
                return tier;
            }
        }
        return this.tiers.get(Tier.STABLE)!;
    }

    /**
     * Returns the skill tier for the given skill tech point count.
     * Skills start at STABLE (no BROKEN tier).
     */
    getSkillTierForTech(techPoints: number): Tier {
        if (techPoints >= 1800) return Tier.LEET;
        if (techPoints >= 880) return Tier.ZERODAY;
        if (techPoints >= 280) return Tier.OVERCLOCKED;
        if (techPoints >= 60) return Tier.MAINTAINED;
        return Tier.STABLE;
    }

    /**
     * Returns the maximum tech point cap (weapon or skill) for a given player level.
     * @param level The level to get the tech point cap for
     * @returns The maximum tech point amount for the given level
     */
    getTechCapForLevel(level: number): number {
        if (level <= 10) return Math.floor(60 / 10 * level);
        if (level <= 40) return Math.floor((280 - 60) / (40 - 10) * level);
        if (level <= 90) return Math.floor((820 - 280) / (90 - 40) * level);
        if (level <= 150) return Math.floor((1800 - 820) / (150 - 90) * level);
        return Math.floor((4500 - 1800) / (240 - 150) * level);
    }
}

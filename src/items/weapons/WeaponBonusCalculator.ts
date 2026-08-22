import { WeaponItem } from './WeaponItem';
import { WeaponTierDefinition, Tier, TierManager } from '../TierManager';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';
import { singleton } from 'tsyringe';

/**
 * Centralises all weapon bonus/tier calculations.
 * Single source of truth used by both the drop pickup path and the weapon trader.
 */
@singleton()
export class WeaponBonusCalculator {
    private readonly cardCollection: CardCollection;
    private readonly tierManager: TierManager;

    /** Practical lower bound (%) for the open-ended BROKEN tier */
    private static readonly BROKEN_FLOOR_PERCENT = -15;
    /** Practical upper bound (%) for the open-ended top tier (base value) */
    private static readonly TOP_CEIL_PERCENT = 25;
    /** C.003 collection bonus added to TOP_CEIL_PERCENT */
    private static readonly C003_TOP_CEIL_BONUS = 10;

    constructor(
        cardCollection: CardCollection,
        tierManager: TierManager
    ) {
        this.cardCollection = cardCollection;
        this.tierManager = tierManager;
    }

    /**
     * Returns the effective top ceiling percent, boosted by +10 when C.003 is complete.
     */
    private getTopCeilPercent(): number {
        if (this.cardCollection.isAlbumComplete(Album.C003)) {
            return WeaponBonusCalculator.TOP_CEIL_PERCENT + WeaponBonusCalculator.C003_TOP_CEIL_BONUS;
        }
        return WeaponBonusCalculator.TOP_CEIL_PERCENT;
    }

    /**
     * Returns a random bonus multiplier within the tier's percent range.
     * Uses finite practical bounds for open-ended tiers (BROKEN / top tier).
     */
    randomMultiplierForTier(tier: WeaponTierDefinition): number {
        const min = isFinite(tier.minPercent) ? tier.minPercent : WeaponBonusCalculator.BROKEN_FLOOR_PERCENT;
        const max = isFinite(tier.maxPercent) ? tier.maxPercent : this.getTopCeilPercent();
        return 1 + (min + Math.random() * (max - min)) / 100;
    }

    /**
     * Applies a bonus multiplier to a weapon and returns a new WeaponItem.
     *
     * The tier is only assigned when the damage value actually changes after
     * floor-rounding. If the multiplier is too small to affect the integer damage,
     * a STABLE clone is returned so no misleading tier colour is shown.
     */
    applyWeaponBonus(weapon: WeaponItem, bonusMultiplier: number): WeaponItem {
        const finalDamage = Math.floor(weapon.damage * bonusMultiplier);

        if (finalDamage === weapon.damage) {
            // Multiplier too small to change integer damage – keep weapon as STABLE
            return weapon.cloneWith(
                weapon.damage,
                weapon.buyPrice,
                weapon.sellPrice,
                this.tierManager.tiers.get(Tier.STABLE)!,
            );
        }

        // Use the actual applied ratio (after floor-rounding) for tier lookup so
        // that the displayed tier matches the real damage change, not the raw roll.
        const damageFactor = finalDamage / weapon.damage;
        const tier = this.tierManager.getWeaponTierForMultiplier(damageFactor);
        return weapon.cloneWith(
            finalDamage,
            Math.floor(weapon.buyPrice * damageFactor),
            Math.floor(weapon.sellPrice * damageFactor),
            tier,
        );
    }
}

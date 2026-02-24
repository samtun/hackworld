import { WeaponItem } from './WeaponItem';
import { WeaponTierDefinition, getWeaponTierForMultiplier, WEAPON_TIERS, WeaponTier } from './WeaponTier';

/** Practical lower bound (%) for the open-ended BROKEN tier */
const BROKEN_FLOOR_PERCENT = -15;
/** Practical upper bound (%) for the open-ended top tier */
const TOP_CEIL_PERCENT = 25;

/**
 * Returns a random bonus multiplier within the tier's percent range.
 * Uses finite practical bounds for open-ended tiers (BROKEN / top tier).
 */
export function randomMultiplierForTier(tier: WeaponTierDefinition): number {
    const min = isFinite(tier.minPercent) ? tier.minPercent : BROKEN_FLOOR_PERCENT;
    const max = isFinite(tier.maxPercent) ? tier.maxPercent : TOP_CEIL_PERCENT;
    return 1 + (min + Math.random() * (max - min)) / 100;
}

/**
 * Applies a bonus multiplier to a weapon and returns a new WeaponItem.
 *
 * The tier is only assigned when the damage value actually changes after
 * floor-rounding. If the multiplier is too small to affect the integer damage,
 * a STABLE clone is returned so no misleading tier colour is shown.
 */
export function applyWeaponBonus(weapon: WeaponItem, bonusMultiplier: number): WeaponItem {
    const finalDamage = Math.floor(weapon.damage * bonusMultiplier);

    if (finalDamage === weapon.damage) {
        // Multiplier too small to change integer damage – keep weapon as STABLE
        return weapon.cloneWith(
            weapon.damage,
            weapon.buyPrice,
            weapon.sellPrice,
            WEAPON_TIERS.get(WeaponTier.STABLE)!,
        );
    }

    // Use the actual applied ratio (after floor-rounding) for tier lookup so
    // that the displayed tier matches the real damage change, not the raw roll.
    const damageFactor = finalDamage / weapon.damage;
    const tier = getWeaponTierForMultiplier(damageFactor);
    return weapon.cloneWith(
        finalDamage,
        Math.floor(weapon.buyPrice * damageFactor),
        Math.floor(weapon.sellPrice * damageFactor),
        tier,
    );
}

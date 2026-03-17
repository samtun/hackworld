import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { WeaponItem } from './WeaponItem';
import { WeaponType } from './WeaponType';
import { Tier, TierManager } from '../TierManager';
import { CardCollection } from '../cards/CardCollection';

function makeWeapon(damage = 100, buyPrice = 200, sellPrice = 100): WeaponItem {
    const stableTier = TierManager.Instance.tiers.get(Tier.STABLE)!;
    return new WeaponItem('w1', 'Test Weapon', buyPrice, sellPrice, WeaponType.SWORD, damage, 'model.glb', stableTier, 1);
}

/** Helper to mock CardCollection.Instance.isAlbumComplete */
function setAlbumComplete(album: string, complete: boolean) {
    vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockImplementation((a) => a === album && complete);
}

describe('WeaponBonusCalculator', () => {
    const calc = WeaponBonusCalculator.Instance;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('Instance (singleton)', () => {
        it('returns the same instance on repeated calls', () => {
            expect(WeaponBonusCalculator.Instance).toBe(calc);
        });
    });

    describe('randomMultiplierForTier', () => {
        it('returns a multiplier within the tier range for a finite tier', () => {
            const maintained = TierManager.Instance.tiers.get(Tier.MAINTAINED)!;
            // MAINTAINED: [3%, 8%)
            const result = calc.randomMultiplierForTier(maintained);
            expect(result).toBeGreaterThanOrEqual(1.03);
            expect(result).toBeLessThan(1.08);
        });

        it('uses practical floor for the open-ended BROKEN tier', () => {
            const broken = TierManager.Instance.tiers.get(Tier.BROKEN)!;
            // -Infinity min → practical floor is -15%
            const result = calc.randomMultiplierForTier(broken);
            expect(result).toBeGreaterThanOrEqual(0.85);
            expect(result).toBeLessThan(0.97); // maxPercent is -3%
        });

        it('uses practical ceiling for the open-ended LEET tier', () => {
            const leet = TierManager.Instance.tiers.get(Tier.LEET)!;
            // +Infinity max → practical ceiling is +25%
            const result = calc.randomMultiplierForTier(leet);
            expect(result).toBeGreaterThanOrEqual(1.16);
            expect(result).toBeLessThanOrEqual(1.25);
        });

        it('uses +35% ceiling for LEET tier when C.003 is complete', () => {
            setAlbumComplete('C.003', true);
            const leet = TierManager.Instance.tiers.get(Tier.LEET)!;
            // With C.003 bonus: TOP_CEIL_PERCENT = 35
            const result = calc.randomMultiplierForTier(leet);
            expect(result).toBeGreaterThanOrEqual(1.16);
            expect(result).toBeLessThanOrEqual(1.35);
        });
    });

    describe('applyWeaponBonus', () => {
        it('returns a weapon with adjusted damage and matching tier', () => {
            const weapon = makeWeapon(100, 200, 100);
            // +10% => OVERCLOCKED
            const result = calc.applyWeaponBonus(weapon, 1.10);
            expect(result.damage).toBe(110);
            expect(result.tier.name).toBe(Tier.OVERCLOCKED);
            expect(result.buyPrice).toBe(220);
            expect(result.sellPrice).toBe(110);
        });

        it('returns STABLE clone when multiplier is too small to change integer damage', () => {
            const weapon = makeWeapon(10, 20, 10);
            // 1.001 * 10 = 10.01 => floor = 10 (no change)
            const result = calc.applyWeaponBonus(weapon, 1.001);
            expect(result.damage).toBe(10);
            expect(result.tier.name).toBe(Tier.STABLE);
        });

        it('returns BROKEN tier for a negative bonus that reduces damage', () => {
            const weapon = makeWeapon(100, 200, 100);
            // -10% => BROKEN
            const result = calc.applyWeaponBonus(weapon, 0.90);
            expect(result.damage).toBe(90);
            expect(result.tier.name).toBe(Tier.BROKEN);
        });
    });
});

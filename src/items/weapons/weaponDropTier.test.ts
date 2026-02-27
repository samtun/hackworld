import { describe, it, expect } from 'vitest';
import { Tier, TierManager } from '../TierManager';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { WeaponItem } from './WeaponItem';
import { WeaponType } from './WeaponType';

/**
 * Build a minimal WeaponItem suitable for tier/bonus tests.
 * Uses the STABLE tier as a neutral starting point.
 */
function makeWeapon(damage: number, id = 'test-weapon'): WeaponItem {
    return new WeaponItem(
        id,
        'Test Weapon',
        100,
        50,
        WeaponType.SWORD,
        damage,
        'model.glb',
        TierManager.Instance.tiers.get(Tier.STABLE)!,
        1,
    );
}

describe('TierManager.getWeaponTierForMultiplier', () => {
    it('classifies multiplier below -3% as BROKEN', () => {
        expect(TierManager.Instance.getWeaponTierForMultiplier(0.96).name).toBe(Tier.BROKEN);
    });

    it('classifies multiplier in [-3%, 3%) as STABLE', () => {
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.00).name).toBe(Tier.STABLE);
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.02).name).toBe(Tier.STABLE);
        expect(TierManager.Instance.getWeaponTierForMultiplier(0.98).name).toBe(Tier.STABLE);
    });

    it('classifies multiplier in [3%, 8%) as MAINTAINED', () => {
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.03).name).toBe(Tier.MAINTAINED);
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.07).name).toBe(Tier.MAINTAINED);
    });

    it('classifies multiplier in [8%, 12%) as OVERCLOCKED', () => {
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.08).name).toBe(Tier.OVERCLOCKED);
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.11).name).toBe(Tier.OVERCLOCKED);
    });

    it('classifies multiplier in [12%, 16%) as ZERODAY', () => {
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.12).name).toBe(Tier.ZERODAY);
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.15).name).toBe(Tier.ZERODAY);
    });

    it('classifies multiplier >= 16% as LEET', () => {
        // Note: 1.16 has floating-point imprecision ((1.16 - 1) * 100 ≈ 15.9999…),
        // so use a value clearly above the 16% boundary.
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.161).name).toBe(Tier.LEET);
        expect(TierManager.Instance.getWeaponTierForMultiplier(1.25).name).toBe(Tier.LEET);
    });
});

describe('WeaponBonusCalculator.applyWeaponBonus', () => {
    it('returns STABLE when multiplier does not change integer damage', () => {
        // weapon.damage = 100; multiplier = 1.001 → floor(100.1) = 100 (no change)
        const weapon = makeWeapon(100);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weapon, 1.001);
        expect(result.damage).toBe(100);
        expect(result.tier.name).toBe(Tier.STABLE);
    });

    it('uses the floor-rounded damage ratio for tier assignment', () => {
        // Raw multiplier 1.126 is in ZERODAY (+12.6%), but after floor-rounding:
        // floor(100 * 1.126) = 112 → damageFactor = 1.12 → ZERODAY (+12%)
        const weapon = makeWeapon(100);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weapon, 1.126);
        expect(result.damage).toBe(112);
        expect(result.tier.name).toBe(Tier.ZERODAY);
    });

    it('assigns OVERCLOCKED when floor-rounded ratio falls in [8%, 12%)', () => {
        // floor(100 * 1.099) = 109 → damageFactor = 1.09 → OVERCLOCKED
        const weapon = makeWeapon(100);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weapon, 1.099);
        expect(result.damage).toBe(109);
        expect(result.tier.name).toBe(Tier.OVERCLOCKED);
    });

    it('assigns BROKEN for a negative multiplier', () => {
        // floor(100 * 0.95) = 95 → damageFactor = 0.95 → BROKEN (-5%)
        const weapon = makeWeapon(100);
        const result = WeaponBonusCalculator.Instance.applyWeaponBonus(weapon, 0.95);
        expect(result.damage).toBe(95);
        expect(result.tier.name).toBe(Tier.BROKEN);
    });
});

describe('Weapon drop/pickup tier consistency', () => {
    /**
     * Simulates the drop side: computes finalDamage and damageFactor
     * the same way WeaponDropStrategy.drop() does (after the fix).
     */
    function simulateDrop(weapon: WeaponItem, bonusMultiplier: number) {
        const finalDamage = Math.floor(weapon.damage * bonusMultiplier);
        const damageFactor = finalDamage / weapon.damage;
        const dropTier = TierManager.Instance.getWeaponTierForMultiplier(damageFactor);
        return { finalDamage, damageFactor, dropTier };
    }

    /**
     * Simulates the pickup side: re-applies bonus via WeaponBonusCalculator
     * the same way WeaponDropStrategy.pickup() does.
     */
    function simulatePickup(baseWeapon: WeaponItem, dropDamage: number): WeaponItem {
        const pickupMultiplier = dropDamage / baseWeapon.damage;
        return WeaponBonusCalculator.Instance.applyWeaponBonus(baseWeapon, pickupMultiplier);
    }

    it('drop and pickup produce the same tier for a ZERODAY raw multiplier', () => {
        const weapon = makeWeapon(100);
        // Raw multiplier that would have been ZERODAY if used directly (1.126 → +12.6%)
        const { finalDamage, dropTier } = simulateDrop(weapon, 1.126);
        const pickedUp = simulatePickup(weapon, finalDamage);

        expect(pickedUp.tier.name).toBe(dropTier.name);
    });

    it('drop and pickup produce the same tier across a tier boundary', () => {
        // floor(100 * 1.1199) = 111 → damageFactor = 1.11 → OVERCLOCKED (just below ZERODAY)
        // Without the fix, raw 1.1199 was +11.99% → still OVERCLOCKED so it coincidentally passed.
        // More dangerous: a value just above 1.12 that floors back to 1.12.
        // floor(100 * 1.1201) = 112 → damageFactor = 1.12 → ZERODAY (boundary)
        const weapon = makeWeapon(100);
        const { finalDamage, dropTier } = simulateDrop(weapon, 1.1201);
        const pickedUp = simulatePickup(weapon, finalDamage);

        expect(pickedUp.tier.name).toBe(dropTier.name);
    });

    it('drop and pickup produce the same tier for all simulated random multipliers', () => {
        const weapon = makeWeapon(100);
        // Sweep through the full realistic multiplier range in fine steps
        for (let i = 0; i <= 200; i++) {
            const bonusMultiplier = 0.85 + i * 0.001; // 0.85 .. 1.05 (covers all tiers)
            const { finalDamage, dropTier } = simulateDrop(weapon, bonusMultiplier);
            const pickedUp = simulatePickup(weapon, finalDamage);
            expect(pickedUp.tier.name).toBe(dropTier.name);
        }
    });

    it('drop and pickup produce consistent tiers for high-damage weapons', () => {
        // High base damage magnifies the effect of floor-rounding on the ratio
        const weapon = makeWeapon(850);
        for (let i = 0; i <= 200; i++) {
            const bonusMultiplier = 0.85 + i * 0.001;
            const { finalDamage, dropTier } = simulateDrop(weapon, bonusMultiplier);
            const pickedUp = simulatePickup(weapon, finalDamage);
            expect(pickedUp.tier.name).toBe(dropTier.name);
        }
    });
});

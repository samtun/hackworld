import { describe, it, expect } from 'vitest';
import { Tier, TierManager } from '../TierManager';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { WeaponItem } from './WeaponItem';
import { WeaponType } from './WeaponType';
import { CardCollection } from '../cards/CardCollection';
import { mockDeep } from 'vitest-mock-extended';

/**
 * Build a minimal WeaponItem suitable for tier/bonus tests.
 * Uses the STABLE tier as a neutral starting point.
 */
function makeWeapon(tierManager: TierManager, damage: number, id = 'test-weapon'): WeaponItem {
    return new WeaponItem(
        id,
        'Test Weapon',
        100,
        50,
        WeaponType.SWORD,
        damage,
        'model.glb',
        tierManager.tiers.get(Tier.STABLE)!,
        1,
    );
}

function makeWeaponBonusCalculator(tierManager: TierManager, cardCollection?: CardCollection): WeaponBonusCalculator {
    return new WeaponBonusCalculator(cardCollection ?? mockDeep<CardCollection>(), tierManager);;
}

describe('TierManager.getWeaponTierForMultiplier', () => {
    it('classifies multiplier below -3% as BROKEN', () => {
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(0.96).name).toBe(Tier.BROKEN);
    });

    it('classifies multiplier in [-3%, 3%) as STABLE', () => {
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(1.00).name).toBe(Tier.STABLE);
        expect(tierManager.getWeaponTierForMultiplier(1.02).name).toBe(Tier.STABLE);
        expect(tierManager.getWeaponTierForMultiplier(0.98).name).toBe(Tier.STABLE);
    });

    it('classifies multiplier in [3%, 8%) as MAINTAINED', () => {
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(1.03).name).toBe(Tier.MAINTAINED);
        expect(tierManager.getWeaponTierForMultiplier(1.07).name).toBe(Tier.MAINTAINED);
    });

    it('classifies multiplier in [8%, 12%) as OVERCLOCKED', () => {
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(1.08).name).toBe(Tier.OVERCLOCKED);
        expect(tierManager.getWeaponTierForMultiplier(1.11).name).toBe(Tier.OVERCLOCKED);
    });

    it('classifies multiplier in [12%, 16%) as ZERODAY', () => {
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(1.12).name).toBe(Tier.ZERODAY);
        expect(tierManager.getWeaponTierForMultiplier(1.15).name).toBe(Tier.ZERODAY);
    });

    it('classifies multiplier >= 16% as LEET', () => {
        // Note: 1.16 has floating-point imprecision ((1.16 - 1) * 100 ≈ 15.9999…),
        // so use a value clearly above the 16% boundary.
        const tierManager = new TierManager();
        expect(tierManager.getWeaponTierForMultiplier(1.161).name).toBe(Tier.LEET);
        expect(tierManager.getWeaponTierForMultiplier(1.25).name).toBe(Tier.LEET);
    });
});

describe('Weapon drop/pickup tier consistency', () => {
    /**
     * Simulates the drop side: computes finalDamage and damageFactor
     * the same way WeaponDropStrategy.drop() does (after the fix).
     */
    function simulateDrop(tierManager: TierManager, weapon: WeaponItem, bonusMultiplier: number) {
        const finalDamage = Math.floor(weapon.damage * bonusMultiplier);
        const damageFactor = finalDamage / weapon.damage;
        const dropTier = tierManager.getWeaponTierForMultiplier(damageFactor);
        return { finalDamage, damageFactor, dropTier };
    }

    /**
     * Simulates the pickup side: re-applies bonus via WeaponBonusCalculator
     * the same way WeaponDropStrategy.pickup() does.
     */
    function simulatePickup(tierManager: TierManager, baseWeapon: WeaponItem, dropDamage: number): WeaponItem {
        const pickupMultiplier = dropDamage / baseWeapon.damage;
        return makeWeaponBonusCalculator(tierManager).applyWeaponBonus(baseWeapon, pickupMultiplier);
    }

    it('drop and pickup produce the same tier for a ZERODAY raw multiplier', () => {
        const tierManager = new TierManager();
        const weapon = makeWeapon(tierManager, 100);
        // Raw multiplier that would have been ZERODAY if used directly (1.126 → +12.6%)
        const { finalDamage, dropTier } = simulateDrop(tierManager, weapon, 1.126);
        const pickedUp = simulatePickup(tierManager, weapon, finalDamage);

        expect(pickedUp.tier.name).toBe(dropTier.name);
    });

    it('drop and pickup produce the same tier across a tier boundary', () => {
        // floor(100 * 1.1199) = 111 → damageFactor = 1.11 → OVERCLOCKED (just below ZERODAY)
        // Without the fix, raw 1.1199 was +11.99% → still OVERCLOCKED so it coincidentally passed.
        // More dangerous: a value just above 1.12 that floors back to 1.12.
        // floor(100 * 1.1201) = 112 → damageFactor = 1.12 → ZERODAY (boundary)
        const tierManager = new TierManager();
        const weapon = makeWeapon(tierManager, 100);
        const { finalDamage, dropTier } = simulateDrop(tierManager, weapon, 1.1201);
        const pickedUp = simulatePickup(tierManager, weapon, finalDamage);

        expect(pickedUp.tier.name).toBe(dropTier.name);
    });

    it('drop and pickup produce the same tier for all simulated random multipliers', () => {
        const tierManager = new TierManager();
        const weapon = makeWeapon(tierManager, 100);
        // Sweep through the full realistic multiplier range in fine steps
        for (let i = 0; i <= 200; i++) {
            const bonusMultiplier = 0.85 + i * 0.001; // 0.85 .. 1.05 (covers all tiers)
            const { finalDamage, dropTier } = simulateDrop(tierManager, weapon, bonusMultiplier);
            const pickedUp = simulatePickup(tierManager, weapon, finalDamage);
            expect(pickedUp.tier.name).toBe(dropTier.name);
        }
    });

    it('drop and pickup produce consistent tiers for high-damage weapons', () => {
        // High base damage magnifies the effect of floor-rounding on the ratio
        const tierManager = new TierManager();
        const weapon = makeWeapon(tierManager, 850);
        for (let i = 0; i <= 200; i++) {
            const bonusMultiplier = 0.85 + i * 0.001;
            const { finalDamage, dropTier } = simulateDrop(tierManager, weapon, bonusMultiplier);
            const pickedUp = simulatePickup(tierManager, weapon, finalDamage);
            expect(pickedUp.tier.name).toBe(dropTier.name);
        }
    });
});

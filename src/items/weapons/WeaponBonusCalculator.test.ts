import { describe, it, expect, afterEach, vi } from 'vitest';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { WeaponItem } from './WeaponItem';
import { WeaponType } from './WeaponType';
import { Tier, TierManager, WeaponTierDefinition } from '../TierManager';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';
import { mockDeep } from 'vitest-mock-extended';

const tiers = new Map<Tier, WeaponTierDefinition>([
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

function makeWeapon(damage = 100, buyPrice = 200, sellPrice = 100): WeaponItem {
    const stableTier = tiers.get(Tier.STABLE)!;
    return new WeaponItem('w1', 'Test Weapon', buyPrice, sellPrice, WeaponType.SWORD, damage, 'model.glb', stableTier, 1);
}

function makeWeaponBonusCalculator(cardCollection?: CardCollection, tierManager?: TierManager): WeaponBonusCalculator {
    return new WeaponBonusCalculator(cardCollection ?? mockDeep<CardCollection>(), tierManager ?? mockDeep<TierManager>());
}

describe('WeaponBonusCalculator', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('randomMultiplierForTier', () => {
        it('returns a multiplier within the tier range for a finite tier', () => {
            const maintained = tiers.get(Tier.MAINTAINED)!;
            const weaponBonusCalculator = makeWeaponBonusCalculator();
            // MAINTAINED: [3%, 8%)
            const result = weaponBonusCalculator.randomMultiplierForTier(maintained);
            expect(result).toBeGreaterThanOrEqual(1.03);
            expect(result).toBeLessThan(1.08);
        });

        it('uses practical floor for the open-ended BROKEN tier', () => {
            const broken = tiers.get(Tier.BROKEN)!;
            const weaponBonusCalculator = makeWeaponBonusCalculator();
            // -Infinity min → practical floor is -15%
            const result = weaponBonusCalculator.randomMultiplierForTier(broken);
            expect(result).toBeGreaterThanOrEqual(0.85);
            expect(result).toBeLessThan(0.97); // maxPercent is -3%
        });

        it('uses practical ceiling for the open-ended LEET tier', () => {
            const leet = tiers.get(Tier.LEET)!;
            const weaponBonusCalculator = makeWeaponBonusCalculator();
            // +Infinity max → practical ceiling is +25%
            const result = weaponBonusCalculator.randomMultiplierForTier(leet);
            expect(result).toBeGreaterThanOrEqual(1.16);
            expect(result).toBeLessThanOrEqual(1.25);
        });

        it('uses +35% ceiling for LEET tier when C.003 is complete', () => {
            const cardCollectionMock = mockDeep<CardCollection>({
                isAlbumComplete: (album: Album) => album === Album.C003,
            });
            const leet = tiers.get(Tier.LEET)!;
            const weaponBonusCalculator = makeWeaponBonusCalculator(cardCollectionMock);
            // With C.003 bonus: TOP_CEIL_PERCENT = 35
            const result = weaponBonusCalculator.randomMultiplierForTier(leet);
            expect(result).toBeGreaterThanOrEqual(1.16);
            expect(result).toBeLessThanOrEqual(1.35);
        });
    });

    describe('applyWeaponBonus', () => {
        it('returns a weapon with adjusted damage and matching tier', () => {
            const tierManagerMock = mockDeep<TierManager>({
                getWeaponTierForMultiplier: (_: number) => tiers.get(Tier.OVERCLOCKED)!,
            });
            const weapon = makeWeapon(100, 200, 100);
            const weaponBonusCalculator = makeWeaponBonusCalculator(undefined, tierManagerMock);
            // +10% => OVERCLOCKED
            const result = weaponBonusCalculator.applyWeaponBonus(weapon, 1.10);
            expect(result.damage).toBe(110);
            expect(result.tier.name).toBe(Tier.OVERCLOCKED);
            expect(result.buyPrice).toBe(220);
            expect(result.sellPrice).toBe(110);
        });

        it('returns STABLE clone when multiplier is too small to change integer damage', () => {
            const weapon = makeWeapon(10, 20, 10);
            const weaponBonusCalculator = makeWeaponBonusCalculator();
            // 1.001 * 10 = 10.01 => floor = 10 (no change)
            const result = weaponBonusCalculator.applyWeaponBonus(weapon, 1.001);
            expect(result.damage).toBe(10);
            expect(result.tier.name).toBe(Tier.STABLE);
        });

        it('returns BROKEN tier for a negative bonus that reduces damage', () => {
            const tierManagerMock = mockDeep<TierManager>({
                getWeaponTierForMultiplier: (_: number) => tiers.get(Tier.BROKEN)!,
            });
            const weapon = makeWeapon(100, 200, 100);
            const weaponBonusCalculator = makeWeaponBonusCalculator(undefined, tierManagerMock);
            // -10% => BROKEN
            const result = weaponBonusCalculator.applyWeaponBonus(weapon, 0.90);
            expect(result.damage).toBe(90);
            expect(result.tier.name).toBe(Tier.BROKEN);
        });
    });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ItemDropManager } from './ItemDropManager';
import { ItemDropType } from './ItemDropType';
import { MoneyDropStrategy } from './bits/MoneyDropStrategy';
import { BoosterPackDropStrategy } from './cards/BoosterPackDropStrategy';
import { XDataDropStrategy } from './xdata/XDataDropStrategy';
import { WeaponDropStrategy } from './weapons/WeaponDropStrategy';
import { ChipDropStrategy } from './chips/ChipDropStrategy';
import { CoreDropStrategy } from './cores/CoreDropStrategy';

/** Minimal Enemy stub for strategy tests */
function makeEnemyStub(overrides: Record<string, unknown> = {}) {
    return {
        xDataDropChanceWeight: 1,
        itemDropChance: 0.05,
        hp: 0,
        isDead: true,
        getDeathPosition: () => ({ x: 0, y: 0, z: 0 }),
        body: { position: { x: 0, y: 0, z: 0 } },
        ...overrides,
    } as any;
}

/** Minimal Player stub for strategy tests */
function makePlayerStub(overrides: Record<string, unknown> = {}) {
    const stub: Record<string, any> = {
        level: 1,
        luck: 1,
        luckDropChanceBonus: 1 / 40000,
        bits: 0,
        xData: 0,
        boosterPacks: 0,
        currentWeaponType: 'SWORD',
        weaponDropBonusFactor: 1.0,
        inventory: [],
        tech: { SWORD: 0, DUAL_BLADE: 0, LANCE: 0, HAMMER: 0 },
        getTechForWeapon: vi.fn(() => 0),
        ...overrides,
    };
    stub.collectXData = vi.fn((n: number) => { stub.xData += n; });
    stub.collectBoosterPack = vi.fn(() => { stub.boosterPacks += 1; });
    return stub as any;
}

// ─── XDataDropStrategy ─────────────────────────────────────────────────────────

describe('XDataDropStrategy.getDistributionWeight', () => {
    const strategy = new XDataDropStrategy();

    it('returns 0 for players below level 10', () => {
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub({ level: 9 }))).toBe(0);
    });

    it('returns a non-zero weight for players at level 10', () => {
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub({ level: 10 }))).toBeGreaterThan(0);
    });

    it('scales linearly between level 10 and 100', () => {
        const enemy = makeEnemyStub({ xDataDropChanceWeight: 1 });
        const w50 = strategy.getDistributionWeight(enemy, makePlayerStub({ level: 50 }));
        const w100 = strategy.getDistributionWeight(enemy, makePlayerStub({ level: 100 }));
        expect(w50).toBeCloseTo(0.5, 5);
        expect(w100).toBe(1);
    });

    it('caps weight at enemy.xDataDropChanceWeight for level >= 100', () => {
        const enemy = makeEnemyStub({ xDataDropChanceWeight: 3 });
        expect(strategy.getDistributionWeight(enemy, makePlayerStub({ level: 200 }))).toBe(3);
    });
});

// ─── XDataDropStrategy.pickup ─────────────────────────────────────────────────

describe('XDataDropStrategy.pickup', () => {
    it('calls player.collectXData with the drop amount', () => {
        const strategy = new XDataDropStrategy();
        const player = makePlayerStub();
        const drop = { amount: 5 } as any;
        strategy.pickup(drop, player);
        expect(player.collectXData).toHaveBeenCalledWith(5);
    });
});

// ─── BoosterPackDropStrategy ───────────────────────────────────────────────────

describe('BoosterPackDropStrategy', () => {
    it('has weight 1', () => {
        const strategy = new BoosterPackDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(1);
    });

    it('pickup calls player.collectBoosterPack', () => {
        const strategy = new BoosterPackDropStrategy();
        const player = makePlayerStub();
        strategy.pickup({} as any, player);
        expect(player.collectBoosterPack).toHaveBeenCalledOnce();
    });
});

// ─── MoneyDropStrategy ────────────────────────────────────────────────────────

describe('MoneyDropStrategy', () => {
    const strategy = new MoneyDropStrategy();

    it('has distribution weight 6', () => {
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(6);
    });

    it('pickup adds the money amount to player.bits', () => {
        const player = makePlayerStub({ bits: 100 });
        const drop = { amount: 50 } as any;
        strategy.pickup(drop, player);
        expect(player.bits).toBe(150);
    });
});

// ─── WeaponDropStrategy ───────────────────────────────────────────────────────

describe('WeaponDropStrategy', () => {
    it('has distribution weight 5', () => {
        const strategy = new WeaponDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(5);
    });
});

// ─── ChipDropStrategy ─────────────────────────────────────────────────────────

describe('ChipDropStrategy', () => {
    it('has a positive distribution weight', () => {
        const strategy = new ChipDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBeGreaterThan(0);
    });
});

// ─── CoreDropStrategy ─────────────────────────────────────────────────────────

describe('CoreDropStrategy', () => {
    it('has a positive distribution weight', () => {
        const strategy = new CoreDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBeGreaterThan(0);
    });
});

// ─── ItemDropManager – strategy registration ──────────────────────────────────

describe('ItemDropManager – registered strategies', () => {
    beforeEach(() => {
        // Reset singleton so each test gets a fresh instance
        (ItemDropManager as any).instance = undefined;
    });

    it('registers all expected drop types', () => {
        const mgr = ItemDropManager.Instance;
        const expected = Object.values(ItemDropType);
        for (const type of expected) {
            // checkInteraction should not throw for any registered type
            expect(() => mgr.checkInteraction(type as ItemDropType, { x: 0, y: 0, z: 0, distanceTo: () => 99 } as any)).not.toThrow();
        }
    });
});

// ─── ItemDropManager – tryDropItem respects drop chance ───────────────────────

describe('ItemDropManager.tryDropItem', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
    });

    it('does not drop when random roll exceeds drop chance', () => {
        // Random > effectiveDropChance (0.05 + ~0) → no drop
        vi.spyOn(Math, 'random').mockReturnValue(0.9);
        const mgr = ItemDropManager.Instance;
        const enemy = makeEnemyStub();
        const player = makePlayerStub();
        mgr.tryDropItem({} as any, enemy, player);
        // No drops should be stored
        expect(mgr.checkInteraction(ItemDropType.MONEY, { x: 0, y: 0, z: 0, distanceTo: () => 0 } as any)).toBeNull();
        vi.restoreAllMocks();
    });
});

// ─── ItemDropManager – checkInteraction ───────────────────────────────────────

describe('ItemDropManager.checkInteraction', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
    });

    it('returns null when no drops are present', () => {
        const mgr = ItemDropManager.Instance;
        const result = mgr.checkInteraction(ItemDropType.MONEY, { x: 0, y: 0, z: 0, distanceTo: () => 0 } as any);
        expect(result).toBeNull();
    });

    it('returns null when drop is out of range', () => {
        const mgr = ItemDropManager.Instance;
        // Manually inject a drop that is far away
        const farDrop = {
            mesh: { position: { x: 100, y: 0, z: 100 } },
            update: vi.fn(),
            cleanup: vi.fn(),
        };
        (mgr as any).drops.get(ItemDropType.MONEY).push(farDrop);
        const playerPos = { x: 0, y: 0, z: 0, distanceTo: () => 50 };
        expect(mgr.checkInteraction(ItemDropType.MONEY, playerPos as any)).toBeNull();
    });

    it('returns the drop when player is within pickup radius', () => {
        const mgr = ItemDropManager.Instance;
        const nearDrop = {
            mesh: { position: { x: 0, y: 0, z: 0 } },
            update: vi.fn(),
            cleanup: vi.fn(),
        };
        (mgr as any).drops.get(ItemDropType.MONEY).push(nearDrop);
        const playerPos = { x: 0, y: 0, z: 0, distanceTo: () => 0.5 };
        expect(mgr.checkInteraction(ItemDropType.MONEY, playerPos as any)).toBe(nearDrop);
    });
});

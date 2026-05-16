import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ItemDropManager } from './ItemDropManager';
import { ItemDropType } from './ItemDropType';
import { MoneyDropStrategy } from './bits/MoneyDropStrategy';
import { BoosterPackDropStrategy } from './cards/BoosterPackDropStrategy';
import { XDataDropStrategy } from './xdata/XDataDropStrategy';
import { WeaponDropStrategy } from './weapons/WeaponDropStrategy';
import { ChipDropStrategy } from './chips/ChipDropStrategy';
import { CoreDropStrategy } from './cores/CoreDropStrategy';
import { HPPotionDropStrategy, TPPotionDropStrategy } from './potions/PotionDropStrategies';
import { CardCollection } from './cards/CardCollection';
import { Album } from './cards/Card';

const audioManagerMock = vi.hoisted(() => ({
    playItemPickup: vi.fn(),
}));

vi.mock('../AudioManager', () => ({
    AudioManager: {
        Instance: audioManagerMock,
    },
}));

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
        collectionBonusItemDropChance: 0,
        collectionBonusWeaponDropFactor: 0,
        bits: 0,
        xData: 0,
        boosterPacks: 0,
        currentWeaponType: 'SWORD',
        weaponDropBonusFactor: 1.0,
        inventory: [],
        tech: { SWORD: 0, DUAL_BLADE: 0, LANCE: 0, HAMMER: 0 },
        hp: 100,
        maxHp: 170,
        tp: 30,
        maxTp: 60,
        getTechForWeapon: vi.fn(() => 0),
        heal: vi.fn(),
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
    it('has distribution weight 4', () => {
        const strategy = new ChipDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(4);
    });
});

// ─── CoreDropStrategy ─────────────────────────────────────────────────────────

describe('CoreDropStrategy', () => {
    it('has distribution weight 4', () => {
        const strategy = new CoreDropStrategy();
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(4);
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

// ─── ChipDropStrategy.pickup ──────────────────────────────────────────────────

describe('ChipDropStrategy.pickup', () => {
    it('adds the chip to player inventory', () => {
        const strategy = new ChipDropStrategy();
        const player = makePlayerStub();
        // firewire_alpha is the known chip id at level 1
        strategy.pickup({ chipId: 'firewire_alpha' } as any, player);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0].name).toBe('Firewire');
    });

    it('does nothing when chip id is not found', () => {
        const strategy = new ChipDropStrategy();
        const player = makePlayerStub();
        strategy.pickup({ chipId: 'non-existent-chip-id' } as any, player);
        expect(player.inventory).toHaveLength(0);
    });
});

// ─── CoreDropStrategy.pickup ──────────────────────────────────────────────────

describe('CoreDropStrategy.pickup', () => {
    it('adds the core to player inventory', () => {
        const strategy = new CoreDropStrategy();
        const player = makePlayerStub();
        // herald_core_alpha is the known core id at level 1
        strategy.pickup({ coreId: 'herald_core_alpha' } as any, player);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0].name).toBe('Herald Core');
    });

    it('does nothing when core id is not found', () => {
        const strategy = new CoreDropStrategy();
        const player = makePlayerStub();
        strategy.pickup({ coreId: 'non-existent-core-id' } as any, player);
        expect(player.inventory).toHaveLength(0);
    });
});

// ─── WeaponDropStrategy.pickup ────────────────────────────────────────────────

describe('WeaponDropStrategy.pickup', () => {
    it('adds the weapon to player inventory', () => {
        const strategy = new WeaponDropStrategy();
        const player = makePlayerStub();
        // aegis_sword_alpha is a known weapon at level 1 with damage 10
        strategy.pickup({ weaponId: 'aegis_sword_alpha', damage: 10 } as any, player);
        expect(player.inventory).toHaveLength(1);
        expect(player.inventory[0].name).toBe('Aegis Sword');
    });

    it('does nothing when weapon id is not found', () => {
        const strategy = new WeaponDropStrategy();
        const player = makePlayerStub();
        strategy.pickup({ weaponId: 'non-existent-weapon-id', damage: 10 } as any, player);
        expect(player.inventory).toHaveLength(0);
    });
});

// ─── ItemDropManager.pickup ───────────────────────────────────────────────────

describe('ItemDropManager.pickup', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
        audioManagerMock.playItemPickup.mockClear();
    });

    it('delegates to strategy.pickup and removes the drop from storage', () => {
        const mgr = ItemDropManager.Instance;
        const mockDrop = {
            mesh: { position: { x: 0, y: 0, z: 0 } },
            cleanup: vi.fn(),
        };
        const player = makePlayerStub();

        // Inject the drop directly into storage
        (mgr as any).drops.get(ItemDropType.MONEY).push(mockDrop);

        // Execute pickup
        mgr.pickup(ItemDropType.MONEY, {} as any, mockDrop as any, player);

        // Cleanup should have been called
        expect(audioManagerMock.playItemPickup).toHaveBeenCalledOnce();
        expect(mockDrop.cleanup).toHaveBeenCalled();
        // Drop should be removed
        expect((mgr as any).drops.get(ItemDropType.MONEY)).toHaveLength(0);
    });

    it('does nothing for an unregistered key', () => {
        const mgr = ItemDropManager.Instance;
        const mockDrop = { cleanup: vi.fn() };
        const player = makePlayerStub();
        expect(() => mgr.pickup('UNKNOWN_TYPE' as any, {} as any, mockDrop as any, player)).not.toThrow();
    });
});

// ─── ItemDropManager.update ───────────────────────────────────────────────────

describe('ItemDropManager.update', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
    });

    it('calls update on each stored drop', () => {
        const mgr = ItemDropManager.Instance;
        const mockUpdate = vi.fn();
        const mockDrop = { update: mockUpdate };

        (mgr as any).drops.get(ItemDropType.MONEY).push(mockDrop);

        const cameraPos = { x: 0, y: 0, z: 0 } as any;
        const playerPos = { x: 0, y: 0, z: 0 } as any;
        mgr.update(0.016, cameraPos, playerPos);

        expect(mockUpdate).toHaveBeenCalledWith(0.016, cameraPos, playerPos);
    });
});

// ─── ItemDropManager.clear ────────────────────────────────────────────────────

describe('ItemDropManager.clear', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
    });

    it('calls cleanup on all drops and empties storage', () => {
        const mgr = ItemDropManager.Instance;
        const mockCleanup = vi.fn();
        const mockDrop1 = { cleanup: mockCleanup };
        const mockDrop2 = { cleanup: mockCleanup };

        (mgr as any).drops.get(ItemDropType.MONEY).push(mockDrop1, mockDrop2);
        mgr.clear({} as any);

        expect(mockCleanup).toHaveBeenCalledTimes(2);
        expect((mgr as any).drops.get(ItemDropType.MONEY)).toHaveLength(0);
    });
});

// ─── XDataDropStrategy – C.001 bonus ─────────────────────────────────────────

describe('XDataDropStrategy – C.001 bonus', () => {
    const strategy = new XDataDropStrategy();
    const mockScene = { add: vi.fn() } as any;

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('without C.001, roll 0.24 yields 5 XData (below mediumAmountLimit 0.25)', () => {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockReturnValue(false);
        vi.spyOn(Math, 'random').mockReturnValue(0.24);
        const enemy = { xDataDropChanceWeight: 1, getDeathPosition: () => ({ x: 0, y: 0.5, z: 0 }) } as any;
        const player = { level: 50, collectXData: vi.fn() } as any;
        const drop = strategy.drop(mockScene, enemy, player);
        expect((drop as any)?.amount).toBe(5);
    });

    it('without C.001, roll 0.27 yields 1 XData (above mediumAmountLimit 0.25)', () => {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockReturnValue(false);
        vi.spyOn(Math, 'random').mockReturnValue(0.27);
        const enemy = { xDataDropChanceWeight: 1, getDeathPosition: () => ({ x: 0, y: 0.5, z: 0 }) } as any;
        const player = { level: 50, collectXData: vi.fn() } as any;
        const drop = strategy.drop(mockScene, enemy, player);
        expect((drop as any)?.amount).toBe(1);
    });

    it('with C.001, roll 0.27 yields 5 XData (mediumAmountLimit boosted to 0.30)', () => {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockImplementation(
            (a) => a === Album.C001
        );
        vi.spyOn(Math, 'random').mockReturnValue(0.27);
        const enemy = { xDataDropChanceWeight: 1, getDeathPosition: () => ({ x: 0, y: 0.5, z: 0 }) } as any;
        const player = { level: 50, collectXData: vi.fn() } as any;
        const drop = strategy.drop(mockScene, enemy, player);
        expect((drop as any)?.amount).toBe(5);
    });

    it('with C.001 at level 100, roll 0.04 yields 100 XData (veryHighAmountLimit boosted from 0 to 0.05)', () => {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockImplementation(
            (a) => a === Album.C001
        );
        vi.spyOn(Math, 'random').mockReturnValue(0.04);
        // low-weight enemy so isHighChance is false, but level >= 100 + C.001 should still fire
        const enemy = { xDataDropChanceWeight: 1, getDeathPosition: () => ({ x: 0, y: 0.5, z: 0 }) } as any;
        const player = { level: 100, collectXData: vi.fn() } as any;
        const drop = strategy.drop(mockScene, enemy, player);
        expect((drop as any)?.amount).toBe(100);
    });

    it('without C.001 at level 100 with low-weight enemy, roll 0.04 yields 20 XData (veryHighAmountLimit stays 0)', () => {
        vi.spyOn(CardCollection.Instance, 'isAlbumComplete').mockReturnValue(false);
        vi.spyOn(Math, 'random').mockReturnValue(0.04);
        const enemy = { xDataDropChanceWeight: 1, getDeathPosition: () => ({ x: 0, y: 0.5, z: 0 }) } as any;
        const player = { level: 100, collectXData: vi.fn() } as any;
        const drop = strategy.drop(mockScene, enemy, player);
        expect((drop as any)?.amount).toBe(20);
    });
});

// ─── HPPotionDropStrategy ─────────────────────────────────────────────────────

describe('HPPotionDropStrategy', () => {
    const strategy = new HPPotionDropStrategy();

    it('has distribution weight 0 (not part of weighted drops)', () => {
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(0);
    });

    it('drop returns null', () => {
        expect(strategy.drop()).toBeNull();
    });

    it('pickup calls player.heal with HP amount', () => {
        const player = makePlayerStub();
        const drop = { amount: 40, level: 2 } as any;
        strategy.pickup(drop, player);
        expect(player.heal).toHaveBeenCalledWith(40, 0, true);
    });
});

// ─── TPPotionDropStrategy ─────────────────────────────────────────────────────

describe('TPPotionDropStrategy', () => {
    const strategy = new TPPotionDropStrategy();

    it('has distribution weight 0 (not part of weighted drops)', () => {
        expect(strategy.getDistributionWeight(makeEnemyStub(), makePlayerStub())).toBe(0);
    });

    it('drop returns null', () => {
        expect(strategy.drop()).toBeNull();
    });

    it('pickup calls player.heal with TP amount', () => {
        const player = makePlayerStub();
        const drop = { amount: 60, level: 5 } as any;
        strategy.pickup(drop, player);
        expect(player.heal).toHaveBeenCalledWith(0, 60, true);
    });
});

// ─── ItemDropManager.tryDropPotion ────────────────────────────────────────────

describe('ItemDropManager.tryDropPotion', () => {
    beforeEach(() => {
        (ItemDropManager as any).instance = undefined;
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('does not drop when random roll exceeds base chance', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.9);
        const mgr = ItemDropManager.Instance;
        const player = makePlayerStub();
        mgr.tryDropPotion({} as any, { x: 0, y: 1, z: 0 } as any, player, 0.05);
        expect(mgr.checkInteraction(ItemDropType.HP_POTION, { x: 0, y: 0, z: 0, distanceTo: () => 0 } as any)).toBeNull();
        expect(mgr.checkInteraction(ItemDropType.TP_POTION, { x: 0, y: 0, z: 0, distanceTo: () => 0 } as any)).toBeNull();
    });

    it('drops an HP potion when both rolls succeed for HP', () => {
        // First random: 0.01 < 0.05 → passes base chance
        // Second random: 0.3 < 0.5 → HP potion
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(0.3);
        const mgr = ItemDropManager.Instance;
        const player = makePlayerStub({ level: 50 });
        mgr.tryDropPotion({ add: vi.fn() } as any, { x: 0, y: 1, z: 0 } as any, player, 0.05);
        const drop = mgr.checkInteraction(ItemDropType.HP_POTION, { x: 0, y: 1, z: 0, distanceTo: () => 0 } as any);
        expect(drop).not.toBeNull();
    });

    it('drops a TP potion when second roll >= 0.5', () => {
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.01).mockReturnValueOnce(0.7);
        const mgr = ItemDropManager.Instance;
        const player = makePlayerStub({ level: 50 });
        mgr.tryDropPotion({ add: vi.fn() } as any, { x: 0, y: 1, z: 0 } as any, player, 0.05);
        const drop = mgr.checkInteraction(ItemDropType.TP_POTION, { x: 0, y: 1, z: 0, distanceTo: () => 0 } as any);
        expect(drop).not.toBeNull();
    });
});

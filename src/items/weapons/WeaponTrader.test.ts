import { describe, expect, it, vi } from 'vitest';
import { CardCollection } from '../cards/CardCollection';
import { Player } from '../../player/Player';
import { TierManager } from '../TierManager';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { WeaponItem } from './WeaponItem';
import { WeaponRepository } from './WeaponRepository';
import { WeaponTrader } from './WeaponTrader';

function makeTrader(repository = new WeaponRepository(new TierManager())): WeaponTrader {
    const trader = Object.create(WeaponTrader.prototype) as WeaponTrader;
    Object.assign(trader, {
        weaponRepository: repository,
        weaponBonusCalculator: {
            randomMultiplierForTier: vi.fn().mockReturnValue(1),
            applyWeaponBonus: vi.fn((weapon: WeaponItem) => weapon),
        } as unknown as WeaponBonusCalculator,
        tierManager: new TierManager(),
        cardCollection: { isAlbumComplete: vi.fn().mockReturnValue(false) } as unknown as CardCollection,
        pendingInventoryInit: true,
        traderInventory: [],
        isVisible: false,
    });
    return trader;
}

function makePlayer(): Player {
    return {
        level: 1,
        getTechForWeapon: vi.fn().mockReturnValue(0),
    } as unknown as Player;
}

describe('WeaponTrader', () => {
    it('only stocks trader-eligible weapon families', () => {
        const trader = makeTrader();

        trader.update(makePlayer());

        expect(trader.traderInventory).toHaveLength(60);
        expect(trader.traderInventory.every(weapon =>
            !weapon.id.startsWith('broad_sword_') && !weapon.id.startsWith('tampered_blade_'),
        )).toBe(true);
    });

    it('skips stock slots safely when no eligible weapons exist', () => {
        const repository = {
            getTraderEligibleWeaponsByTypeAndLevel: vi.fn().mockReturnValue([]),
        } as unknown as WeaponRepository;
        const trader = makeTrader(repository);

        expect(() => trader.update(makePlayer())).not.toThrow();
        expect(trader.traderInventory).toEqual([]);
    });
});
import { describe, it, expect, vi } from 'vitest';
import { WeaponItem } from './WeaponItem';
import { WeaponType } from './WeaponType';
import { Tier, TierManager } from '../TierManager';
import { Player } from '../../Player';

function stableTier() {
    return TierManager.Instance.tiers.get(Tier.STABLE)!;
}

function makeWeapon(level = 1, damage = 10, weaponType = WeaponType.SWORD): WeaponItem {
    return new WeaponItem('w1', 'Test Sword', 100, 50, weaponType, damage, 'model.glb', stableTier(), level);
}

function makePlayer(overrides: Partial<Record<string, unknown>> = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, {
        level: 1,
        inventory: [] as WeaponItem[],
        tech: {} as Record<WeaponType, number>,
        getTechForWeapon: vi.fn().mockReturnValue(0),
        setWeapon: vi.fn(),
        recalculateStats: vi.fn(),
        ...overrides,
    });
    return player;
}

describe('WeaponItem', () => {
    describe('getLevelByNumber', () => {
        it('returns level 1 definition (requiredTech=0)', () => {
            const weapon = makeWeapon(1);
            const def = weapon.getLevelByNumber();
            expect(def.requiredTech).toBe(0);
            expect(def.damagePercent).toBe(1);
        });

        it('returns level 2 definition (requiredTech=120)', () => {
            const weapon = makeWeapon(2);
            const def = weapon.getLevelByNumber();
            expect(def.requiredTech).toBe(120);
        });

        it('caps at the highest level definition for level beyond max', () => {
            const weapon = makeWeapon(99);
            const def = weapon.getLevelByNumber();
            expect(def).toBe(WeaponItem.WEAPON_LEVELS[WeaponItem.WEAPON_LEVELS.length - 1]);
        });

        it('throws for level 0', () => {
            const weapon = makeWeapon(0);
            expect(() => weapon.getLevelByNumber()).toThrow();
        });
    });

    describe('canEquip', () => {
        it('returns true when player tech meets the requirement', () => {
            const weapon = makeWeapon(1); // requires 0 tech
            const player = makePlayer({ getTechForWeapon: vi.fn().mockReturnValue(0) });
            expect(weapon.canEquip(player)).toBe(true);
        });

        it('returns false when player tech is below requirement', () => {
            const weapon = makeWeapon(2); // requires 120 tech
            const player = makePlayer({ getTechForWeapon: vi.fn().mockReturnValue(50) });
            expect(weapon.canEquip(player)).toBe(false);
        });

        it('returns true when player tech exactly meets the requirement', () => {
            const weapon = makeWeapon(2); // requires 120 tech
            const player = makePlayer({ getTechForWeapon: vi.fn().mockReturnValue(120) });
            expect(weapon.canEquip(player)).toBe(true);
        });
    });

    describe('equip', () => {
        it('equips the weapon and marks it as equipped', () => {
            const weapon = makeWeapon(1);
            const setWeapon = vi.fn();
            const player = makePlayer({ getTechForWeapon: vi.fn().mockReturnValue(0), setWeapon });
            weapon.equip(player);
            expect(weapon.isEquipped).toBe(true);
            expect(setWeapon).toHaveBeenCalledWith(weapon);
        });

        it('does not equip when player tech is insufficient', () => {
            const weapon = makeWeapon(2); // requires 120 tech
            const setWeapon = vi.fn();
            const player = makePlayer({ getTechForWeapon: vi.fn().mockReturnValue(0), setWeapon });
            weapon.equip(player);
            expect(weapon.isEquipped).toBe(false);
            expect(setWeapon).not.toHaveBeenCalled();
        });

        it('unequips other weapons before equipping', () => {
            const existingWeapon = makeWeapon(1);
            existingWeapon.isEquipped = true;
            const unequipOther = vi.fn((_: Player) => { existingWeapon.isEquipped = false; });
            existingWeapon.unequip = unequipOther;

            const newWeapon = makeWeapon(1);
            const player = makePlayer({
                getTechForWeapon: vi.fn().mockReturnValue(0),
                setWeapon: vi.fn(),
                inventory: [existingWeapon],
            });

            newWeapon.equip(player);
            expect(existingWeapon.isEquipped).toBe(false);
        });
    });

    describe('unequip', () => {
        it('marks the weapon as not equipped', () => {
            const weapon = makeWeapon(1);
            weapon.isEquipped = true;
            weapon.unequip(makePlayer());
            expect(weapon.isEquipped).toBe(false);
        });
    });

    describe('clone', () => {
        it('returns a new weapon with the same properties', () => {
            const weapon = makeWeapon(2, 20);
            const cloned = weapon.clone();
            expect(cloned).not.toBe(weapon);
            expect(cloned.name).toBe(weapon.name);
            expect(cloned.damage).toBe(20);
            expect(cloned.level).toBe(2);
        });

        it('uses a provided id when cloning', () => {
            const weapon = makeWeapon(1);
            const cloned = weapon.clone('new-id');
            expect(cloned.id).toBe('new-id');
        });
    });

    describe('cloneWith', () => {
        it('returns a new weapon with overridden stats', () => {
            const weapon = makeWeapon(1, 10);
            const overclocked = TierManager.Instance.tiers.get(Tier.OVERCLOCKED)!;
            const cloned = weapon.cloneWith(15, 300, 150, overclocked);
            expect(cloned.damage).toBe(15);
            expect(cloned.buyPrice).toBe(300);
            expect(cloned.sellPrice).toBe(150);
            expect(cloned.tier.name).toBe(Tier.OVERCLOCKED);
            expect(cloned.level).toBe(weapon.level);
        });
    });
});

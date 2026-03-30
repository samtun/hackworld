import { describe, it, expect } from 'vitest';
import { sortInventory } from './ItemSorter';
import { Item } from './Item';
import { WeaponItem } from './weapons/WeaponItem';
import { CoreItem } from './cores/CoreItem';
import { ChipItem } from './chips/ChipItem';
import { ChipType } from './chips/Chip';
import { WeaponType } from './weapons/WeaponType';
import { Tier, TierManager } from './TierManager';

function tier(t: Tier) {
    return TierManager.Instance.tiers.get(t)!;
}

function weapon(level: number, t: Tier = Tier.STABLE, type: WeaponType = WeaponType.SWORD): WeaponItem {
    return new WeaponItem(crypto.randomUUID(), 'Sword', 100, 50, type, 10, 'model.glb', tier(t), level);
}

function core(level: number): CoreItem {
    return new CoreItem(crypto.randomUUID(), 'Herald Core', 200, 100, { strength: 3 }, level);
}

function chip(level: number): ChipItem {
    return new ChipItem(crypto.randomUUID(), 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.1 }, level);
}

describe('sortInventory', () => {
    it('sorts weapons before cores before chips', () => {
        const items: Item[] = [chip(1), core(1), weapon(1)];
        sortInventory(items);
        expect(items.map(i => i.getType())).toEqual(['weapon', 'core', 'chip']);
    });

    it('sorts by level high to low within the same type', () => {
        const items: Item[] = [weapon(1), weapon(3), weapon(2)];
        sortInventory(items);
        expect(items.map(i => (i as WeaponItem).level)).toEqual([3, 2, 1]);
    });

    it('sorts cores by level high to low', () => {
        const items: Item[] = [core(1), core(4), core(2)];
        sortInventory(items);
        expect(items.map(i => (i as CoreItem).level)).toEqual([4, 2, 1]);
    });

    it('sorts chips by level high to low', () => {
        const items: Item[] = [chip(2), chip(5), chip(1)];
        sortInventory(items);
        expect(items.map(i => (i as ChipItem).level)).toEqual([5, 2, 1]);
    });

    it('sorts weapons by tier high to low when type and level are equal', () => {
        const items: Item[] = [
            weapon(2, Tier.STABLE),
            weapon(2, Tier.LEET),
            weapon(2, Tier.OVERCLOCKED),
        ];
        sortInventory(items);
        const tiers = items.map(i => (i as WeaponItem).tier.name);
        expect(tiers).toEqual([Tier.LEET, Tier.OVERCLOCKED, Tier.STABLE]);
    });

    it('applies all three sorting criteria combined', () => {
        const items: Item[] = [
            chip(1),
            weapon(1, Tier.OVERCLOCKED),
            core(3),
            weapon(3, Tier.STABLE),
            core(1),
            weapon(1, Tier.STABLE),
            chip(2),
        ];
        sortInventory(items);
        // Weapons first (level desc, then tier desc), then cores (level desc), then chips (level desc)
        expect(items.map(i => i.getType())).toEqual(['weapon', 'weapon', 'weapon', 'core', 'core', 'chip', 'chip']);
        expect((items[0] as WeaponItem).level).toBe(3);
        expect((items[1] as WeaponItem).level).toBe(1);
        expect((items[1] as WeaponItem).tier.name).toBe(Tier.OVERCLOCKED);
        expect((items[2] as WeaponItem).level).toBe(1);
        expect((items[2] as WeaponItem).tier.name).toBe(Tier.STABLE);
        expect((items[3] as CoreItem).level).toBe(3);
        expect((items[4] as CoreItem).level).toBe(1);
        expect((items[5] as ChipItem).level).toBe(2);
        expect((items[6] as ChipItem).level).toBe(1);
    });

    it('handles an empty array without error', () => {
        const items: Item[] = [];
        sortInventory(items);
        expect(items).toEqual([]);
    });

    it('handles a single item without error', () => {
        const items: Item[] = [weapon(1)];
        sortInventory(items);
        expect(items.length).toBe(1);
    });

    it('is stable for items with identical sorting keys', () => {
        const a = weapon(2, Tier.STABLE);
        const b = weapon(2, Tier.STABLE);
        const items: Item[] = [a, b];
        sortInventory(items);
        expect(items[0]).toBe(a);
        expect(items[1]).toBe(b);
    });
});

import { describe, it, expect, vi } from 'vitest';
import { ChipItem } from './ChipItem';
import { ChipType } from './Chip';
import { Player } from '../../player/Player';

function makeChip(level = 1): ChipItem {
    return new ChipItem('c1', 'Firewire', 150, 75, ChipType.FIREWIRE, { weaponRangeMultiplier: 1.10 }, level);
}

function makePlayer(overrides: Partial<Record<string, unknown>> = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, {
        level: 1,
        inventory: [] as ChipItem[],
        recalculateStats: vi.fn(),
        ...overrides,
    });
    return player;
}

describe('ChipItem', () => {
    describe('getLevelByNumber', () => {
        it('returns level 1 definition (requiredLevel=1)', () => {
            const def = makeChip(1).getLevelByNumber();
            expect(def.requiredLevel).toBe(1);
        });

        it('returns level 2 definition (requiredLevel=10)', () => {
            const def = makeChip(2).getLevelByNumber();
            expect(def.requiredLevel).toBe(10);
        });

        it('throws for level 0', () => {
            expect(() => makeChip(0).getLevelByNumber()).toThrow();
        });
    });

    describe('getStatMultiplierFromLevelNumber', () => {
        it('returns 1.0 for level 1', () => {
            expect(makeChip(1).getStatMultiplierFromLevelNumber()).toBeCloseTo(1.0);
        });

        it('returns 1.1 for level 2', () => {
            expect(makeChip(2).getStatMultiplierFromLevelNumber()).toBeCloseTo(1.1);
        });
    });

    describe('getType', () => {
        it('returns "chip"', () => {
            expect(makeChip().getType()).toBe('chip');
        });
    });

    describe('canEquip', () => {
        it('returns true when player level meets the requirement', () => {
            const chip = makeChip(1); // requires player level 1
            const player = makePlayer({ level: 1 });
            expect(chip.canEquip(player)).toBe(true);
        });

        it('returns false when player level is below requirement', () => {
            const chip = makeChip(2); // requires player level 10
            const player = makePlayer({ level: 5 });
            expect(chip.canEquip(player)).toBe(false);
        });
    });

    describe('equip', () => {
        it('equips chip and calls recalculateStats', () => {
            const chip = makeChip(1);
            const recalc = vi.fn();
            const player = makePlayer({ level: 1, recalculateStats: recalc });
            chip.equip(player);
            expect(chip.isEquipped).toBe(true);
            expect(recalc).toHaveBeenCalled();
        });

        it('does not equip when player level is insufficient', () => {
            const chip = makeChip(2); // requires level 10
            const recalc = vi.fn();
            const player = makePlayer({ level: 1, recalculateStats: recalc });
            chip.equip(player);
            expect(chip.isEquipped).toBe(false);
            expect(recalc).not.toHaveBeenCalled();
        });

        it('unequips other chips before equipping', () => {
            const existingChip = makeChip(1);
            existingChip.isEquipped = true;
            const recalc = vi.fn();

            const newChip = makeChip(1);
            const player = makePlayer({
                level: 1,
                recalculateStats: recalc,
                inventory: [existingChip],
            });

            newChip.equip(player);
            expect(existingChip.isEquipped).toBe(false);
        });
    });

    describe('unequip', () => {
        it('marks chip as not equipped and calls recalculateStats', () => {
            const chip = makeChip(1);
            chip.isEquipped = true;
            const recalc = vi.fn();
            const player = makePlayer({ recalculateStats: recalc });
            chip.unequip(player);
            expect(chip.isEquipped).toBe(false);
            expect(recalc).toHaveBeenCalled();
        });
    });

    describe('clone', () => {
        it('returns a new chip with same properties', () => {
            const chip = makeChip(2);
            const cloned = chip.clone();
            expect(cloned).not.toBe(chip);
            expect(cloned.name).toBe('Firewire');
            expect(cloned.level).toBe(2);
            expect(cloned.stats).toEqual(chip.stats);
        });

        it('uses provided id when cloning', () => {
            const chip = makeChip(1);
            const cloned = chip.clone('new-id');
            expect(cloned.id).toBe('new-id');
        });
    });
});

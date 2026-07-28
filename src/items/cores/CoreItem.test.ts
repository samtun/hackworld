import { describe, it, expect, vi } from 'vitest';
import { CoreItem } from './CoreItem';
import { Player } from '../../player/Player';

function makeCore(level = 1): CoreItem {
    return new CoreItem('core1', 'Herald Core', 200, 100, { strength: 3, defense: 2 }, level);
}

function makePlayer(overrides: Partial<Record<string, unknown>> = {}): Player {
    const player = Object.create(Player.prototype) as Player;
    Object.assign(player, {
        level: 1,
        inventory: [] as CoreItem[],
        recalculateStats: vi.fn(),
        ...overrides,
    });
    return player;
}

describe('CoreItem', () => {
    describe('getLevelByNumber', () => {
        it('returns level 1 definition (requiredLevel=1)', () => {
            const def = makeCore(1).getLevelByNumber();
            expect(def.requiredLevel).toBe(1);
        });

        it('returns level 2 definition (requiredLevel=10)', () => {
            const def = makeCore(2).getLevelByNumber();
            expect(def.requiredLevel).toBe(10);
        });

        it('throws for level 0', () => {
            expect(() => makeCore(0).getLevelByNumber()).toThrow();
        });
    });

    describe('getStatMultiplierFromLevelNumber', () => {
        it('returns 1.0 for level 1', () => {
            expect(makeCore(1).getStatMultiplierFromLevelNumber()).toBeCloseTo(1.0);
        });

        it('returns 1.1 for level 2', () => {
            expect(makeCore(2).getStatMultiplierFromLevelNumber()).toBeCloseTo(1.1);
        });
    });

    describe('getEffectiveStats', () => {
        it('returns a copy of the core stats', () => {
            const core = makeCore(1);
            const stats = core.getEffectiveStats();
            expect(stats).toEqual({ strength: 3, defense: 2 });
            // Ensure it's a copy, not the same object
            stats.strength = 99;
            expect(core.getEffectiveStats().strength).toBe(3);
        });
    });

    describe('getType', () => {
        it('returns "core"', () => {
            expect(makeCore().getType()).toBe('core');
        });
    });

    describe('canEquip', () => {
        it('returns true when player level meets the requirement', () => {
            const core = makeCore(1); // requires player level 1
            const player = makePlayer({ level: 1 });
            expect(core.canEquip(player)).toBe(true);
        });

        it('returns false when player level is below requirement', () => {
            const core = makeCore(2); // requires player level 10
            const player = makePlayer({ level: 5 });
            expect(core.canEquip(player)).toBe(false);
        });
    });

    describe('equip', () => {
        it('equips core and calls recalculateStats', () => {
            const core = makeCore(1);
            const recalc = vi.fn();
            const player = makePlayer({ level: 1, recalculateStats: recalc });
            core.equip(player);
            expect(core.isEquipped).toBe(true);
            expect(recalc).toHaveBeenCalled();
        });

        it('does not equip when player level is insufficient', () => {
            const core = makeCore(2); // requires level 10
            const recalc = vi.fn();
            const player = makePlayer({ level: 1, recalculateStats: recalc });
            core.equip(player);
            expect(core.isEquipped).toBe(false);
            expect(recalc).not.toHaveBeenCalled();
        });

        it('unequips other cores before equipping', () => {
            const existingCore = makeCore(1);
            existingCore.isEquipped = true;
            const recalc = vi.fn();

            const newCore = makeCore(1);
            const player = makePlayer({
                level: 1,
                recalculateStats: recalc,
                inventory: [existingCore],
            });

            newCore.equip(player);
            expect(existingCore.isEquipped).toBe(false);
        });
    });

    describe('unequip', () => {
        it('marks core as not equipped and calls recalculateStats', () => {
            const core = makeCore(1);
            core.isEquipped = true;
            const recalc = vi.fn();
            const player = makePlayer({ recalculateStats: recalc });
            core.unequip(player);
            expect(core.isEquipped).toBe(false);
            expect(recalc).toHaveBeenCalled();
        });
    });

    describe('clone', () => {
        it('returns a new core with same properties', () => {
            const core = makeCore(2);
            const cloned = core.clone();
            expect(cloned).not.toBe(core);
            expect(cloned.name).toBe('Herald Core');
            expect(cloned.level).toBe(2);
            expect(cloned.stats).toEqual(core.stats);
        });

        it('uses provided id when cloning', () => {
            const core = makeCore(1);
            const cloned = core.clone('custom-id');
            expect(cloned.id).toBe('custom-id');
        });
    });
});

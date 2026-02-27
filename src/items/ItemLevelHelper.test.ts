import { describe, it, expect, vi } from 'vitest';
import { ItemLevelHelper } from './ItemLevelHelper';

describe('ItemLevelHelper.getLevelChar', () => {
    it('returns α for level 1', () => {
        expect(ItemLevelHelper.getLevelChar(1)).toBe('α');
    });

    it('returns β for level 2', () => {
        expect(ItemLevelHelper.getLevelChar(2)).toBe('β');
    });

    it('returns ω for level 6', () => {
        expect(ItemLevelHelper.getLevelChar(6)).toBe('ω');
    });

    it('returns ω for level beyond max', () => {
        expect(ItemLevelHelper.getLevelChar(100)).toBe('ω');
    });

    it('throws for level 0', () => {
        expect(() => ItemLevelHelper.getLevelChar(0)).toThrow();
    });
});

describe('ItemLevelHelper.getChipCoreLevelByNumber', () => {
    it('returns level 1 definition (requiredLevel=1)', () => {
        const def = ItemLevelHelper.getChipCoreLevelByNumber(1);
        expect(def.requiredLevel).toBe(1);
        expect(def.statPercent).toBe(1.0);
    });

    it('returns level 2 definition (requiredLevel=10)', () => {
        const def = ItemLevelHelper.getChipCoreLevelByNumber(2);
        expect(def.requiredLevel).toBe(10);
        expect(def.statPercent).toBe(1.10);
    });

    it('returns level 6 definition (requiredLevel=124)', () => {
        const def = ItemLevelHelper.getChipCoreLevelByNumber(6);
        expect(def.requiredLevel).toBe(124);
        expect(def.statPercent).toBe(1.90);
    });

    it('caps at max level for level beyond 6', () => {
        const def = ItemLevelHelper.getChipCoreLevelByNumber(99);
        expect(def).toBe(ItemLevelHelper.getChipCoreLevelByNumber(6));
    });

    it('throws for level 0', () => {
        expect(() => ItemLevelHelper.getChipCoreLevelByNumber(0)).toThrow();
    });
});

describe('ItemLevelHelper.getStatMultiplierForLevel', () => {
    it('returns 1.0 for level 1', () => {
        expect(ItemLevelHelper.getStatMultiplierForLevel(1)).toBe(1.0);
    });

    it('returns 1.10 for level 2', () => {
        expect(ItemLevelHelper.getStatMultiplierForLevel(2)).toBe(1.10);
    });

    it('returns 1.90 for level 6', () => {
        expect(ItemLevelHelper.getStatMultiplierForLevel(6)).toBe(1.90);
    });
});

describe('ItemLevelHelper.determineDropLevel', () => {
    it('returns equippable level on 70% roll', () => {
        // player at level 10 can equip level 2, roll < 0.70 → returns 2
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.5);
        expect(ItemLevelHelper.determineDropLevel(10)).toBe(2);
        vi.restoreAllMocks();
    });

    it('returns one level lower on roll >= 0.78', () => {
        // player at level 10 → equippable level 2; roll 0.85 → return max(1, 2-1) = 1
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.85);
        expect(ItemLevelHelper.determineDropLevel(10)).toBe(1);
        vi.restoreAllMocks();
    });

    it('does not return below level 1', () => {
        // player at level 1 → equippable level 1; roll 0.85 → max(1, 1-1) = 1
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.85);
        expect(ItemLevelHelper.determineDropLevel(1)).toBe(1);
        vi.restoreAllMocks();
    });

    it('returns one level higher when within 5 levels of next requirement', () => {
        // Level-2 items require player level 10; player at level 8 is 2 away → within 5
        // equippable level = 1; roll 0.72 (in 0.70-0.78 range) → check proximity
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.72);
        expect(ItemLevelHelper.determineDropLevel(8)).toBe(2);
        vi.restoreAllMocks();
    });

    it('does not return one level higher when far from next requirement', () => {
        // Level-2 items require player level 10; player at level 1 is 9 away → not within 5
        // equippable level = 1; roll 0.72 → NOT within 5 → falls through to return max(1, 0) = 1
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.72);
        expect(ItemLevelHelper.determineDropLevel(1)).toBe(1);
        vi.restoreAllMocks();
    });

    it('returns 1 for a low-level player with low roll', () => {
        // player level 1 → equippable level 1; roll 0.3 → returns 1
        vi.spyOn(Math, 'random').mockReturnValueOnce(0.3);
        expect(ItemLevelHelper.determineDropLevel(1)).toBe(1);
        vi.restoreAllMocks();
    });
});

import { describe, it, expect } from 'vitest';
import {
    PotionType,
    POTION_LEVELS,
    determinePotionLevel,
    getPotionAmount,
} from './PotionDefinitions';

// ─── POTION_LEVELS ────────────────────────────────────────────────────────────

describe('POTION_LEVELS', () => {
    it('has 6 levels', () => {
        expect(POTION_LEVELS).toHaveLength(6);
    });

    it('levels are numbered 1 through 6', () => {
        expect(POTION_LEVELS.map(l => l.level)).toEqual([1, 2, 3, 4, 5, 6]);
    });

    it('level 1 values match spec', () => {
        expect(POTION_LEVELS[0]).toEqual({ level: 1, hpAmount: 200, tpAmount: 100, requiredPlayerLevel: 0 });
    });

    it('level 6 values match spec', () => {
        expect(POTION_LEVELS[5]).toEqual({ level: 6, hpAmount: 4000, tpAmount: 1000, requiredPlayerLevel: 240 });
    });
});

// ─── determinePotionLevel ─────────────────────────────────────────────────────

describe('determinePotionLevel', () => {
    it('returns level 1 for player level 0', () => {
        expect(determinePotionLevel(0)).toBe(1);
    });

    it('returns level 2 for player level 20', () => {
        expect(determinePotionLevel(20)).toBe(2);
    });

    it('returns level 2 for player level 39 (below level 3 threshold)', () => {
        expect(determinePotionLevel(39)).toBe(2);
    });

    it('returns level 3 for player level 40', () => {
        expect(determinePotionLevel(40)).toBe(3);
    });

    it('returns level 4 for player level 70', () => {
        expect(determinePotionLevel(70)).toBe(4);
    });

    it('returns level 5 for player level 120', () => {
        expect(determinePotionLevel(120)).toBe(5);
    });

    it('returns level 6 for player level 240', () => {
        expect(determinePotionLevel(240)).toBe(6);
    });

    it('returns level 6 for very high player level', () => {
        expect(determinePotionLevel(999)).toBe(6);
    });
});

// ─── getPotionAmount ──────────────────────────────────────────────────────────

describe('getPotionAmount', () => {
    it('returns HP amount for HP potion level 1', () => {
        expect(getPotionAmount(PotionType.HP, 1)).toBe(200);
    });

    it('returns TP amount for TP potion level 1', () => {
        expect(getPotionAmount(PotionType.TP, 1)).toBe(100);
    });

    it('returns HP amount for HP potion level 4', () => {
        expect(getPotionAmount(PotionType.HP, 4)).toBe(1000);
    });

    it('returns TP amount for TP potion level 6', () => {
        expect(getPotionAmount(PotionType.TP, 6)).toBe(1000);
    });

    it('returns 0 for invalid level', () => {
        expect(getPotionAmount(PotionType.HP, 0)).toBe(0);
        expect(getPotionAmount(PotionType.TP, 7)).toBe(0);
    });
});

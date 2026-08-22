import { describe, it, expect } from 'vitest';
import { GameProgressManager } from './GameProgressManager';

describe('GameProgressManager', () => {
    describe('initial state', () => {
        it('starts at progress 0', () => {
            const sut = new GameProgressManager();
            expect(sut.progress).toBe(0);
        });
    });

    describe('progress setter', () => {
        it('floors decimal values', () => {
            const sut = new GameProgressManager();
            sut.progress = 2.9;
            expect(sut.progress).toBe(2);
        });

        it('clamps negative values to 0', () => {
            const sut = new GameProgressManager();
            sut.progress = -5;
            expect(sut.progress).toBe(0);
        });

        it('accepts integer values directly', () => {
            const sut = new GameProgressManager();
            sut.progress = 3;
            expect(sut.progress).toBe(3);
        });
    });

    describe('advanceProgress', () => {
        it('increments progress by 1', () => {
            const sut = new GameProgressManager();
            sut.advanceProgress();
            expect(sut.progress).toBe(1);
        });

        it('increments from non-zero value', () => {
            const sut = new GameProgressManager();
            sut.progress = 4;
            sut.advanceProgress();
            expect(sut.progress).toBe(5);
        });
    });

    describe('hasMetMainframe', () => {
        it('returns false at progress 0', () => {
            const sut = new GameProgressManager();
            expect(sut.hasMetMainframe()).toBe(false);
        });

        it('returns true at progress 1', () => {
            const sut = new GameProgressManager();
            sut.progress = 1;
            expect(sut.hasMetMainframe()).toBe(true);
        });
    });

    describe('hasStageBossBeenDefeated', () => {
        it('NetworkMatrix boss is not defeated at progress 1 (requiredProgress=1)', () => {
            const sut = new GameProgressManager();
            sut.progress = 1;
            expect(sut.hasStageBossBeenDefeated(1)).toBe(false);
        });

        it('NetworkMatrix boss is defeated at progress 2 (requiredProgress=1)', () => {
            const sut = new GameProgressManager();
            sut.progress = 2;
            expect(sut.hasStageBossBeenDefeated(1)).toBe(true);
        });

        it('PacketForge boss is defeated at progress 4 (requiredProgress=3)', () => {
            const sut = new GameProgressManager();
            sut.progress = 4;
            expect(sut.hasStageBossBeenDefeated(3)).toBe(true);
        });

        it('SecurityCore boss is not defeated at progress 7 (requiredProgress=7)', () => {
            const sut = new GameProgressManager();
            sut.progress = 7;
            expect(sut.hasStageBossBeenDefeated(7)).toBe(false);
        });

        it('SecurityCore boss is defeated at progress 8 (requiredProgress=7)', () => {
            const sut = new GameProgressManager();
            sut.progress = 8;
            expect(sut.hasStageBossBeenDefeated(7)).toBe(true);
        });

        it('KernelTerminus boss rooms are defeated at progress 10 (requiredProgress=9)', () => {
            const sut = new GameProgressManager();
            sut.progress = 10;
            expect(sut.hasStageBossBeenDefeated(9)).toBe(true);
        });

        it('KernelTerminus boss rooms are not defeated at progress 9 (requiredProgress=9)', () => {
            const sut = new GameProgressManager();
            sut.progress = 9;
            expect(sut.hasStageBossBeenDefeated(9)).toBe(false);
        });

        it('PacketForge boss is not defeated at progress 3 (requiredProgress=3)', () => {
            const sut = new GameProgressManager();
            sut.progress = 3;
            expect(sut.hasStageBossBeenDefeated(3)).toBe(false);
        });
    });

    describe('markBossDefeated', () => {
        it('advances progress from stage-unlocked to boss-defeated state', () => {
            const mgr = new GameProgressManager();
            mgr.progress = 1; // NetworkMatrix unlocked (requiredProgress=1)
            mgr.markBossDefeated(1);
            expect(mgr.progress).toBe(2);
        });

        it('does not advance progress if not in expected state', () => {
            const mgr = new GameProgressManager();
            mgr.progress = 0;
            mgr.markBossDefeated(1); // expected state would be requiredProgress=1
            expect(mgr.progress).toBe(0); // no change
        });

        it('advances progress for PacketForge boss (requiredProgress=3)', () => {
            const mgr = new GameProgressManager();
            mgr.progress = 3; // PacketForge unlocked
            mgr.markBossDefeated(3);
            expect(mgr.progress).toBe(4);
        });

        it('advances progress for SecurityCore boss (requiredProgress=7)', () => {
            const mgr = new GameProgressManager();
            mgr.progress = 7;
            mgr.markBossDefeated(7);
            expect(mgr.progress).toBe(8);
        });
    });

    describe('getUnlockedStageCount', () => {
        it('returns 0 at progress 0', () => {
            const sut = new GameProgressManager();
            expect(sut.getUnlockedStageCount()).toBe(0);
        });

        it('returns 1 at progress 1', () => {
            const sut = new GameProgressManager();
            sut.progress = 1;
            expect(sut.getUnlockedStageCount()).toBe(1);
        });

        it('returns 1 at progress 2', () => {
            const sut = new GameProgressManager();
            sut.progress = 2;
            expect(sut.getUnlockedStageCount()).toBe(1);
        });

        it('returns 2 at progress 3', () => {
            const sut = new GameProgressManager();
            sut.progress = 3;
            expect(sut.getUnlockedStageCount()).toBe(2);
        });

        it('returns 3 at progress 5', () => {
            const sut = new GameProgressManager();
            sut.progress = 5;
            expect(sut.getUnlockedStageCount()).toBe(3);
        });

        it('returns 4 at progress 7', () => {
            const sut = new GameProgressManager();
            sut.progress = 7;
            expect(sut.getUnlockedStageCount()).toBe(4);
        });

        it('returns 5 at progress 9', () => {
            const sut = new GameProgressManager();
            sut.progress = 9;
            expect(sut.getUnlockedStageCount()).toBe(5);
        });
    });

    describe('reset', () => {
        it('resets progress to 0', () => {
            const mgr = new GameProgressManager();
            mgr.progress = 5;
            mgr.reset();
            expect(mgr.progress).toBe(0);
        });
    });

    describe('load', () => {
        it('loads integer progress value', () => {
            const mgr = new GameProgressManager();
            mgr.load(4);
            expect(mgr.progress).toBe(4);
        });

        it('floors decimal values on load', () => {
            const mgr = new GameProgressManager();
            mgr.load(3.7);
            expect(mgr.progress).toBe(3);
        });

        it('clamps negative values to 0 on load', () => {
            const mgr = new GameProgressManager();
            mgr.load(-1);
            expect(mgr.progress).toBe(0);
        });
    });
});

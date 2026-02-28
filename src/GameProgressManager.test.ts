import { describe, it, expect, beforeEach } from 'vitest';
import { GameProgressManager } from './GameProgressManager';

// Reset singleton between tests
function resetSingleton() {
    (GameProgressManager as any).instance = undefined;
}

describe('GameProgressManager', () => {
    beforeEach(() => {
        resetSingleton();
    });

    describe('initial state', () => {
        it('starts at progress 0', () => {
            expect(GameProgressManager.Instance.progress).toBe(0);
        });

        it('returns the same singleton instance', () => {
            const a = GameProgressManager.Instance;
            const b = GameProgressManager.Instance;
            expect(a).toBe(b);
        });
    });

    describe('progress setter', () => {
        it('floors decimal values', () => {
            GameProgressManager.Instance.progress = 2.9;
            expect(GameProgressManager.Instance.progress).toBe(2);
        });

        it('clamps negative values to 0', () => {
            GameProgressManager.Instance.progress = -5;
            expect(GameProgressManager.Instance.progress).toBe(0);
        });

        it('accepts integer values directly', () => {
            GameProgressManager.Instance.progress = 3;
            expect(GameProgressManager.Instance.progress).toBe(3);
        });
    });

    describe('advanceProgress', () => {
        it('increments progress by 1', () => {
            const mgr = GameProgressManager.Instance;
            mgr.advanceProgress();
            expect(mgr.progress).toBe(1);
        });

        it('increments from non-zero value', () => {
            const mgr = GameProgressManager.Instance;
            mgr.progress = 4;
            mgr.advanceProgress();
            expect(mgr.progress).toBe(5);
        });
    });

    describe('hasMetMainframe', () => {
        it('returns false at progress 0', () => {
            expect(GameProgressManager.Instance.hasMetMainframe()).toBe(false);
        });

        it('returns true at progress 1', () => {
            GameProgressManager.Instance.progress = 1;
            expect(GameProgressManager.Instance.hasMetMainframe()).toBe(true);
        });
    });

    describe('hasStageBossBeenDefeated', () => {
        it('NetworkMatrix boss is not defeated at progress 1 (requiredProgress=1)', () => {
            GameProgressManager.Instance.progress = 1;
            expect(GameProgressManager.Instance.hasStageBossBeenDefeated(1)).toBe(false);
        });

        it('NetworkMatrix boss is defeated at progress 2 (requiredProgress=1)', () => {
            GameProgressManager.Instance.progress = 2;
            expect(GameProgressManager.Instance.hasStageBossBeenDefeated(1)).toBe(true);
        });

        it('SecurityCore boss is defeated at progress 4 (requiredProgress=3)', () => {
            GameProgressManager.Instance.progress = 4;
            expect(GameProgressManager.Instance.hasStageBossBeenDefeated(3)).toBe(true);
        });

        it('SecurityCore boss is not defeated at progress 3 (requiredProgress=3)', () => {
            GameProgressManager.Instance.progress = 3;
            expect(GameProgressManager.Instance.hasStageBossBeenDefeated(3)).toBe(false);
        });
    });

    describe('markBossDefeated', () => {
        it('advances progress from stage-unlocked to boss-defeated state', () => {
            const mgr = GameProgressManager.Instance;
            mgr.progress = 1; // NetworkMatrix unlocked (requiredProgress=1)
            mgr.markBossDefeated(1);
            expect(mgr.progress).toBe(2);
        });

        it('does not advance progress if not in expected state', () => {
            const mgr = GameProgressManager.Instance;
            mgr.progress = 0;
            mgr.markBossDefeated(1); // expected state would be requiredProgress=1
            expect(mgr.progress).toBe(0); // no change
        });

        it('advances progress for SecurityCore boss (requiredProgress=3)', () => {
            const mgr = GameProgressManager.Instance;
            mgr.progress = 3; // SecurityCore unlocked
            mgr.markBossDefeated(3);
            expect(mgr.progress).toBe(4);
        });
    });

    describe('getUnlockedStageCount', () => {
        it('returns 0 at progress 0', () => {
            expect(GameProgressManager.Instance.getUnlockedStageCount()).toBe(0);
        });

        it('returns 1 at progress 1', () => {
            GameProgressManager.Instance.progress = 1;
            expect(GameProgressManager.Instance.getUnlockedStageCount()).toBe(1);
        });

        it('returns 1 at progress 2', () => {
            GameProgressManager.Instance.progress = 2;
            expect(GameProgressManager.Instance.getUnlockedStageCount()).toBe(1);
        });

        it('returns 2 at progress 3', () => {
            GameProgressManager.Instance.progress = 3;
            expect(GameProgressManager.Instance.getUnlockedStageCount()).toBe(2);
        });

        it('returns 3 at progress 5', () => {
            GameProgressManager.Instance.progress = 5;
            expect(GameProgressManager.Instance.getUnlockedStageCount()).toBe(3);
        });
    });

    describe('reset', () => {
        it('resets progress to 0', () => {
            const mgr = GameProgressManager.Instance;
            mgr.progress = 5;
            mgr.reset();
            expect(mgr.progress).toBe(0);
        });
    });

    describe('load', () => {
        it('loads integer progress value', () => {
            const mgr = GameProgressManager.Instance;
            mgr.load(4);
            expect(mgr.progress).toBe(4);
        });

        it('floors decimal values on load', () => {
            const mgr = GameProgressManager.Instance;
            mgr.load(3.7);
            expect(mgr.progress).toBe(3);
        });

        it('clamps negative values to 0 on load', () => {
            const mgr = GameProgressManager.Instance;
            mgr.load(-1);
            expect(mgr.progress).toBe(0);
        });
    });
});

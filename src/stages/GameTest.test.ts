import { describe, it, expect } from 'vitest';
import { GameTest } from './GameTest';

// ─── Metadata ─────────────────────────────────────────────────────────────────

describe('GameTest', () => {

    describe('getMetadata', () => {
        it('returns correct id, name, description and requiredProgress', () => {
            const meta = GameTest.getMetadata();
            expect(meta.id).toBe('gameTest');
            expect(meta.name).toBe('Game Test');
            expect(meta.description).toBe('A test stage for game mechanics');
            expect(meta.requiredProgress).toBe(-1);
        });
    });

    describe('getRequiredAssets', () => {
        it('includes both enemy models needed by enemies', () => {
            // GameTest is abstract-safe to instantiate via prototype for metadata-only tests
            const stage = Object.create(GameTest.prototype) as GameTest;
            const assets = stage.getRequiredAssets();
            expect(assets).toContain('models/brute_enemy.glb');
            expect(assets).toContain('models/stalker_enemy.glb');
        });
    });
});

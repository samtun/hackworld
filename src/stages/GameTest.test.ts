import { describe, it, expect } from 'vitest';
import { GameTest } from './GameTest';
import {
    DUNGEON_PROP_ASSET_PATHS,
    DUNGEON_PROP_DEFINITIONS,
} from './DungeonPropCatalog';

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

        it('preloads every prop asset from the shared dungeon catalog', () => {
            const stage = Object.create(GameTest.prototype) as GameTest;
            const assets = stage.getRequiredAssets();
            expect(assets).toEqual(expect.arrayContaining(DUNGEON_PROP_ASSET_PATHS));
            expect(DUNGEON_PROP_DEFINITIONS).toHaveLength(17);
        });
    });
});

import { describe, it, expect } from 'vitest';
import { DungeonNavGrid } from './DungeonNavGrid';
import { RoomBasedDungeonGenerator } from '../stages/RoomBasedDungeonGenerator';
import type { DungeonLayout, RoomGenerationConfig } from '../stages/RoomBasedDungeonGenerator';

/** Minimal config with no obstacles to keep nav-grid tests predictable. */
const simpleConfig: RoomGenerationConfig = {
    combatRoomCount: { min: 1, max: 1 },
    combatRoomSize: { minWidth: 10, maxWidth: 10, minDepth: 10, maxDepth: 10 },
    finalRoomSize: { minWidth: 10, maxWidth: 10, minDepth: 10, maxDepth: 10 },
    enemyCount: { min: 0, max: 0, areaPerEnemy: 999, largeFraction: 0 },
    obstacleCount: { min: 0, max: 0 },
    hasBoss: false,
};

/** Config with obstacles to test obstacle blocking. */
const obstacleConfig: RoomGenerationConfig = {
    ...simpleConfig,
    obstacleCount: { min: 2, max: 2 },
};

function makeLayout(seed: number = 42, config: RoomGenerationConfig = simpleConfig): DungeonLayout {
    return new RoomBasedDungeonGenerator(seed).generate(config);
}

describe('DungeonNavGrid', () => {
    describe('construction', () => {
        it('can be constructed from a layout without errors', () => {
            const layout = makeLayout();
            expect(() => new DungeonNavGrid(layout)).not.toThrow();
        });
    });

    describe('findPath – basic', () => {
        it('returns a path from inside the safe room to a nearby point', () => {
            const layout = makeLayout();
            const nav = new DungeonNavGrid(layout);
            const sp = layout.spawnPosition;
            // Path within the safe room
            const path = nav.findPath(sp.x, sp.z, sp.x + 2, sp.z);
            expect(path.length).toBeGreaterThan(0);
        });

        it('returns a non-empty path from the safe room to the final room', () => {
            const layout = makeLayout();
            const nav = new DungeonNavGrid(layout);
            const start = layout.spawnPosition;
            const end = layout.teleporterPosition;
            const path = nav.findPath(start.x, start.z, end.x, end.z);
            expect(path.length).toBeGreaterThan(0);
        });

        it('returns an empty array for a completely unreachable goal', () => {
            const layout = makeLayout();
            const nav = new DungeonNavGrid(layout);
            // Goal is far outside the dungeon
            const path = nav.findPath(layout.spawnPosition.x, layout.spawnPosition.z, -1000, -1000);
            expect(path).toHaveLength(0);
        });

        it('returns a single-element path when start equals goal', () => {
            const layout = makeLayout();
            const nav = new DungeonNavGrid(layout);
            const sp = layout.spawnPosition;
            const path = nav.findPath(sp.x, sp.z, sp.x, sp.z);
            expect(path).toHaveLength(1);
            expect(path[0].x).toBe(sp.x);
            expect(path[0].z).toBe(sp.z);
        });
    });

    describe('findPath – corridor traversal', () => {
        it('paths cross through corridors between rooms', () => {
            const layout = makeLayout(1);
            const nav = new DungeonNavGrid(layout);

            // Start in room 0 (safe), goal in room 2 (final)
            const start = layout.rooms[0];
            const end = layout.rooms[layout.rooms.length - 1];

            const path = nav.findPath(start.centerX, 0, end.centerX, 0);
            expect(path.length).toBeGreaterThanOrEqual(2);

            // The path's last waypoint should be near the final room centre
            const last = path[path.length - 1];
            expect(Math.abs(last.x - end.centerX)).toBeLessThan(1);
        });
    });

    describe('findPath – obstacle avoidance', () => {
        it('paths around obstacles when present', () => {
            const layout = makeLayout(42, obstacleConfig);
            const nav = new DungeonNavGrid(layout);

            // Path from safe room to final room
            const start = layout.spawnPosition;
            const end = layout.teleporterPosition;
            const path = nav.findPath(start.x, start.z, end.x, end.z);
            expect(path.length).toBeGreaterThan(0);
        });
    });

    describe('findPath – determinism', () => {
        it('produces identical paths for the same layout', () => {
            const layout = makeLayout(99);
            const nav = new DungeonNavGrid(layout);
            const sp = layout.spawnPosition;
            const tp = layout.teleporterPosition;
            const path1 = nav.findPath(sp.x, sp.z, tp.x, tp.z);
            const path2 = nav.findPath(sp.x, sp.z, tp.x, tp.z);
            expect(path1).toEqual(path2);
        });
    });

    describe('findPath – multi-room layout', () => {
        it('finds a path through a larger dungeon with multiple combat rooms', () => {
            const bigConfig: RoomGenerationConfig = {
                ...simpleConfig,
                combatRoomCount: { min: 3, max: 3 },
                combatRoomSize: { minWidth: 15, maxWidth: 15, minDepth: 15, maxDepth: 15 },
                obstacleCount: { min: 1, max: 1 },
            };
            const layout = new RoomBasedDungeonGenerator(7).generate(bigConfig);
            const nav = new DungeonNavGrid(layout);
            const path = nav.findPath(
                layout.spawnPosition.x, layout.spawnPosition.z,
                layout.teleporterPosition.x, layout.teleporterPosition.z,
            );
            expect(path.length).toBeGreaterThan(0);
        });
    });
});

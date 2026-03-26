import { describe, it, expect } from 'vitest';
import {
    RoomBasedDungeonGenerator,
    WALL_HEIGHT,
    WALL_THICKNESS,
    CORRIDOR_WIDTH,
    CORRIDOR_LENGTH,
    SAFE_ROOM_SIZE,
} from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig } from './RoomBasedDungeonGenerator';

const baseConfig: RoomGenerationConfig = {
    combatRoomCount: { min: 2, max: 4 },
    combatRoomSize: { minWidth: 13, maxWidth: 26, minDepth: 13, maxDepth: 26 },
    finalRoomSize: { minWidth: 16, maxWidth: 33, minDepth: 16, maxDepth: 33 },
    enemyCount: { min: 2, max: 8, areaPerEnemy: 60, largeFraction: 0.3 },
    obstacleCount: { min: 1, max: 2 },
    hasBoss: true,
};

describe('RoomBasedDungeonGenerator', () => {
    describe('determinism', () => {
        it('produces identical layouts for the same seed', () => {
            const l1 = new RoomBasedDungeonGenerator(42).generate(baseConfig);
            const l2 = new RoomBasedDungeonGenerator(42).generate(baseConfig);
            expect(l1).toEqual(l2);
        });

        it('produces different layouts for different seeds', () => {
            const r1 = new RoomBasedDungeonGenerator(1).generate(baseConfig);
            const r2 = new RoomBasedDungeonGenerator(999).generate(baseConfig);
            expect(r1.rooms).not.toEqual(r2.rooms);
        });
    });

    describe('room count', () => {
        it('total rooms = 1 safe + combatRoomCount + 1 final', () => {
            const config: RoomGenerationConfig = { ...baseConfig, combatRoomCount: { min: 3, max: 3 } };
            const layout = new RoomBasedDungeonGenerator(1).generate(config);
            expect(layout.rooms).toHaveLength(5); // 1 + 3 + 1
        });

        it('combat room count respects the configured range', () => {
            const config: RoomGenerationConfig = { ...baseConfig, combatRoomCount: { min: 2, max: 5 } };
            // Run several times with different seeds
            for (let seed = 0; seed < 20; seed++) {
                const layout = new RoomBasedDungeonGenerator(seed).generate(config);
                const combatRooms = layout.rooms.filter(r => !r.isSafe && !r.isFinal).length;
                expect(combatRooms).toBeGreaterThanOrEqual(2);
                expect(combatRooms).toBeLessThanOrEqual(5);
            }
        });
    });

    describe('room properties', () => {
        it('first room is safe', () => {
            const layout = new RoomBasedDungeonGenerator(1).generate(baseConfig);
            expect(layout.rooms[0].isSafe).toBe(true);
            expect(layout.rooms[0].isFinal).toBe(false);
        });

        it('last room is final', () => {
            const layout = new RoomBasedDungeonGenerator(2).generate(baseConfig);
            const last = layout.rooms[layout.rooms.length - 1];
            expect(last.isFinal).toBe(true);
            expect(last.isSafe).toBe(false);
        });

        it('safe room has fixed size', () => {
            const layout = new RoomBasedDungeonGenerator(3).generate(baseConfig);
            expect(layout.rooms[0].width).toBe(SAFE_ROOM_SIZE);
            expect(layout.rooms[0].depth).toBe(SAFE_ROOM_SIZE);
        });

        it('combat rooms respect size bounds', () => {
            const layout = new RoomBasedDungeonGenerator(4).generate(baseConfig);
            const combatRooms = layout.rooms.filter(r => !r.isSafe && !r.isFinal);
            for (const room of combatRooms) {
                expect(room.width).toBeGreaterThanOrEqual(baseConfig.combatRoomSize.minWidth);
                expect(room.width).toBeLessThanOrEqual(baseConfig.combatRoomSize.maxWidth);
                expect(room.depth).toBeGreaterThanOrEqual(baseConfig.combatRoomSize.minDepth);
                expect(room.depth).toBeLessThanOrEqual(baseConfig.combatRoomSize.maxDepth);
            }
        });

        it('final room respects size bounds', () => {
            const layout = new RoomBasedDungeonGenerator(5).generate(baseConfig);
            const final = layout.rooms[layout.rooms.length - 1];
            expect(final.width).toBeGreaterThanOrEqual(baseConfig.finalRoomSize.minWidth);
            expect(final.width).toBeLessThanOrEqual(baseConfig.finalRoomSize.maxWidth);
        });

        it('only the first room has no west door', () => {
            const layout = new RoomBasedDungeonGenerator(6).generate(baseConfig);
            expect(layout.rooms[0].hasWestDoor).toBe(false);
            for (let i = 1; i < layout.rooms.length; i++) {
                expect(layout.rooms[i].hasWestDoor).toBe(true);
            }
        });

        it('only the last room has no east door', () => {
            const layout = new RoomBasedDungeonGenerator(7).generate(baseConfig);
            const last = layout.rooms.length - 1;
            expect(layout.rooms[last].hasEastDoor).toBe(false);
            for (let i = 0; i < last; i++) {
                expect(layout.rooms[i].hasEastDoor).toBe(true);
            }
        });
    });

    describe('room layout (X axis positioning)', () => {
        it('rooms are laid out without overlap', () => {
            const layout = new RoomBasedDungeonGenerator(8).generate(baseConfig);
            for (let i = 0; i < layout.rooms.length - 1; i++) {
                const a = layout.rooms[i];
                const b = layout.rooms[i + 1];
                const aRight = a.centerX + a.width / 2;
                const bLeft = b.centerX - b.width / 2;
                // There should be a corridor gap between rooms
                expect(bLeft - aRight).toBeCloseTo(CORRIDOR_LENGTH, 5);
            }
        });

        it('first room starts at x = 0 on its west edge', () => {
            const layout = new RoomBasedDungeonGenerator(9).generate(baseConfig);
            const first = layout.rooms[0];
            expect(first.centerX - first.width / 2).toBeCloseTo(0, 5);
        });
    });

    describe('enemy spawns', () => {
        it('safe room has no enemy spawns', () => {
            const layout = new RoomBasedDungeonGenerator(10).generate(baseConfig);
            const safe = layout.roomSpawns.find(rs => rs.roomId === 0)!;
            expect(safe.spawns).toHaveLength(0);
        });

        it('final room has only the boss when hasBoss is true', () => {
            const layout = new RoomBasedDungeonGenerator(11).generate(baseConfig);
            const finalId = layout.rooms[layout.rooms.length - 1].id;
            const finalSpawns = layout.roomSpawns.find(rs => rs.roomId === finalId)!;
            const bosses = finalSpawns.spawns.filter(s => s.type === 'boss');
            const others = finalSpawns.spawns.filter(s => s.type !== 'boss');
            expect(bosses).toHaveLength(1);
            expect(others).toHaveLength(0);
        });

        it('final room has no boss when hasBoss is false', () => {
            const config: RoomGenerationConfig = { ...baseConfig, hasBoss: false };
            const layout = new RoomBasedDungeonGenerator(12).generate(config);
            const finalId = layout.rooms[layout.rooms.length - 1].id;
            const finalSpawns = layout.roomSpawns.find(rs => rs.roomId === finalId)!;
            const bosses = finalSpawns.spawns.filter(s => s.type === 'boss');
            expect(bosses).toHaveLength(0);
        });

        it('combat room enemy count is within [min, max] bounds', () => {
            // Run across several seeds to cover different room sizes
            const config: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 2, max: 2 },
                hasBoss: false,
            };
            for (let seed = 0; seed < 20; seed++) {
                const layout = new RoomBasedDungeonGenerator(seed).generate(config);
                const combatRooms = layout.rooms.filter(r => !r.isSafe && !r.isFinal);
                for (const room of combatRooms) {
                    const spawns = layout.roomSpawns.find(rs => rs.roomId === room.id)!;
                    expect(spawns.spawns.length).toBeGreaterThanOrEqual(config.enemyCount.min);
                    expect(spawns.spawns.length).toBeLessThanOrEqual(config.enemyCount.max);
                }
            }
        });

        it('larger rooms produce more enemies than smaller rooms', () => {
            // Use fixed single-size configs so enemy count depends only on areaPerEnemy
            const smallCfg: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 1, max: 1 },
                combatRoomSize: { minWidth: 10, maxWidth: 10, minDepth: 10, maxDepth: 10 },
                enemyCount: { min: 1, max: 20, areaPerEnemy: 30, largeFraction: 0 },
                hasBoss: false,
            };
            const largeCfg: RoomGenerationConfig = {
                ...smallCfg,
                combatRoomSize: { minWidth: 50, maxWidth: 50, minDepth: 50, maxDepth: 50 },
            };
            const smallLayout = new RoomBasedDungeonGenerator(13).generate(smallCfg);
            const largeLayout = new RoomBasedDungeonGenerator(13).generate(largeCfg);

            // Combat room is always index 1 (safe=0, combat=1, final=2)
            const smallCount = smallLayout.roomSpawns[1].spawns.length;
            const largeCount = largeLayout.roomSpawns[1].spawns.length;
            expect(largeCount).toBeGreaterThan(smallCount);
        });

        it('all rooms have a corresponding roomSpawns entry', () => {
            const layout = new RoomBasedDungeonGenerator(14).generate(baseConfig);
            const roomIds = new Set(layout.rooms.map(r => r.id));
            const spawnIds = new Set(layout.roomSpawns.map(rs => rs.roomId));
            expect(spawnIds).toEqual(roomIds);
        });
    });

    describe('obstacles', () => {
        it('layout includes an obstacles array', () => {
            const layout = new RoomBasedDungeonGenerator(30).generate(baseConfig);
            expect(Array.isArray(layout.obstacles)).toBe(true);
        });

        it('safe room produces no obstacles', () => {
            const layout = new RoomBasedDungeonGenerator(31).generate(baseConfig);
            const safeRoom = layout.rooms[0];
            const safeObstacles = layout.obstacles.filter(
                o =>
                    o.x >= safeRoom.centerX - safeRoom.width / 2 &&
                    o.x <= safeRoom.centerX + safeRoom.width / 2,
            );
            expect(safeObstacles).toHaveLength(0);
        });

        it('obstacles have floor-anchored y (y = height / 2)', () => {
            const layout = new RoomBasedDungeonGenerator(32).generate(baseConfig);
            for (const obs of layout.obstacles) {
                expect(obs.y).toBeCloseTo(obs.height / 2, 10);
            }
        });

        it('obstacle count across all non-safe rooms is within configured range', () => {
            const config: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 2, max: 2 },
                obstacleCount: { min: 2, max: 2 },
                hasBoss: false,
            };
            const layout = new RoomBasedDungeonGenerator(33).generate(config);
            const nonSafeRooms = layout.rooms.filter(r => !r.isSafe);
            // Each non-safe room should have exactly 2 obstacles when min=max=2
            expect(layout.obstacles.length).toBe(nonSafeRooms.length * 2);
        });
    });

    describe('walls', () => {
        it('generates walls', () => {
            const layout = new RoomBasedDungeonGenerator(15).generate(baseConfig);
            expect(layout.walls.length).toBeGreaterThan(0);
        });

        it('all walls have WALL_HEIGHT height', () => {
            const layout = new RoomBasedDungeonGenerator(16).generate(baseConfig);
            for (const wall of layout.walls) {
                expect(wall.height).toBe(WALL_HEIGHT);
            }
        });

        it('all walls have WALL_THICKNESS for their thin dimension', () => {
            const layout = new RoomBasedDungeonGenerator(17).generate(baseConfig);
            for (const wall of layout.walls) {
                // Either width or depth must equal WALL_THICKNESS (the thin side)
                const isThin = wall.width === WALL_THICKNESS || wall.depth === WALL_THICKNESS;
                expect(isThin).toBe(true);
            }
        });

        it('wall centres are at y = WALL_HEIGHT / 2', () => {
            const layout = new RoomBasedDungeonGenerator(18).generate(baseConfig);
            for (const wall of layout.walls) {
                expect(wall.centerY).toBeCloseTo(WALL_HEIGHT / 2, 10);
            }
        });
    });

    describe('positions', () => {
        it('spawn position is inside the safe room', () => {
            const layout = new RoomBasedDungeonGenerator(19).generate(baseConfig);
            const safe = layout.rooms[0];
            expect(Math.abs(layout.spawnPosition.x - safe.centerX)).toBeLessThanOrEqual(safe.width / 2);
            expect(Math.abs(layout.spawnPosition.z - safe.centerZ)).toBeLessThanOrEqual(safe.depth / 2);
        });

        it('teleporter position is inside the final room', () => {
            const layout = new RoomBasedDungeonGenerator(20).generate(baseConfig);
            const final = layout.rooms[layout.rooms.length - 1];
            expect(Math.abs(layout.teleporterPosition.x - final.centerX)).toBeLessThanOrEqual(final.width / 2);
            expect(Math.abs(layout.teleporterPosition.z - final.centerZ)).toBeLessThanOrEqual(final.depth / 2);
        });

        it('teleporter is placed near the east wall of the final room', () => {
            const layout = new RoomBasedDungeonGenerator(20).generate(baseConfig);
            const final = layout.rooms[layout.rooms.length - 1];
            const eastEdge = final.centerX + final.width / 2;
            // Teleporter should be closer to the east edge than to the centre
            expect(eastEdge - layout.teleporterPosition.x).toBeLessThan(final.width / 2);
        });
    });

    describe('floor bounds', () => {
        it('minX equals 0', () => {
            const layout = new RoomBasedDungeonGenerator(21).generate(baseConfig);
            expect(layout.floorBounds.minX).toBe(0);
        });

        it('maxX equals right edge of last room', () => {
            const layout = new RoomBasedDungeonGenerator(22).generate(baseConfig);
            const last = layout.rooms[layout.rooms.length - 1];
            expect(layout.floorBounds.maxX).toBeCloseTo(last.centerX + last.width / 2, 5);
        });

        it('Z bounds include corridor width on each side', () => {
            const layout = new RoomBasedDungeonGenerator(23).generate(baseConfig);
            expect(layout.floorBounds.minZ).toBeLessThan(0);
            expect(layout.floorBounds.maxZ).toBeGreaterThan(0);
        });
    });
});

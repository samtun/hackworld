import { describe, it, expect } from 'vitest';
import {
    RoomBasedDungeonGenerator,
    WALL_HEIGHT,
    WALL_THICKNESS,
    COLLIDER_EXTRA_HEIGHT,
    SAFE_ROOM_SIZE,
    TELEPORTER_ROOM_SIZE,
    ROOM_ELEVATION_STEP,
    EMBED_DEPTH,
} from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig, DungeonLayout } from './RoomBasedDungeonGenerator';

const baseConfig: RoomGenerationConfig = {
    combatRoomCount: { min: 2, max: 4 },
    combatRoomSize: { minWidth: 13, maxWidth: 26, minDepth: 13, maxDepth: 26 },
    finalRoomSize: { minWidth: 16, maxWidth: 33, minDepth: 16, maxDepth: 33 },
    enemyCount: { min: 2, max: 8, areaPerEnemy: 60, largeFraction: 0.3 },
    obstacleCount: { min: 1, max: 2 },
    hasBoss: true,
};

function gen(seed: number, config: RoomGenerationConfig = baseConfig): DungeonLayout {
    return new RoomBasedDungeonGenerator(seed).generate(config);
}

describe('RoomBasedDungeonGenerator', () => {
    describe('determinism', () => {
        it('produces identical layouts for the same seed', () => {
            const l1 = gen(42);
            const l2 = gen(42);
            expect(l1).toEqual(l2);
        });

        it('produces different layouts for different seeds', () => {
            const r1 = gen(1);
            const r2 = gen(999);
            expect(r1.rooms).not.toEqual(r2.rooms);
        });
    });

    describe('room count and types', () => {
        it('always contains exactly one safe room', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const safeRooms = layout.rooms.filter(r => r.isSafe);
                expect(safeRooms).toHaveLength(1);
            }
        });

        it('always contains exactly one final room', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const finalRooms = layout.rooms.filter(r => r.isFinal);
                expect(finalRooms).toHaveLength(1);
            }
        });

        it('always contains exactly one teleporter room', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const tpRooms = layout.rooms.filter(r => r.isTeleporterRoom);
                expect(tpRooms).toHaveLength(1);
            }
        });

        it('combat room count (including final) respects the configured range', () => {
            const config: RoomGenerationConfig = { ...baseConfig, combatRoomCount: { min: 2, max: 5 } };
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed, config);
                // The final room counts as one of the combat rooms
                const combatPlusFinal = layout.rooms.filter(r => !r.isSafe && !r.isTeleporterRoom).length;
                expect(combatPlusFinal).toBeGreaterThanOrEqual(2);
                expect(combatPlusFinal).toBeLessThanOrEqual(5);
            }
        });

        it('total rooms = safe + (combatCount-1) combat + 1 final + 1 teleporter', () => {
            const config: RoomGenerationConfig = { ...baseConfig, combatRoomCount: { min: 3, max: 3 } };
            const layout = gen(1, config);
            // 3 combat rooms requested: 2 are regular combat, last one is final
            // Plus safe room and teleporter room = 5
            expect(layout.rooms).toHaveLength(5); // 1 safe + 2 combat + 1 final + 1 teleporter
        });
    });

    describe('room properties', () => {
        it('safe room has fixed size', () => {
            const layout = gen(3);
            const safe = layout.rooms.find(r => r.isSafe)!;
            expect(safe.width).toBe(SAFE_ROOM_SIZE);
            expect(safe.depth).toBe(SAFE_ROOM_SIZE);
        });

        it('combat rooms respect size bounds', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const combatRooms = layout.rooms.filter(r => !r.isSafe && !r.isFinal && !r.isTeleporterRoom);
                for (const room of combatRooms) {
                    expect(room.width).toBeGreaterThanOrEqual(baseConfig.combatRoomSize.minWidth);
                    expect(room.width).toBeLessThanOrEqual(baseConfig.combatRoomSize.maxWidth);
                    expect(room.depth).toBeGreaterThanOrEqual(baseConfig.combatRoomSize.minDepth);
                    expect(room.depth).toBeLessThanOrEqual(baseConfig.combatRoomSize.maxDepth);
                }
            }
        });

        it('final room respects size bounds', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const final = layout.rooms.find(r => r.isFinal)!;
                expect(final.width).toBeGreaterThanOrEqual(baseConfig.finalRoomSize.minWidth);
                expect(final.width).toBeLessThanOrEqual(baseConfig.finalRoomSize.maxWidth);
            }
        });

        it('teleporter room has fixed size', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const tpRoom = layout.rooms.find(r => r.isTeleporterRoom)!;
                expect(tpRoom.width).toBe(TELEPORTER_ROOM_SIZE);
                expect(tpRoom.depth).toBe(TELEPORTER_ROOM_SIZE);
            }
        });

        it('each room has at least one door', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                for (const room of layout.rooms) {
                    expect(room.doors.length).toBeGreaterThanOrEqual(1);
                }
            }
        });

        it('safe room is not final, not teleporter', () => {
            const layout = gen(1);
            const safe = layout.rooms.find(r => r.isSafe)!;
            expect(safe.isFinal).toBe(false);
            expect(safe.isTeleporterRoom).toBe(false);
        });
    });

    describe('corridors', () => {
        it('generates corridors between rooms', () => {
            const layout = gen(10);
            expect(layout.corridors.length).toBeGreaterThan(0);
        });

        it('corridor count equals rooms - 1 (tree structure)', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                expect(layout.corridors.length).toBe(layout.rooms.length - 1);
            }
        });

        it('corridors have positive dimensions', () => {
            const layout = gen(5);
            for (const cor of layout.corridors) {
                expect(cor.width).toBeGreaterThan(0);
                expect(cor.depth).toBeGreaterThan(0);
            }
        });
    });

    describe('branching layout', () => {
        it('rooms do not overlap', () => {
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed);
                for (let i = 0; i < layout.rooms.length; i++) {
                    for (let j = i + 1; j < layout.rooms.length; j++) {
                        const a = layout.rooms[i];
                        const b = layout.rooms[j];
                        // Check that AABBs don't overlap (with some tolerance)
                        const aMinX = a.centerX - a.width / 2;
                        const aMaxX = a.centerX + a.width / 2;
                        const aMinZ = a.centerZ - a.depth / 2;
                        const aMaxZ = a.centerZ + a.depth / 2;
                        const bMinX = b.centerX - b.width / 2;
                        const bMaxX = b.centerX + b.width / 2;
                        const bMinZ = b.centerZ - b.depth / 2;
                        const bMaxZ = b.centerZ + b.depth / 2;

                        const overlapX = aMinX < bMaxX && aMaxX > bMinX;
                        const overlapZ = aMinZ < bMaxZ && aMaxZ > bMinZ;
                        // At least one axis should not overlap
                        expect(overlapX && overlapZ).toBe(false);
                    }
                }
            }
        });

        it('not all rooms are on the same Z coordinate (branching)', () => {
            // With enough seeds, at least some layouts should branch off the X axis
            let foundBranching = false;
            for (let seed = 0; seed < 30; seed++) {
                const layout = gen(seed);
                const uniqueZ = new Set(layout.rooms.map(r => r.centerZ));
                if (uniqueZ.size > 1) {
                    foundBranching = true;
                    break;
                }
            }
            expect(foundBranching).toBe(true);
        });

        it('doors can be in any direction (not just east/west)', () => {
            let foundNorth = false, foundSouth = false;
            for (let seed = 0; seed < 30; seed++) {
                const layout = gen(seed);
                for (const room of layout.rooms) {
                    for (const door of room.doors) {
                        if (door.direction === 'north') foundNorth = true;
                        if (door.direction === 'south') foundSouth = true;
                    }
                }
            }
            expect(foundNorth || foundSouth).toBe(true);
        });
    });

    describe('enemy spawns', () => {
        it('safe room has no enemy spawns', () => {
            const layout = gen(10);
            const safe = layout.rooms.find(r => r.isSafe)!;
            const safeSpawns = layout.roomSpawns.find(rs => rs.roomId === safe.id)!;
            expect(safeSpawns.spawns).toHaveLength(0);
        });

        it('teleporter room has no enemy spawns', () => {
            const layout = gen(10);
            const tpRoom = layout.rooms.find(r => r.isTeleporterRoom)!;
            const tpSpawns = layout.roomSpawns.find(rs => rs.roomId === tpRoom.id)!;
            expect(tpSpawns.spawns).toHaveLength(0);
        });

        it('final room has only the boss when hasBoss is true', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const finalRoom = layout.rooms.find(r => r.isFinal)!;
                const finalSpawns = layout.roomSpawns.find(rs => rs.roomId === finalRoom.id)!;
                const bosses = finalSpawns.spawns.filter(s => s.type === 'boss');
                const others = finalSpawns.spawns.filter(s => s.type !== 'boss');
                expect(bosses).toHaveLength(1);
                expect(others).toHaveLength(0);
            }
        });

        it('final room has no boss when hasBoss is false', () => {
            const config: RoomGenerationConfig = { ...baseConfig, hasBoss: false };
            const layout = gen(12, config);
            const finalRoom = layout.rooms.find(r => r.isFinal)!;
            const finalSpawns = layout.roomSpawns.find(rs => rs.roomId === finalRoom.id)!;
            const bosses = finalSpawns.spawns.filter(s => s.type === 'boss');
            expect(bosses).toHaveLength(0);
        });

        it('combat room enemy count is within [min, max] bounds', () => {
            const config: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 2, max: 2 },
                hasBoss: false,
            };
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed, config);
                const combatRooms = layout.rooms.filter(r => !r.isSafe && !r.isFinal && !r.isTeleporterRoom);
                for (const room of combatRooms) {
                    const spawns = layout.roomSpawns.find(rs => rs.roomId === room.id)!;
                    expect(spawns.spawns.length).toBeGreaterThanOrEqual(config.enemyCount.min);
                    expect(spawns.spawns.length).toBeLessThanOrEqual(config.enemyCount.max);
                }
            }
        });

        it('larger rooms produce more enemies than smaller rooms', () => {
            const smallCfg: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 2, max: 2 },
                combatRoomSize: { minWidth: 10, maxWidth: 10, minDepth: 10, maxDepth: 10 },
                finalRoomSize: { minWidth: 10, maxWidth: 10, minDepth: 10, maxDepth: 10 },
                enemyCount: { min: 1, max: 20, areaPerEnemy: 30, largeFraction: 0 },
                hasBoss: false,
            };
            const largeCfg: RoomGenerationConfig = {
                ...smallCfg,
                combatRoomSize: { minWidth: 50, maxWidth: 50, minDepth: 50, maxDepth: 50 },
                finalRoomSize: { minWidth: 50, maxWidth: 50, minDepth: 50, maxDepth: 50 },
            };
            const smallLayout = gen(13, smallCfg);
            const largeLayout = gen(13, largeCfg);

            // Find the first non-safe, non-teleporter room in each layout
            const smallCombat = smallLayout.rooms.find(r => !r.isSafe && !r.isTeleporterRoom)!;
            const largeCombat = largeLayout.rooms.find(r => !r.isSafe && !r.isTeleporterRoom)!;

            const smallCount = smallLayout.roomSpawns.find(rs => rs.roomId === smallCombat.id)!.spawns.length;
            const largeCount = largeLayout.roomSpawns.find(rs => rs.roomId === largeCombat.id)!.spawns.length;
            expect(largeCount).toBeGreaterThan(smallCount);
        });

        it('all rooms have a corresponding roomSpawns entry', () => {
            const layout = gen(14);
            const roomIds = new Set(layout.rooms.map(r => r.id));
            const spawnIds = new Set(layout.roomSpawns.map(rs => rs.roomId));
            expect(spawnIds).toEqual(roomIds);
        });
    });

    describe('obstacles', () => {
        it('layout includes an obstacles array', () => {
            const layout = gen(30);
            expect(Array.isArray(layout.obstacles)).toBe(true);
        });

        it('safe room produces no obstacles', () => {
            const layout = gen(31);
            const safeRoom = layout.rooms.find(r => r.isSafe)!;
            const safeObstacles = layout.obstacles.filter(
                o =>
                    o.x >= safeRoom.centerX - safeRoom.width / 2 &&
                    o.x <= safeRoom.centerX + safeRoom.width / 2 &&
                    o.z >= safeRoom.centerZ - safeRoom.depth / 2 &&
                    o.z <= safeRoom.centerZ + safeRoom.depth / 2,
            );
            expect(safeObstacles).toHaveLength(0);
        });

        it('teleporter room produces no obstacles', () => {
            const layout = gen(31);
            const tpRoom = layout.rooms.find(r => r.isTeleporterRoom)!;
            const tpObstacles = layout.obstacles.filter(
                o =>
                    o.x >= tpRoom.centerX - tpRoom.width / 2 &&
                    o.x <= tpRoom.centerX + tpRoom.width / 2 &&
                    o.z >= tpRoom.centerZ - tpRoom.depth / 2 &&
                    o.z <= tpRoom.centerZ + tpRoom.depth / 2,
            );
            expect(tpObstacles).toHaveLength(0);
        });

        it('obstacles have floor-anchored y raised by EMBED_DEPTH to prevent z-fighting', () => {
            // obs.y = room.elevation + height / 2 + EMBED_DEPTH so the obstacle's
            // bottom face sits 1 mm above the floor plane, eliminating z-fighting.
            const layout = gen(32);
            for (const obs of layout.obstacles) {
                const baseElevation = obs.y - obs.height / 2;
                expect(baseElevation).toBeGreaterThanOrEqual(0);
                // baseElevation = room.elevation + EMBED_DEPTH; elevation is a multiple
                // of ROOM_ELEVATION_STEP, so (baseElevation - EMBED_DEPTH) % step ≈ 0.
                expect((baseElevation - EMBED_DEPTH) % ROOM_ELEVATION_STEP).toBeCloseTo(0, 5);
            }
        });

        it('obstacle positions and sizes are integers (grid-snapped)', () => {
            const layout = gen(33);
            for (const obs of layout.obstacles) {
                expect(Number.isInteger(obs.x)).toBe(true);
                expect(Number.isInteger(obs.z)).toBe(true);
                expect(Number.isInteger(obs.width)).toBe(true);
                expect(Number.isInteger(obs.depth)).toBe(true);
            }
        });

        it('obstacles have WALL_HEIGHT height', () => {
            const layout = gen(34);
            for (const obs of layout.obstacles) {
                expect(obs.height).toBe(WALL_HEIGHT);
            }
        });
    });

    describe('walls', () => {
        it('generates walls', () => {
            const layout = gen(15);
            expect(layout.walls.length).toBeGreaterThan(0);
        });

        it('all walls have visual height ≤ WALL_HEIGHT', () => {
            const layout = gen(16);
            for (const wall of layout.walls) {
                expect(wall.height).toBeLessThanOrEqual(WALL_HEIGHT);
                expect(wall.height).toBeGreaterThan(0);
            }
        });

        it('all walls have WALL_THICKNESS for their thin dimension', () => {
            const layout = gen(17);
            for (const wall of layout.walls) {
                const isThin = wall.width === WALL_THICKNESS || wall.depth === WALL_THICKNESS;
                expect(isThin).toBe(true);
            }
        });

        it('wall centres are at y >= (WALL_HEIGHT - 0.05) / 2', () => {
            const layout = gen(18);
            for (const wall of layout.walls) {
                // Sloped corridor walls are trimmed 0.05 m below WALL_HEIGHT,
                // so their centre is at (WALL_HEIGHT - 0.05) / 2 at minimum.
                expect(wall.centerY).toBeGreaterThanOrEqual((WALL_HEIGHT - 0.05) / 2 - 0.01);
            }
        });

        it('all walls carry colliderHeight = WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT', () => {
            // Every wall (room walls and corridor walls) must have an extended physics
            // collider so the player cannot jump on top of any wall.
            const layout = gen(16);
            expect(layout.walls.length).toBeGreaterThan(0);
            for (const wall of layout.walls) {
                expect(wall.colliderHeight).toBe(WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT);
            }
        });

        it('corridor side walls embed at most EMBED_DEPTH into room walls (no large z-fighting overlap)', () => {
            // Corridor side walls are trimmed by WALL_THICKNESS then extended by
            // 2 × EMBED_DEPTH so each end embeds exactly EMBED_DEPTH into the
            // adjacent room wall.  The overlap must not exceed EMBED_DEPTH per end
            // to keep end faces hidden without producing large geometry clipping.
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);

                function wallAABB(w: { centerX: number; width: number; centerZ: number; depth: number }) {
                    return {
                        x1: w.centerX - w.width / 2,
                        x2: w.centerX + w.width / 2,
                        z1: w.centerZ - w.depth / 2,
                        z2: w.centerZ + w.depth / 2,
                    };
                }

                function overlapLength(a1: number, a2: number, b1: number, b2: number): number {
                    return Math.max(0, Math.min(a2, b2) - Math.max(a1, b1));
                }

                const corridorWalls = layout.walls.filter(w => w.height < WALL_HEIGHT);
                const roomWalls = layout.walls.filter(w => w.height === WALL_HEIGHT);

                for (const cw of corridorWalls) {
                    const cwBox = wallAABB(cw);
                    for (const rw of roomWalls) {
                        const rwBox = wallAABB(rw);
                        const xOver = overlapLength(cwBox.x1, cwBox.x2, rwBox.x1, rwBox.x2);
                        const zOver = overlapLength(cwBox.z1, cwBox.z2, rwBox.z1, rwBox.z2);
                        if (xOver > 0 && zOver > 0) {
                            // Any overlap must be the intentional embed, not a large intersection
                            const minOverlap = Math.min(xOver, zOver);
                            expect(minOverlap).toBeLessThanOrEqual(EMBED_DEPTH + 1e-9);
                        }
                    }
                }
            }
        });

        it('corridor walls have visual height = WALL_HEIGHT - 0.05 to prevent z-fighting', () => {
            // Corridor walls are trimmed 0.05 m below WALL_HEIGHT so their top faces
            // never coincide with room wall tops at junction corners.
            const layout = gen(16);
            const corridorCenterXSet = new Set(
                layout.corridors.flatMap(c =>
                    c.width > c.depth
                        ? [c.centerZ + c.depth / 2, c.centerZ - c.depth / 2]
                        : [c.centerX + c.width / 2, c.centerX - c.width / 2],
                ),
            );
            // At least some walls should be corridor walls with trimmed height
            const trimmedWalls = layout.walls.filter(w => w.height < WALL_HEIGHT);
            expect(trimmedWalls.length).toBeGreaterThan(0);
            for (const wall of trimmedWalls) {
                expect(wall.height).toBeCloseTo(WALL_HEIGHT - 0.05, 5);
                expect(corridorCenterXSet.size).toBeGreaterThan(0);
            }
        });
    });

    describe('positions', () => {
        it('spawn position is inside the safe room', () => {
            const layout = gen(19);
            const safe = layout.rooms.find(r => r.isSafe)!;
            expect(Math.abs(layout.spawnPosition.x - safe.centerX)).toBeLessThanOrEqual(safe.width / 2);
            expect(Math.abs(layout.spawnPosition.z - safe.centerZ)).toBeLessThanOrEqual(safe.depth / 2);
        });

        it('teleporter position is at the centre of the teleporter room', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const tpRoom = layout.rooms.find(r => r.isTeleporterRoom)!;
                expect(layout.teleporterPosition.x).toBe(tpRoom.centerX);
                expect(layout.teleporterPosition.z).toBe(tpRoom.centerZ);
            }
        });
    });

    describe('floor bounds', () => {
        it('floor bounds encompass all rooms', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                for (const room of layout.rooms) {
                    expect(room.centerX - room.width / 2).toBeGreaterThanOrEqual(layout.floorBounds.minX);
                    expect(room.centerX + room.width / 2).toBeLessThanOrEqual(layout.floorBounds.maxX);
                    expect(room.centerZ - room.depth / 2).toBeGreaterThanOrEqual(layout.floorBounds.minZ);
                    expect(room.centerZ + room.depth / 2).toBeLessThanOrEqual(layout.floorBounds.maxZ);
                }
            }
        });

        it('floor bounds encompass all corridors', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                for (const cor of layout.corridors) {
                    expect(cor.centerX - cor.width / 2).toBeGreaterThanOrEqual(layout.floorBounds.minX);
                    expect(cor.centerX + cor.width / 2).toBeLessThanOrEqual(layout.floorBounds.maxX);
                    expect(cor.centerZ - cor.depth / 2).toBeGreaterThanOrEqual(layout.floorBounds.minZ);
                    expect(cor.centerZ + cor.depth / 2).toBeLessThanOrEqual(layout.floorBounds.maxZ);
                }
            }
        });
    });

    describe('chest and barrel spawns', () => {
        const configWithChestsAndBarrels: RoomGenerationConfig = {
            ...baseConfig,
            lootRoomCount: { min: 1, max: 1 },
            chestsPerLootRoom: 3,
            chestQualityFactor: 1.5,
            chestInTeleporterRoom: true,
            barrelCount: { min: 1, max: 2 },
        };

        it('returns empty arrays when config omits chest/barrel settings', () => {
            const layout = gen(42);
            expect(layout.chestSpawns).toEqual([]);
            expect(layout.barrelSpawns).toEqual([]);
        });

        it('generates chest spawns in loot rooms and teleporter room', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            // At least 1 from loot room + 1 from teleporter room
            expect(layout.chestSpawns.length).toBeGreaterThanOrEqual(1);
            // Max 3 from loot room + 1 from teleporter room
            expect(layout.chestSpawns.length).toBeLessThanOrEqual(4);
        });

        it('chest spawns carry qualityFactor from config', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            for (const cs of layout.chestSpawns) {
                expect(cs.itemQualityFactor).toBe(1.5);
            }
        });

        it('generates barrel spawns in combat and loot rooms', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            expect(layout.barrelSpawns.length).toBeGreaterThan(0);
        });

        it('generates loot rooms when configured', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            const lootRooms = layout.rooms.filter(r => r.isLootRoom);
            expect(lootRooms.length).toBe(1);
        });

        it('chest/barrel spawns are inside room boundaries', () => {
            for (const seed of [10, 42, 100, 200]) {
                const layout = gen(seed, configWithChestsAndBarrels);
                const allRoomBounds = layout.rooms.map(r => ({
                    minX: r.centerX - r.width / 2,
                    maxX: r.centerX + r.width / 2,
                    minZ: r.centerZ - r.depth / 2,
                    maxZ: r.centerZ + r.depth / 2,
                }));

                for (const cs of layout.chestSpawns) {
                    const inSomeRoom = allRoomBounds.some(b =>
                        cs.x >= b.minX && cs.x <= b.maxX && cs.z >= b.minZ && cs.z <= b.maxZ
                    );
                    expect(inSomeRoom).toBe(true);
                }

                for (const bs of layout.barrelSpawns) {
                    const inSomeRoom = allRoomBounds.some(b =>
                        bs.x >= b.minX && bs.x <= b.maxX && bs.z >= b.minZ && bs.z <= b.maxZ
                    );
                    expect(inSomeRoom).toBe(true);
                }
            }
        });

        it('chest/barrel spawns are deterministic for the same seed', () => {
            const l1 = gen(42, configWithChestsAndBarrels);
            const l2 = gen(42, configWithChestsAndBarrels);
            expect(l1.chestSpawns).toEqual(l2.chestSpawns);
            expect(l1.barrelSpawns).toEqual(l2.barrelSpawns);
        });
    });

    describe('room elevation', () => {
        it('safe room always has elevation 0', () => {
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed);
                const safe = layout.rooms.find(r => r.isSafe)!;
                expect(safe.elevation).toBe(0);
            }
        });

        it('all rooms have elevation >= 0', () => {
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed);
                for (const room of layout.rooms) {
                    expect(room.elevation).toBeGreaterThanOrEqual(0);
                }
            }
        });

        it('room elevation is always a multiple of ROOM_ELEVATION_STEP', () => {
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed);
                for (const room of layout.rooms) {
                    expect(room.elevation % ROOM_ELEVATION_STEP).toBe(0);
                }
            }
        });

        it('some layouts have rooms at different elevations', () => {
            let foundDifferent = false;
            for (let seed = 0; seed < 50; seed++) {
                const layout = gen(seed);
                const elevations = new Set(layout.rooms.map(r => r.elevation));
                if (elevations.size > 1) {
                    foundDifferent = true;
                    break;
                }
            }
            expect(foundDifferent).toBe(true);
        });

        it('corridor elevations match connected room elevations', () => {
            for (let seed = 0; seed < 20; seed++) {
                const layout = gen(seed);
                const roomMap = new Map(layout.rooms.map(r => [r.id, r]));
                for (const cor of layout.corridors) {
                    const fromRoom = roomMap.get(cor.fromRoomId)!;
                    const toRoom = roomMap.get(cor.toRoomId)!;
                    const elevs = new Set([cor.elevationStart, cor.elevationEnd]);
                    expect(elevs).toContain(fromRoom.elevation);
                    expect(elevs).toContain(toRoom.elevation);
                }
            }
        });

        it('spawnElevation matches the safe room elevation', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const safe = layout.rooms.find(r => r.isSafe)!;
                expect(layout.spawnElevation).toBe(safe.elevation);
            }
        });

        it('teleporterElevation matches the teleporter room elevation', () => {
            for (let seed = 0; seed < 10; seed++) {
                const layout = gen(seed);
                const tpRoom = layout.rooms.find(r => r.isTeleporterRoom)!;
                expect(layout.teleporterElevation).toBe(tpRoom.elevation);
            }
        });

        it('all walls carry colliderHeight to prevent jumping on top', () => {
            // Every wall (room walls and corridor walls) must have an extended physics
            // collider height so the player cannot jump on top of any wall.
            for (let seed = 0; seed < 3; seed++) {
                const layout = gen(seed);
                for (const wall of layout.walls) {
                    expect(wall.colliderHeight).toBe(WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT);
                    expect(wall.height).toBeLessThanOrEqual(WALL_HEIGHT);
                }
            }
        });
    });
});

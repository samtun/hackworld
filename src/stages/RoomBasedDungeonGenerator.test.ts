import { describe, it, expect } from 'vitest';
import {
    RoomBasedDungeonGenerator,
    CORRIDOR_WIDTH,
    WALL_HEIGHT,
    WALL_THICKNESS,
    COLLIDER_EXTRA_HEIGHT,
    SAFE_ROOM_SIZE,
    TELEPORTER_ROOM_SIZE,
    ROOM_ELEVATION_STEP,
    MAP_ITEM_SPAWN_Y_OFFSET,
    EnemySpawnType,
} from './RoomBasedDungeonGenerator';
import type { RoomGenerationConfig, DungeonLayout } from './RoomBasedDungeonGenerator';
import {
    DUNGEON_PROP_DEFINITIONS,
    getDungeonPropDefinitions,
} from './DungeonPropCatalog';

const baseConfig: RoomGenerationConfig = {
    combatRoomCount: { min: 2, max: 4 },
    combatRoomSize: { minWidth: 13, maxWidth: 26, minDepth: 13, maxDepth: 26 },
    finalRoomSize: { minWidth: 16, maxWidth: 33, minDepth: 16, maxDepth: 33 },
    enemyCount: { min: 2, max: 8, areaPerEnemy: 60, eliteFraction: 0.3 },
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

        it('supports multiple final boss rooms when bossRoomCount is configured', () => {
            const config: RoomGenerationConfig = { ...baseConfig, combatRoomCount: { min: 6, max: 6 }, bossRoomCount: 2 };
            const layout = gen(7, config);
            const finalRooms = layout.rooms.filter(r => r.isFinal);
            expect(finalRooms).toHaveLength(2);
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
                const bosses = finalSpawns.spawns.filter(s => s.type === EnemySpawnType.Boss);
                const others = finalSpawns.spawns.filter(s => s.type !== EnemySpawnType.Boss);
                expect(bosses).toHaveLength(1);
                expect(others).toHaveLength(0);
            }
        });

        it('spawns one boss in each configured final room', () => {
            const config: RoomGenerationConfig = {
                ...baseConfig,
                combatRoomCount: { min: 7, max: 7 },
                bossRoomCount: 2,
                hasBoss: true,
            };
            const layout = gen(19, config);
            const finalRooms = layout.rooms.filter(r => r.isFinal);
            expect(finalRooms).toHaveLength(2);
            for (const room of finalRooms) {
                const spawns = layout.roomSpawns.find(rs => rs.roomId === room.id)!;
                expect(spawns.spawns.filter(s => s.type === EnemySpawnType.Boss)).toHaveLength(1);
                expect(spawns.spawns.filter(s => s.type !== EnemySpawnType.Boss)).toHaveLength(0);
            }
        });

        it('final room has no boss when hasBoss is false', () => {
            const config: RoomGenerationConfig = { ...baseConfig, hasBoss: false };
            const layout = gen(12, config);
            const finalRoom = layout.rooms.find(r => r.isFinal)!;
            const finalSpawns = layout.roomSpawns.find(rs => rs.roomId === finalRoom.id)!;
            const bosses = finalSpawns.spawns.filter(s => s.type === EnemySpawnType.Boss);
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
                enemyCount: { min: 1, max: 20, areaPerEnemy: 30, eliteFraction: 0 },
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

        it('obstacles have floor-anchored y (y = elevation + height / 2)', () => {
            const layout = gen(32);
            for (const obs of layout.obstacles) {
                const baseElevation = obs.y - obs.height / 2;
                expect(baseElevation).toBeGreaterThanOrEqual(0);
                expect(baseElevation % ROOM_ELEVATION_STEP).toBeCloseTo(0, 5);
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

        it('obstacles use prop footprints from the dungeon prop catalog', () => {
            const layout = gen(34);
            for (const obs of layout.obstacles) {
                expect(DUNGEON_PROP_DEFINITIONS.some(def =>
                    def.modelName === obs.propModelName
                    && def.width === obs.width
                    && def.height === obs.height
                    && def.depth === obs.depth,
                )).toBe(true);
            }
        });

        it('obstacles only use the configured stage prop subset', () => {
            const obstacleProps = getDungeonPropDefinitions(['router', 'serverrack']);
            const layout = gen(340, {
                ...baseConfig,
                combatRoomCount: { min: 4, max: 4 },
                obstacleCount: { min: 2, max: 2 },
                obstacleProps,
                hasBoss: false,
            });

            expect(layout.obstacles.length).toBeGreaterThan(0);
            for (const obs of layout.obstacles) {
                expect(obstacleProps.some(def =>
                    def.modelName === obs.propModelName
                    && def.width === obs.width
                    && def.height === obs.height
                    && def.depth === obs.depth,
                )).toBe(true);
            }
        });

        it('obstacles keep corridor entrances clear by their footprint', () => {
            const layout = gen(35);
            for (const obs of layout.obstacles) {
                const room = layout.rooms.find(r =>
                    obs.x >= r.centerX - r.width / 2
                    && obs.x <= r.centerX + r.width / 2
                    && obs.z >= r.centerZ - r.depth / 2
                    && obs.z <= r.centerZ + r.depth / 2,
                );
                expect(room).toBeDefined();
                for (const door of room!.doors) {
                    const doorPos = door.direction === 'north'
                        ? { x: room!.centerX + door.offset, z: room!.centerZ + room!.depth / 2 }
                        : door.direction === 'south'
                            ? { x: room!.centerX + door.offset, z: room!.centerZ - room!.depth / 2 }
                            : door.direction === 'east'
                                ? { x: room!.centerX + room!.width / 2, z: room!.centerZ + door.offset }
                                : { x: room!.centerX - room!.width / 2, z: room!.centerZ + door.offset };
                    const dx = obs.x - doorPos.x;
                    const dz = obs.z - doorPos.z;
                    const minDistance = CORRIDOR_WIDTH + 1 + Math.max(obs.width, obs.depth) / 2;
                    expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThanOrEqual(minDistance);
                }
            }
        });
    });

    describe('enemy spawns', () => {
        it('enemies do not spawn on top of obstacle props', () => {
            const layout = gen(36);
            for (const roomSpawns of layout.roomSpawns) {
                const room = layout.rooms.find(r => r.id === roomSpawns.roomId)!;
                const roomObstacles = layout.obstacles.filter(obs =>
                    obs.x >= room.centerX - room.width / 2
                    && obs.x <= room.centerX + room.width / 2
                    && obs.z >= room.centerZ - room.depth / 2
                    && obs.z <= room.centerZ + room.depth / 2,
                );

                for (const spawn of roomSpawns.spawns) {
                    for (const obs of roomObstacles) {
                        const dx = spawn.x - obs.x;
                        const dz = spawn.z - obs.z;
                        expect(Math.sqrt(dx * dx + dz * dz)).toBeGreaterThanOrEqual(Math.max(obs.width, obs.depth));
                    }
                }
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
            expect(layout.mapItemSpawn).toBeNull();
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

        it('generates exactly one minimap item spawn in a loot room', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            expect(layout.mapItemSpawn).not.toBeNull();
            const lootRoomIds = new Set(layout.rooms.filter(r => r.isLootRoom).map(r => r.id));
            expect(lootRoomIds.has(layout.mapItemSpawn!.roomId)).toBe(true);
        });

        it('keeps chest and barrel spawns away from the minimap item spawn', () => {
            const layout = gen(42, configWithChestsAndBarrels);
            expect(layout.mapItemSpawn).not.toBeNull();
            const mapSpawn = layout.mapItemSpawn!;

            for (const chest of layout.chestSpawns) {
                if (Math.abs(chest.y - mapSpawn.y) > 0.1) continue;
                const dx = chest.x - mapSpawn.x;
                const dz = chest.z - mapSpawn.z;
                expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(2);
            }

            for (const barrel of layout.barrelSpawns) {
                const roomElevation = mapSpawn.y - MAP_ITEM_SPAWN_Y_OFFSET;
                if (Math.abs(barrel.y - roomElevation) > 0.1) continue;
                const dx = barrel.x - mapSpawn.x;
                const dz = barrel.z - mapSpawn.z;
                expect(Math.hypot(dx, dz)).toBeGreaterThanOrEqual(2);
            }
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
            expect(l1.mapItemSpawn).toEqual(l2.mapItemSpawn);
        });
    });

    describe('minimap layout', () => {
        it('contains one rectangle for each room and corridor', () => {
            const layout = gen(42, {
                ...baseConfig,
                lootRoomCount: { min: 1, max: 1 },
            });
            expect(layout.minimapLayout.rects.length).toBe(layout.rooms.length + layout.corridors.length);
        });

        it('uses floor bounds as minimap bounds', () => {
            const layout = gen(42);
            expect(layout.minimapLayout.bounds).toEqual(layout.floorBounds);
        });

        it('room rects carry the matching roomId', () => {
            const layout = gen(42);
            const roomRects = layout.minimapLayout.rects.filter(r => r.kind === 'room');
            const roomIds = new Set(layout.rooms.map(r => r.id));
            for (const rect of roomRects) {
                expect(rect.roomId).toBeDefined();
                expect(roomIds.has(rect.roomId!)).toBe(true);
            }
        });

        it('corridor rects have no roomId', () => {
            const layout = gen(42);
            const corridorRects = layout.minimapLayout.rects.filter(r => r.kind === 'corridor');
            for (const rect of corridorRects) {
                expect(rect.roomId).toBeUndefined();
            }
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

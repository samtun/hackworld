import type { StageMinimapLayout } from './StageMinimapLayout';

/**
 * Wall height and thickness constants (in metres).
 * 2 m height prevents the player from jumping over walls.
 * 1 m thickness gives walls a solid physical presence.
 */
export const WALL_HEIGHT = 2;
export const WALL_THICKNESS = 1;

/**
 * Extra height (in metres) added to corridor wall physics colliders above the
 * visual mesh.  Prevents the player from jumping on top of corridor walls.
 */
export const COLLIDER_EXTRA_HEIGHT = 10;

/** Width of the corridor / door opening that connects adjacent rooms (in metres). */
export const CORRIDOR_WIDTH = 3;

/** Length of the corridor connecting two rooms (in metres). */
export const CORRIDOR_LENGTH = 5;

/** Height step (in metres) by which rooms may rise or drop relative to their parent. */
export const ROOM_ELEVATION_STEP = 2;

/** Fixed size (width = depth) for the safe starting room (in metres). */
export const SAFE_ROOM_SIZE = 10;

/** Size of the dedicated teleporter room (in metres). */
export const TELEPORTER_ROOM_SIZE = 16;

/** Size of the dedicated loot room (in metres). */
export const LOOT_ROOM_SIZE = 12;

/** Minimum distance in metres between an enemy/obstacle spawn point and the nearest wall. */
const SPAWN_PADDING = 2;

/** Maximum random-position attempts when placing a chest or barrel. */
const MAX_SPAWN_ATTEMPTS = 30;
/** Y offset for the minimap unlock item above room floor elevation. */
export const MAP_ITEM_SPAWN_Y_OFFSET = 0.45;

// ---------------------------------------------------------------------------
// Data types – all are plain serialisable data; no Three.js / CANNON deps.
// ---------------------------------------------------------------------------

export interface Vec2 {
    x: number;
    z: number;
}

/** Cardinal direction for corridor connections. */
export type Direction = 'north' | 'south' | 'east' | 'west';

/** A single door opening in a room wall. */
export interface DoorOpening {
    /** Which wall this door is on. */
    direction: Direction;
    /**
     * Offset along the wall from the room centre.
     * For north/south walls this is an X offset.
     * For east/west walls this is a Z offset.
     */
    offset: number;
}

/** A single room in the generated dungeon. */
export interface DungeonRoom {
    /** Zero-based index, also used as a key in enemy maps. */
    id: number;
    centerX: number;
    centerZ: number;
    /** Room extent along the X axis. */
    width: number;
    /** Room extent along the Z axis. */
    depth: number;
    /** True for the starting room – no enemies, player spawns here. */
    isSafe: boolean;
    /** True for combat rooms that contain bosses. */
    isFinal: boolean;
    /** True for the dedicated teleporter room. */
    isTeleporterRoom: boolean;
    /** True for loot rooms that contain chests and barrels but no enemies. */
    isLootRoom: boolean;
    /** Floor elevation of this room in metres (always >= 0). */
    elevation: number;
    /** All door openings for this room. */
    doors: DoorOpening[];
    /**
     * @deprecated Use {@link doors} instead. Kept for backward compatibility.
     * True if any door exists on the west wall.
     */
    hasWestDoor: boolean;
    /**
     * @deprecated Use {@link doors} instead. Kept for backward compatibility.
     * True if any door exists on the east wall.
     */
    hasEastDoor: boolean;
}

/** A corridor connecting two rooms. */
export interface Corridor {
    /** Start room id. */
    fromRoomId: number;
    /** End room id. */
    toRoomId: number;
    /** World-space centre X of the corridor. */
    centerX: number;
    /** World-space centre Z of the corridor. */
    centerZ: number;
    /** Corridor extent along X. */
    width: number;
    /** Corridor extent along Z. */
    depth: number;
    /**
     * Floor elevation at the corridor's lower-coordinate end
     * (minX for horizontal, minZ for vertical corridors).
     */
    elevationStart: number;
    /**
     * Floor elevation at the corridor's higher-coordinate end
     * (maxX for horizontal, maxZ for vertical corridors).
     */
    elevationEnd: number;
}

/** A single axis-aligned wall box described by its centre and extents. */
export interface WallSegment {
    centerX: number;
    centerY: number;
    centerZ: number;
    /** Extent along the X axis. */
    width: number;
    /** Extent along the Y axis (visual mesh height). */
    height: number;
    /** Extent along the Z axis. */
    depth: number;
    /**
     * When set, the physics collider uses this height instead of {@link height}.
     * The collider bottom is kept flush with the visual mesh bottom so the
     * extra height extends upward, preventing the player from jumping on top.
     */
    colliderHeight?: number;
}

/** A single enemy spawn point together with the enemy archetype. */
export interface EnemySpawnPoint {
    x: number;
    y: number;
    z: number;
    type: EnemySpawnType;
}

export enum EnemySpawnType {
    Regular = 'regular',
    Elite = 'elite',
    Boss = 'boss',
}

/** All enemy spawn points that belong to one room. */
export interface RoomSpawns {
    roomId: number;
    spawns: EnemySpawnPoint[];
}

/** A box obstacle placed on the floor inside a room. */
export interface RoomObstacle {
    x: number;
    /** Always set to height / 2 so the bottom of the box sits on the floor. */
    y: number;
    z: number;
    width: number;
    height: number;
    depth: number;
}

/** A loot chest spawn point. */
export interface ChestSpawn {
    x: number;
    y: number;
    z: number;
    /** Bonus factor for item tier randomization. */
    itemQualityFactor: number;
}

/** A breakable barrel spawn point. */
export interface BarrelSpawn {
    x: number;
    y: number;
    z: number;
}

/** A single minimap unlock item spawn point in a loot room. */
export interface MapItemSpawn {
    x: number;
    y: number;
    z: number;
    roomId: number;
}

/** An electric trap spawn point with size and behaviour parameters. */
export interface TrapSpawn {
    x: number;
    /** Floor elevation at the trap position. */
    y: number;
    z: number;
    /** Trap extent along the X axis (metres). */
    width: number;
    /** Trap extent along the Z axis (metres). */
    length: number;
    /** Damage dealt per activation tick. */
    damage: number;
    /**
     * Activation pattern (ms).  Even indices are active durations, odd
     * indices are pause durations.  Empty → always active.
     */
    activationInterval: number[];
}

/** Complete dungeon layout returned by {@link RoomBasedDungeonGenerator.generate}. */
export interface DungeonLayout {
    rooms: DungeonRoom[];
    corridors: Corridor[];
    walls: WallSegment[];
    obstacles: RoomObstacle[];
    roomSpawns: RoomSpawns[];
    /** Loot chest spawn positions. */
    chestSpawns: ChestSpawn[];
    /** Breakable barrel spawn positions. */
    barrelSpawns: BarrelSpawn[];
    /** Minimap unlock item spawn position (null when no loot room exists). */
    mapItemSpawn: MapItemSpawn | null;
    /** Electric trap spawn positions. */
    trapSpawns: TrapSpawn[];
    /** Flattened minimap rectangles generated from rooms/corridors. */
    minimapLayout: StageMinimapLayout;
    /** Centre of the safe (starting) room. */
    spawnPosition: Vec2;
    /** Floor elevation of the safe (starting) room. */
    spawnElevation: number;
    /** Position of the teleporter in the teleporter room (centred against the far wall). */
    teleporterPosition: Vec2;
    /** Floor elevation of the teleporter room. */
    teleporterElevation: number;
    /** Bounding rectangle covering all rooms + corridors (for floor geometry). */
    floorBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/**
 * Configuration passed to {@link RoomBasedDungeonGenerator.generate}.
 * Keep fields explicit so callers (stages) can vary difficulty easily.
 */
export interface RoomGenerationConfig {
    /** Number of *combat* rooms (safe start, final, and teleporter room are always added). */
    combatRoomCount: { min: number; max: number };
    /** Size range for combat rooms. Width and depth are chosen independently. */
    combatRoomSize: {
        minWidth: number;
        maxWidth: number;
        minDepth: number;
        maxDepth: number;
    };
    /** Size range for the final room (boss room). */
    finalRoomSize: {
        minWidth: number;
        maxWidth: number;
        minDepth: number;
        maxDepth: number;
    };
    /**
     * Enemy count configuration.
     * Total enemies per room are computed as `floor(area / areaPerEnemy)`, then
     * clamped to [min, max]. A fixed fraction of enemies are elite type.
     */
    enemyCount: {
        /** Minimum enemies per combat room (applied even in small rooms). */
        min: number;
        /** Maximum enemies per combat room (applied even in large rooms). */
        max: number;
        /** Floor area (m²) per enemy — lower values mean higher density. */
        areaPerEnemy: number;
        /** Fraction of total enemies that are spawned as elite type (0–1). */
        eliteFraction: number;
    };
    /** Obstacle count range per room (safe room always gets zero). */
    obstacleCount: { min: number; max: number };
    /** Whether bosses should be placed in final rooms. */
    hasBoss: boolean;
    /** Number of boss rooms among the combat rooms (default: 1). */
    bossRoomCount?: number;
    /** Number of dedicated loot rooms to generate (default: 0). */
    lootRoomCount?: { min: number; max: number };
    /** Max chests per loot room (default: 3). */
    chestsPerLootRoom?: number;
    /** Quality factor for chest items (default: 1.0). */
    chestQualityFactor?: number;
    /** Whether to place a single chest in the teleporter room (default: false). */
    chestInTeleporterRoom?: boolean;
    /** Breakable barrel count range per combat/loot room (default: 0). */
    barrelCount?: { min: number; max: number };
    /** Electric trap configuration (default: no traps). */
    trapConfig?: {
        /** Number of traps per combat room. */
        count: { min: number; max: number };
        /** Trap width range in metres. */
        width: { min: number; max: number };
        /** Trap length range in metres. */
        length: { min: number; max: number };
        /** Damage dealt per activation tick. */
        damage: number;
        /**
         * Activation interval patterns to randomly choose from.
         * Each sub-array follows the same convention as
         * {@link ElectricTrapConfig.activationInterval}.
         */
        patterns: number[][];
    };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Axis-aligned bounding box used for overlap detection. */
interface AABB {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
}

/** Returns true if two AABBs overlap (touching edges counts as no overlap). */
function aabbOverlap(a: AABB, b: AABB): boolean {
    return a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

/** Get the AABB for a room (with optional margin). */
function roomAABB(cx: number, cz: number, w: number, d: number, margin: number = 0): AABB {
    return {
        minX: cx - w / 2 - margin,
        maxX: cx + w / 2 + margin,
        minZ: cz - d / 2 - margin,
        maxZ: cz + d / 2 + margin,
    };
}

/** Opposite direction. */
function oppositeDir(dir: Direction): Direction {
    switch (dir) {
        case 'north': return 'south';
        case 'south': return 'north';
        case 'east': return 'west';
        case 'west': return 'east';
    }
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates a branching dungeon layout where rooms can connect in any
 * cardinal direction (north, south, east, west).
 *
 * The algorithm:
 * 1. Place the safe room at the origin.
 * 2. Pick a random unconnected wall on the frontier and attempt to attach
 *    a new room via a corridor. If it overlaps existing geometry, retry
 *    with a different direction or room size.
 * 3. Repeat until all combat rooms + the final room are placed.
 * 4. Attach a dedicated teleporter room to the final room.
 *
 * Door positions along walls are randomised (not always centred) to create
 * more organic-looking layouts.
 *
 * Using a seeded LCG ensures layouts are deterministic when the same seed is
 * supplied, making it straightforward to reproduce a run or write tests.
 */
export class RoomBasedDungeonGenerator {
    private rngState: number;

    constructor(seed?: number) {
        const raw = seed !== undefined ? seed : Math.random();
        this.rngState = ((Math.abs(raw) * 1664525 + 1013904223) & 0x7fffffff) || 1;
    }

    // -----------------------------------------------------------------------
    // LCG helpers (same algorithm as ProceduralEnvironmentGenerator)
    // -----------------------------------------------------------------------

    private next(): number {
        this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
        return this.rngState / 0x80000000;
    }

    private range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    private rangeInt(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    /** Shuffle an array in-place using Fisher-Yates. */
    private shuffle<T>(arr: T[]): T[] {
        for (let i = arr.length - 1; i > 0; i--) {
            const j = this.rangeInt(0, i);
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    /**
     * Pick a random elevation for a child room relative to its parent.
     * The result is clamped so rooms never drop below 0 m.
     */
    private pickChildElevation(parentElevation: number): number {
        const roll = this.rangeInt(0, 2); // 0 = same, 1 = up, 2 = down
        if (roll === 1) return parentElevation + ROOM_ELEVATION_STEP;
        if (roll === 2) return Math.max(0, parentElevation - ROOM_ELEVATION_STEP);
        return parentElevation;
    }

    /**
     * Compute corridor elevation endpoints aligned with the spatial axis.
     * elevationStart = elevation at the corridor's lower-coordinate end
     * (minX for horizontal, minZ for vertical).
     */
    private corridorElevations(
        dir: Direction, parentElevation: number, childElevation: number,
    ): { elevationStart: number; elevationEnd: number } {
        switch (dir) {
            case 'east':
            case 'north':
                // Parent is at negative axis end, child at positive
                return { elevationStart: parentElevation, elevationEnd: childElevation };
            case 'west':
            case 'south':
                // Child is at negative axis end, parent at positive
                return { elevationStart: childElevation, elevationEnd: parentElevation };
        }
    }

    // -----------------------------------------------------------------------
    // Public API
    // -----------------------------------------------------------------------

    /**
     * Generate a complete dungeon layout from the given configuration.
     *
     * The returned {@link DungeonLayout} is pure data – callers are responsible
     * for building the scene geometry and physics bodies.
     */
    generate(config: RoomGenerationConfig): DungeonLayout {
        const { rooms, corridors } = this.buildRooms(config);
        const walls = this.buildWalls(rooms, corridors);

        const safeRoom = rooms.find(r => r.isSafe)!;
        const teleporterRoom = rooms.find(r => r.isTeleporterRoom)!;

        const spawnPosition: Vec2 = { x: safeRoom.centerX, z: safeRoom.centerZ };

        // Teleporter centred in the teleporter room, accessible from all sides
        const teleporterPosition = this.computeTeleporterPosition(teleporterRoom);

        const obstacles = this.buildObstacles(rooms, config);
        const mapItemSpawn = this.buildMapItemSpawn(rooms);

        // Build traps first so their areas can be excluded from enemy & barrel spawns
        const trapSpawns = this.buildTrapSpawns(rooms, config, obstacles, teleporterPosition, spawnPosition);

        const roomSpawns = this.buildEnemySpawns(rooms, config, obstacles, teleporterPosition, trapSpawns);
        const chestSpawns = this.buildChestSpawns(rooms, config, obstacles, teleporterPosition, spawnPosition, mapItemSpawn);
        const barrelSpawns = this.buildBarrelSpawns(rooms, config, obstacles, teleporterPosition, spawnPosition, trapSpawns, mapItemSpawn);

        const floorBounds = this.computeFloorBounds(rooms, corridors);
        const minimapLayout = this.buildMinimapLayout(rooms, corridors, floorBounds);

        const spawnElevation = safeRoom.elevation;
        const teleporterElevation = teleporterRoom.elevation;

        return {
            rooms,
            corridors,
            walls,
            obstacles,
            roomSpawns,
            chestSpawns,
            barrelSpawns,
            mapItemSpawn,
            trapSpawns,
            minimapLayout,
            spawnPosition,
            spawnElevation,
            teleporterPosition,
            teleporterElevation,
            floorBounds,
        };
    }

    // -----------------------------------------------------------------------
    // Room placement (branching)
    // -----------------------------------------------------------------------

    private buildRooms(config: RoomGenerationConfig): { rooms: DungeonRoom[]; corridors: Corridor[] } {
        const rooms: DungeonRoom[] = [];
        const corridors: Corridor[] = [];
        /** All occupied AABBs (rooms + corridors) for overlap checks. */
        const occupied: AABB[] = [];

        let nextId = 0;

        // 1. Place the safe room at the origin
        const safeRoom = this.createRoom(nextId++, 0, 0, SAFE_ROOM_SIZE, SAFE_ROOM_SIZE, true, false, false);
        rooms.push(safeRoom);
        occupied.push(roomAABB(safeRoom.centerX, safeRoom.centerZ, safeRoom.width, safeRoom.depth));

        // 2. Place combat rooms by branching from existing rooms
        const numCombat = this.rangeInt(config.combatRoomCount.min, config.combatRoomCount.max);
        const bossRoomCount = Math.max(1, Math.min(numCombat, config.bossRoomCount ?? 1));

        for (let i = 0; i < numCombat; i++) {
            const isFinalCombat = i >= numCombat - bossRoomCount;
            const sizeConfig = isFinalCombat ? config.finalRoomSize : config.combatRoomSize;
            const placed = this.tryAttachRoom(
                nextId, rooms, corridors, occupied, sizeConfig, false, isFinalCombat, false,
            );
            if (placed) nextId++;
        }

        // 3. Attach the dedicated teleporter room to the deepest boss room.
        // With multiple boss rooms we anchor to the highest-id final room,
        // which corresponds to the last boss room placed in generation order.
        const finalRoom = rooms.filter(r => r.isFinal).sort((a, b) => b.id - a.id)[0];
        if (finalRoom) {
            this.tryAttachTeleporterRoom(nextId, finalRoom, rooms, corridors, occupied);
            nextId++;
        }

        // 4. Attach dedicated loot rooms (branching from combat rooms)
        if (config.lootRoomCount) {
            const numLoot = this.rangeInt(config.lootRoomCount.min, config.lootRoomCount.max);
            for (let i = 0; i < numLoot; i++) {
                const placed = this.tryAttachLootRoom(nextId, rooms, corridors, occupied);
                if (placed) nextId++;
            }
        }

        // Backfill deprecated door flags for backward compat
        for (const room of rooms) {
            room.hasWestDoor = room.doors.some(d => d.direction === 'west');
            room.hasEastDoor = room.doors.some(d => d.direction === 'east');
        }

        return { rooms, corridors };
    }

    /**
     * Attempt to attach a new room to any existing room via a corridor.
     * Tries multiple parent rooms and directions with randomisation.
     * Returns true if the room was successfully placed.
     */
    private tryAttachRoom(
        id: number,
        rooms: DungeonRoom[],
        corridors: Corridor[],
        occupied: AABB[],
        sizeConfig: { minWidth: number; maxWidth: number; minDepth: number; maxDepth: number },
        isSafe: boolean,
        isFinal: boolean,
        isTeleporterRoom: boolean,
    ): boolean {
        // Try each existing room in random order as potential parent
        const parentCandidates = this.shuffle([...rooms]);
        const directions: Direction[] = ['north', 'south', 'east', 'west'];

        for (const parent of parentCandidates) {
            // Try each direction in random order
            const dirOrder = this.shuffle([...directions]);
            for (const dir of dirOrder) {
                // Skip if parent already has too many doors (limit branching)
                if (parent.doors.length >= 3) continue;

                // Skip if parent already has a door in this direction
                if (parent.doors.some(d => d.direction === dir)) continue;

                // Pick a random room size (grid-snapped)
                const width = Math.round(this.range(sizeConfig.minWidth, sizeConfig.maxWidth));
                const depth = Math.round(this.range(sizeConfig.minDepth, sizeConfig.maxDepth));

                // Pick a random door offset along the parent's wall
                const doorOffset = this.pickDoorOffset(parent, dir);

                // Compute candidate room position
                const { cx, cz, corAABB } = this.computeAttachPosition(parent, dir, doorOffset, width, depth);

                // Check overlaps
                const roomBB = roomAABB(cx, cz, width, depth, 1); // 1m margin
                const overlaps = occupied.some(o => aabbOverlap(o, roomBB)) ||
                                 (corAABB && occupied.some(o => aabbOverlap(o, corAABB)));

                if (!overlaps) {
                    // Place the room
                    const childElevation = this.pickChildElevation(parent.elevation);
                    const room = this.createRoom(id, cx, cz, width, depth, isSafe, isFinal, isTeleporterRoom, false, childElevation);
                    const returnDir = oppositeDir(dir);
                    const returnOffset = this.computeReturnDoorOffset(parent, dir, doorOffset, room);

                    parent.doors.push({ direction: dir, offset: doorOffset });
                    room.doors.push({ direction: returnDir, offset: returnOffset });

                    rooms.push(room);
                    occupied.push(roomAABB(cx, cz, width, depth));

                    // Add corridor
                    if (corAABB) {
                        const { elevationStart, elevationEnd } = this.corridorElevations(dir, parent.elevation, childElevation);
                        corridors.push({
                            fromRoomId: parent.id,
                            toRoomId: room.id,
                            centerX: (corAABB.minX + corAABB.maxX) / 2,
                            centerZ: (corAABB.minZ + corAABB.maxZ) / 2,
                            width: corAABB.maxX - corAABB.minX,
                            depth: corAABB.maxZ - corAABB.minZ,
                            elevationStart,
                            elevationEnd,
                        });
                        occupied.push(corAABB);
                    }

                    return true;
                }
            }
        }

        // If we can't fit the room anywhere, try smaller sizes
        const fallbackWidth = Math.round(sizeConfig.minWidth);
        const fallbackDepth = Math.round(sizeConfig.minDepth);

        for (const parent of parentCandidates) {
            const dirOrder = this.shuffle([...directions]);
            for (const dir of dirOrder) {
                if (parent.doors.length >= 3) continue;
                if (parent.doors.some(d => d.direction === dir)) continue;

                const doorOffset = this.pickDoorOffset(parent, dir);
                const { cx, cz, corAABB } = this.computeAttachPosition(
                    parent, dir, doorOffset, fallbackWidth, fallbackDepth,
                );

                const roomBB = roomAABB(cx, cz, fallbackWidth, fallbackDepth, 1);
                const overlaps = occupied.some(o => aabbOverlap(o, roomBB)) ||
                                 (corAABB && occupied.some(o => aabbOverlap(o, corAABB)));

                if (!overlaps) {
                    const childElevation = this.pickChildElevation(parent.elevation);
                    const room = this.createRoom(
                        id, cx, cz, fallbackWidth, fallbackDepth, isSafe, isFinal, isTeleporterRoom, false, childElevation,
                    );
                    const returnDir = oppositeDir(dir);
                    const returnOffset = this.computeReturnDoorOffset(parent, dir, doorOffset, room);

                    parent.doors.push({ direction: dir, offset: doorOffset });
                    room.doors.push({ direction: returnDir, offset: returnOffset });

                    rooms.push(room);
                    occupied.push(roomAABB(cx, cz, fallbackWidth, fallbackDepth));

                    if (corAABB) {
                        const { elevationStart, elevationEnd } = this.corridorElevations(dir, parent.elevation, childElevation);
                        corridors.push({
                            fromRoomId: parent.id,
                            toRoomId: room.id,
                            centerX: (corAABB.minX + corAABB.maxX) / 2,
                            centerZ: (corAABB.minZ + corAABB.maxZ) / 2,
                            width: corAABB.maxX - corAABB.minX,
                            depth: corAABB.maxZ - corAABB.minZ,
                            elevationStart,
                            elevationEnd,
                        });
                        occupied.push(corAABB);
                    }

                    return true;
                }
            }
        }

        return false;
    }

    /** Attach the teleporter room specifically to the final room. */
    private tryAttachTeleporterRoom(
        id: number,
        finalRoom: DungeonRoom,
        rooms: DungeonRoom[],
        corridors: Corridor[],
        occupied: AABB[],
    ): boolean {
        const directions: Direction[] = this.shuffle(['north', 'south', 'east', 'west']);

        for (const dir of directions) {
            if (finalRoom.doors.some(d => d.direction === dir)) continue;

            const w = TELEPORTER_ROOM_SIZE;
            const d = TELEPORTER_ROOM_SIZE;
            const doorOffset = this.pickDoorOffset(finalRoom, dir);
            const { cx, cz, corAABB } = this.computeAttachPosition(finalRoom, dir, doorOffset, w, d);

            const roomBB = roomAABB(cx, cz, w, d, 1);
            const overlaps = occupied.some(o => aabbOverlap(o, roomBB)) ||
                             (corAABB && occupied.some(o => aabbOverlap(o, corAABB)));

            if (!overlaps) {
                const childElevation = this.pickChildElevation(finalRoom.elevation);
                const room = this.createRoom(id, cx, cz, w, d, false, false, true, false, childElevation);
                const returnDir = oppositeDir(dir);
                const returnOffset = this.computeReturnDoorOffset(finalRoom, dir, doorOffset, room);

                finalRoom.doors.push({ direction: dir, offset: doorOffset });
                room.doors.push({ direction: returnDir, offset: returnOffset });

                rooms.push(room);
                occupied.push(roomAABB(cx, cz, w, d));

                if (corAABB) {
                    const { elevationStart, elevationEnd } = this.corridorElevations(dir, finalRoom.elevation, childElevation);
                    corridors.push({
                        fromRoomId: finalRoom.id,
                        toRoomId: room.id,
                        centerX: (corAABB.minX + corAABB.maxX) / 2,
                        centerZ: (corAABB.minZ + corAABB.maxZ) / 2,
                        width: corAABB.maxX - corAABB.minX,
                        depth: corAABB.maxZ - corAABB.minZ,
                        elevationStart,
                        elevationEnd,
                    });
                    occupied.push(corAABB);
                }

                return true;
            }
        }

        return false;
    }

    /** Attach a loot room to any eligible combat room. */
    private tryAttachLootRoom(
        id: number,
        rooms: DungeonRoom[],
        corridors: Corridor[],
        occupied: AABB[],
    ): boolean {
        const combatRooms = this.shuffle(rooms.filter(r => !r.isSafe && !r.isTeleporterRoom && !r.isLootRoom));
        const directions: Direction[] = ['north', 'south', 'east', 'west'];

        for (const parent of combatRooms) {
            const dirOrder = this.shuffle([...directions]);
            for (const dir of dirOrder) {
                if (parent.doors.length >= 3) continue;
                if (parent.doors.some(d => d.direction === dir)) continue;

                const w = LOOT_ROOM_SIZE;
                const d = LOOT_ROOM_SIZE;
                const doorOffset = this.pickDoorOffset(parent, dir);
                const { cx, cz, corAABB } = this.computeAttachPosition(parent, dir, doorOffset, w, d);

                const roomBB = roomAABB(cx, cz, w, d, 1);
                const overlaps = occupied.some(o => aabbOverlap(o, roomBB)) ||
                                 (corAABB && occupied.some(o => aabbOverlap(o, corAABB)));

                if (!overlaps) {
                    const childElevation = this.pickChildElevation(parent.elevation);
                    const room = this.createRoom(id, cx, cz, w, d, false, false, false, true, childElevation);
                    const returnDir = oppositeDir(dir);
                    const returnOffset = this.computeReturnDoorOffset(parent, dir, doorOffset, room);

                    parent.doors.push({ direction: dir, offset: doorOffset });
                    room.doors.push({ direction: returnDir, offset: returnOffset });

                    rooms.push(room);
                    occupied.push(roomAABB(cx, cz, w, d));

                    if (corAABB) {
                        const { elevationStart, elevationEnd } = this.corridorElevations(dir, parent.elevation, childElevation);
                        corridors.push({
                            fromRoomId: parent.id,
                            toRoomId: room.id,
                            centerX: (corAABB.minX + corAABB.maxX) / 2,
                            centerZ: (corAABB.minZ + corAABB.maxZ) / 2,
                            width: corAABB.maxX - corAABB.minX,
                            depth: corAABB.maxZ - corAABB.minZ,
                            elevationStart,
                            elevationEnd,
                        });
                        occupied.push(corAABB);
                    }

                    return true;
                }
            }
        }

        return false;
    }

    private createRoom(
        id: number, cx: number, cz: number, width: number, depth: number,
        isSafe: boolean, isFinal: boolean, isTeleporterRoom: boolean,
        isLootRoom: boolean = false, elevation: number = 0,
    ): DungeonRoom {
        return {
            id,
            centerX: cx,
            centerZ: cz,
            width,
            depth,
            isSafe,
            isFinal,
            isTeleporterRoom,
            isLootRoom,
            elevation: isSafe ? 0 : elevation,
            doors: [],
            hasWestDoor: false,
            hasEastDoor: false,
        };
    }

    /**
     * Pick a random door offset along a wall, constrained so the corridor
     * opening fits within the wall bounds. The offset is relative to the
     * room centre along the wall's primary axis.
     */
    private pickDoorOffset(room: DungeonRoom, dir: Direction): number {
        const halfDoor = CORRIDOR_WIDTH / 2;
        let halfExtent: number;
        if (dir === 'north' || dir === 'south') {
            // N/S walls are trimmed by WALL_THICKNESS in total (WALL_THICKNESS / 2
            // = 0.5 m per end) to avoid corner overlap with E/W walls, so use the
            // reduced half-extent here to keep door placement within bounds.
            halfExtent = room.width / 2 - WALL_THICKNESS / 2;
        } else {
            halfExtent = room.depth / 2;
        }
        const maxOffset = halfExtent - halfDoor - WALL_THICKNESS;
        if (maxOffset <= 0) return 0;
        return Math.round(this.range(-maxOffset, maxOffset));
    }

    /**
     * Compute the door offset on the child room wall so it aligns with
     * the parent's door in world space.
     */
    private computeReturnDoorOffset(
        parent: DungeonRoom, parentDir: Direction, parentOffset: number,
        child: DungeonRoom,
    ): number {
        // The door position in world coords (along the wall axis) must match
        if (parentDir === 'north' || parentDir === 'south') {
            // Door world X = parent.centerX + parentOffset
            // Child door world X = child.centerX + childOffset
            return parent.centerX + parentOffset - child.centerX;
        } else {
            // Door world Z = parent.centerZ + parentOffset
            return parent.centerZ + parentOffset - child.centerZ;
        }
    }

    /**
     * Compute the world-space centre of a new room and its connecting
     * corridor AABB when attaching in the given direction from a parent room.
     */
    private computeAttachPosition(
        parent: DungeonRoom, dir: Direction, doorOffset: number,
        newWidth: number, newDepth: number,
    ): { cx: number; cz: number; corAABB: AABB | null } {
        const halfDoor = CORRIDOR_WIDTH / 2;

        let cx: number, cz: number;
        let corAABB: AABB | null = null;

        // Round room centres first so corridor endpoints align exactly with room edges
        switch (dir) {
            case 'east': {
                cx = Math.round(parent.centerX + parent.width / 2 + CORRIDOR_LENGTH + newWidth / 2);
                cz = Math.round(parent.centerZ + doorOffset);
                const corStartX = parent.centerX + parent.width / 2;
                const corEndX = cx - newWidth / 2;
                const corCenterZ = parent.centerZ + doorOffset;
                corAABB = {
                    minX: corStartX,
                    maxX: corEndX,
                    minZ: corCenterZ - halfDoor,
                    maxZ: corCenterZ + halfDoor,
                };
                break;
            }
            case 'west': {
                cx = Math.round(parent.centerX - parent.width / 2 - CORRIDOR_LENGTH - newWidth / 2);
                cz = Math.round(parent.centerZ + doorOffset);
                const corStartXW = cx + newWidth / 2;
                const corEndXW = parent.centerX - parent.width / 2;
                const corCenterZW = parent.centerZ + doorOffset;
                corAABB = {
                    minX: corStartXW,
                    maxX: corEndXW,
                    minZ: corCenterZW - halfDoor,
                    maxZ: corCenterZW + halfDoor,
                };
                break;
            }
            case 'north': {
                cz = Math.round(parent.centerZ + parent.depth / 2 + CORRIDOR_LENGTH + newDepth / 2);
                cx = Math.round(parent.centerX + doorOffset);
                const corStartZN = parent.centerZ + parent.depth / 2;
                const corEndZN = cz - newDepth / 2;
                const corCenterXN = parent.centerX + doorOffset;
                corAABB = {
                    minX: corCenterXN - halfDoor,
                    maxX: corCenterXN + halfDoor,
                    minZ: corStartZN,
                    maxZ: corEndZN,
                };
                break;
            }
            case 'south': {
                cz = Math.round(parent.centerZ - parent.depth / 2 - CORRIDOR_LENGTH - newDepth / 2);
                cx = Math.round(parent.centerX + doorOffset);
                const corStartZS = cz + newDepth / 2;
                const corEndZS = parent.centerZ - parent.depth / 2;
                const corCenterXS = parent.centerX + doorOffset;
                corAABB = {
                    minX: corCenterXS - halfDoor,
                    maxX: corCenterXS + halfDoor,
                    minZ: corStartZS,
                    maxZ: corEndZS,
                };
                break;
            }
        }

        return { cx, cz, corAABB };
    }

    // -----------------------------------------------------------------------
    // Teleporter position
    // -----------------------------------------------------------------------

    /** Compute the teleporter position at the centre of the teleporter room so it is accessible from every side. */
    private computeTeleporterPosition(teleporterRoom: DungeonRoom): Vec2 {
        return { x: teleporterRoom.centerX, z: teleporterRoom.centerZ };
    }

    // -----------------------------------------------------------------------
    // Wall generation
    // -----------------------------------------------------------------------

    private buildWalls(rooms: DungeonRoom[], corridors: Corridor[]): WallSegment[] {
        const walls: WallSegment[] = [];

        for (const room of rooms) {
            walls.push(...this.buildRoomWalls(room));
        }

        // Corridor side walls
        for (const cor of corridors) {
            walls.push(...this.buildCorridorWalls(cor));
        }

        return walls;
    }

    /**
     * Build the four walls of a single room.
     * Each wall may have one or more door openings cut out of it.
     */
    private buildRoomWalls(room: DungeonRoom): WallSegment[] {
        const walls: WallSegment[] = [];
        const { centerX: cx, centerZ: cz, width, depth, elevation } = room;
        const halfW = width / 2;
        const halfD = depth / 2;

        // N/S walls (running along X) are trimmed by WALL_THICKNESS in total
        // (WALL_THICKNESS / 2 = 0.5 m on each end) so they fit exactly between
        // the E/W walls at each corner.  This eliminates the corner geometry
        // overlap that caused z-fighting.
        const nsWidth = width - WALL_THICKNESS;

        // North wall (at cz + halfD, runs along X)
        const northDoors = room.doors.filter(d => d.direction === 'north');
        walls.push(...this.buildWallWithDoors(cx, cz + halfD, nsWidth, 'x', northDoors, elevation));

        // South wall (at cz - halfD, runs along X)
        const southDoors = room.doors.filter(d => d.direction === 'south');
        walls.push(...this.buildWallWithDoors(cx, cz - halfD, nsWidth, 'x', southDoors, elevation));

        // East wall (at cx + halfW, runs along Z) — full depth, covers the corner space
        const eastDoors = room.doors.filter(d => d.direction === 'east');
        walls.push(...this.buildWallWithDoors(cx + halfW, cz, depth, 'z', eastDoors, elevation));

        // West wall (at cx - halfW, runs along Z) — full depth, covers the corner space
        const westDoors = room.doors.filter(d => d.direction === 'west');
        walls.push(...this.buildWallWithDoors(cx - halfW, cz, depth, 'z', westDoors, elevation));

        return walls;
    }

    /**
     * Build a single wall with zero or more door openings cut out.
     *
     * @param wallPos    Position along the perpendicular axis (e.g. Z for N/S walls).
     * @param wallCenter Centre along the wall's primary axis.
     * @param wallLength Total length of the wall.
     * @param axis       'x' for N/S walls (running along X), 'z' for E/W walls (running along Z).
     * @param doors      Door openings along this wall.
     */
    private buildWallWithDoors(
        wallPrimary: number, wallSecondary: number, wallLength: number,
        axis: 'x' | 'z', doors: DoorOpening[], elevation: number = 0,
    ): WallSegment[] {
        if (doors.length === 0) {
            // Solid wall — no doors
            if (axis === 'x') {
                return [this.xWall(wallPrimary, wallSecondary, wallLength, elevation)];
            } else {
                return [this.zWall(wallPrimary, wallSecondary, wallLength, elevation)];
            }
        }

        // Sort doors by offset (ascending along the wall)
        const sorted = [...doors].sort((a, b) => a.offset - b.offset);
        const halfDoor = CORRIDOR_WIDTH / 2;
        const halfLength = wallLength / 2;

        // Build segments between door gaps
        const segments: WallSegment[] = [];
        let cursor = -halfLength; // start of wall in local coords

        for (const door of sorted) {
            const doorStart = door.offset - halfDoor;
            const doorEnd = door.offset + halfDoor;

            const segLength = doorStart - cursor;
            if (segLength > 0.01) {
                const segCenter = (cursor + doorStart) / 2;
                if (axis === 'x') {
                    segments.push(this.xWall(wallPrimary + segCenter, wallSecondary, segLength, elevation));
                } else {
                    segments.push(this.zWall(wallPrimary, wallSecondary + segCenter, segLength, elevation));
                }
            }
            cursor = doorEnd;
        }

        // Final segment after the last door
        const remaining = halfLength - cursor;
        if (remaining > 0.01) {
            const segCenter = (cursor + halfLength) / 2;
            if (axis === 'x') {
                segments.push(this.xWall(wallPrimary + segCenter, wallSecondary, remaining, elevation));
            } else {
                segments.push(this.zWall(wallPrimary, wallSecondary + segCenter, remaining, elevation));
            }
        }

        return segments;
    }

    /** Build side walls for a corridor, extended in height for elevation changes. */
    private buildCorridorWalls(cor: Corridor): WallSegment[] {
        const minElev = Math.min(cor.elevationStart, cor.elevationEnd);
        // Trim corridor wall visual height 0.05 m below WALL_HEIGHT so the mesh
        // top face never coincides with room wall tops or the higher room's floor
        // at junction corners, preventing z-fighting in both flat and sloped corridors.
        const wallH = WALL_HEIGHT - 0.05;
        const wallCenterY = minElev + wallH / 2;
        // Collider extends well above the mesh so the player cannot jump on top.
        const colliderHeight = WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT;

        if (cor.width > cor.depth) {
            // Horizontal corridor (runs along X) → side walls run along X at ±Z
            return [
                { centerX: cor.centerX, centerY: wallCenterY, centerZ: cor.centerZ + cor.depth / 2, width: cor.width, height: wallH, depth: WALL_THICKNESS, colliderHeight },
                { centerX: cor.centerX, centerY: wallCenterY, centerZ: cor.centerZ - cor.depth / 2, width: cor.width, height: wallH, depth: WALL_THICKNESS, colliderHeight },
            ];
        } else {
            // Vertical corridor (runs along Z) → side walls run along Z at ±X
            return [
                { centerX: cor.centerX + cor.width / 2, centerY: wallCenterY, centerZ: cor.centerZ, width: WALL_THICKNESS, height: wallH, depth: cor.depth, colliderHeight },
                { centerX: cor.centerX - cor.width / 2, centerY: wallCenterY, centerZ: cor.centerZ, width: WALL_THICKNESS, height: wallH, depth: cor.depth, colliderHeight },
            ];
        }
    }

    // -----------------------------------------------------------------------
    // Wall segment factories
    // -----------------------------------------------------------------------

    /** Wall extending along the X axis (north/south room walls, horizontal corridor side walls). */
    private xWall(centerX: number, centerZ: number, length: number, elevation: number = 0): WallSegment {
        return {
            centerX,
            centerY: elevation + WALL_HEIGHT / 2,
            centerZ,
            width: length,
            height: WALL_HEIGHT,
            depth: WALL_THICKNESS,
            colliderHeight: WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT,
        };
    }

    /** Wall extending along the Z axis (east/west room walls, vertical corridor side walls). */
    private zWall(centerX: number, centerZ: number, length: number, elevation: number = 0): WallSegment {
        return {
            centerX,
            centerY: elevation + WALL_HEIGHT / 2,
            centerZ,
            width: WALL_THICKNESS,
            height: WALL_HEIGHT,
            depth: length,
            colliderHeight: WALL_HEIGHT + COLLIDER_EXTRA_HEIGHT,
        };
    }

    // -----------------------------------------------------------------------
    // Obstacle generation (grid-snapped)
    // -----------------------------------------------------------------------

    /**
     * Place random box obstacles in every non-safe, non-teleporter room.
     * Obstacle positions and sizes are snapped to the 1 m grid to avoid
     * narrow irregular gaps between obstacles and walls.
     */
    private buildObstacles(
        rooms: DungeonRoom[],
        config: RoomGenerationConfig,
    ): RoomObstacle[] {
        const obstacles: RoomObstacle[] = [];

        for (const room of rooms) {
            if (room.isSafe || room.isTeleporterRoom || room.isLootRoom) continue;

            const count = this.rangeInt(config.obstacleCount.min, config.obstacleCount.max);
            const minX = Math.ceil(room.centerX - room.width / 2 + SPAWN_PADDING);
            const maxX = Math.floor(room.centerX + room.width / 2 - SPAWN_PADDING);
            const minZ = Math.ceil(room.centerZ - room.depth / 2 + SPAWN_PADDING);
            const maxZ = Math.floor(room.centerZ + room.depth / 2 - SPAWN_PADDING);

            // Exclusion zones around door openings to keep corridors accessible
            const exclusions: Array<{ x: number; z: number; radius: number }> = [];
            for (const door of room.doors) {
                const doorWorldPos = this.doorWorldPosition(room, door);
                exclusions.push({ x: doorWorldPos.x, z: doorWorldPos.z, radius: CORRIDOR_WIDTH + 1 });
            }

            const maxAttempts = count * 15;
            let attempts = 0;
            let placed = 0;

            while (placed < count && attempts < maxAttempts) {
                attempts++;
                // Grid-snapped size: 1, 2, or 3 metres
                const w = this.rangeInt(1, 3);
                const h = WALL_HEIGHT;
                const d = this.rangeInt(1, 3);
                // Grid-snapped position
                const x = this.rangeInt(minX, maxX);
                const z = this.rangeInt(minZ, maxZ);

                const excluded = exclusions.some(ez => {
                    const dx = x - ez.x;
                    const dz = z - ez.z;
                    return dx * dx + dz * dz < ez.radius * ez.radius;
                });

                if (!excluded) {
                    obstacles.push({ x, y: room.elevation + h / 2, z, width: w, height: h, depth: d });
                    exclusions.push({ x, z, radius: Math.max(w, d) + 1 });
                    placed++;
                }
            }
        }

        return obstacles;
    }

    /** Get the world-space position of a door opening on a room wall. */
    private doorWorldPosition(room: DungeonRoom, door: DoorOpening): Vec2 {
        switch (door.direction) {
            case 'north':
                return { x: room.centerX + door.offset, z: room.centerZ + room.depth / 2 };
            case 'south':
                return { x: room.centerX + door.offset, z: room.centerZ - room.depth / 2 };
            case 'east':
                return { x: room.centerX + room.width / 2, z: room.centerZ + door.offset };
            case 'west':
                return { x: room.centerX - room.width / 2, z: room.centerZ + door.offset };
        }
    }

    // -----------------------------------------------------------------------
    // Enemy spawn generation
    // -----------------------------------------------------------------------

    private buildEnemySpawns(
        rooms: DungeonRoom[],
        config: RoomGenerationConfig,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        trapSpawns: TrapSpawn[],
    ): RoomSpawns[] {
        return rooms.map(room => ({
            roomId: room.id,
            spawns: this.spawnsForRoom(room, config, obstacles, teleporterPos, trapSpawns),
        }));
    }

    private spawnsForRoom(
        room: DungeonRoom,
        config: RoomGenerationConfig,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        trapSpawns: TrapSpawn[],
    ): EnemySpawnPoint[] {
        if (room.isSafe || room.isTeleporterRoom || room.isLootRoom) return [];

        // Boss room: only the boss spawns here — no regular or elite enemies
        if (room.isFinal && config.hasBoss) {
            return [{ x: room.centerX, y: room.elevation + 0.5, z: room.centerZ, type: EnemySpawnType.Boss }];
        }

        const area = room.width * room.depth;
        const totalEnemies = Math.max(
            config.enemyCount.min,
            Math.min(config.enemyCount.max, Math.floor(area / config.enemyCount.areaPerEnemy)),
        );
        const numElite = Math.round(totalEnemies * config.enemyCount.eliteFraction);
        const numRegular = totalEnemies - numElite;

        // Exclusion zones: obstacles in this room + teleporter
        const exclusions: Array<{ x: number; z: number; radius: number }> = [];
        exclusions.push({ x: teleporterPos.x, z: teleporterPos.z, radius: 3 });
        for (const obs of obstacles) {
            if (
                obs.x >= room.centerX - room.width / 2 &&
                obs.x <= room.centerX + room.width / 2 &&
                obs.z >= room.centerZ - room.depth / 2 &&
                obs.z <= room.centerZ + room.depth / 2
            ) {
                exclusions.push({ x: obs.x, z: obs.z, radius: Math.max(obs.width, obs.depth) });
            }
        }

        const minX = room.centerX - room.width / 2 + SPAWN_PADDING;
        const maxX = room.centerX + room.width / 2 - SPAWN_PADDING;
        const minZ = room.centerZ - room.depth / 2 + SPAWN_PADDING;
        const maxZ = room.centerZ + room.depth / 2 - SPAWN_PADDING;

        const isExcluded = (x: number, z: number): boolean =>
            exclusions.some(ez => {
                const dx = x - ez.x;
                const dz = z - ez.z;
                return dx * dx + dz * dz < ez.radius * ez.radius;
            }) || this.isOnTrap(x, z, trapSpawns);

        const spawns: EnemySpawnPoint[] = [];

        const trySpawn = (type: EnemySpawnType.Regular | EnemySpawnType.Elite, y: number): void => {
            const maxAttempts = 20;
            for (let i = 0; i < maxAttempts; i++) {
                const x = this.range(minX, maxX);
                const z = this.range(minZ, maxZ);
                if (!isExcluded(x, z)) {
                    spawns.push({ x, y, z, type });
                    return;
                }
            }
        };

        for (let i = 0; i < numRegular; i++) trySpawn(EnemySpawnType.Regular, room.elevation + 0.5);
        for (let i = 0; i < numElite; i++) trySpawn(EnemySpawnType.Elite, room.elevation + 1.0);

        return spawns;
    }

    // -----------------------------------------------------------------------
    // Chest spawn generation
    // -----------------------------------------------------------------------

    private buildChestSpawns(
        rooms: DungeonRoom[],
        config: RoomGenerationConfig,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        spawnPos: Vec2,
        mapItemSpawn: MapItemSpawn | null,
    ): ChestSpawn[] {
        const qualityFactor = config.chestQualityFactor ?? 1.0;
        const chestsPerRoom = config.chestsPerLootRoom ?? 3;
        const chests: ChestSpawn[] = [];

        // Place chests in dedicated loot rooms (up to chestsPerRoom each)
        const lootRooms = rooms.filter(r => r.isLootRoom);
        for (const room of lootRooms) {
            const extraExclusions = (mapItemSpawn && mapItemSpawn.roomId === room.id)
                ? [{ x: mapItemSpawn.x, z: mapItemSpawn.z, radius: 2 }]
                : [];
            for (let i = 0; i < chestsPerRoom; i++) {
                const pos = this.findSpawnPosition(room, obstacles, teleporterPos, spawnPos, [], extraExclusions);
                if (pos) {
                    chests.push({ x: pos.x, y: room.elevation, z: pos.z, itemQualityFactor: qualityFactor });
                }
            }
        }

        // Place a single chest in the teleporter room (if configured)
        if (config.chestInTeleporterRoom) {
            const tpRoom = rooms.find(r => r.isTeleporterRoom);
            if (tpRoom) {
                const pos = this.findSpawnPosition(tpRoom, obstacles, teleporterPos, spawnPos);
                if (pos) {
                    chests.push({ x: pos.x, y: tpRoom.elevation, z: pos.z, itemQualityFactor: qualityFactor });
                }
            }
        }

        return chests;
    }

    // -----------------------------------------------------------------------
    // Barrel spawn generation
    // -----------------------------------------------------------------------

    private buildBarrelSpawns(
        rooms: DungeonRoom[],
        config: RoomGenerationConfig,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        spawnPos: Vec2,
        trapSpawns: TrapSpawn[],
        mapItemSpawn: MapItemSpawn | null,
    ): BarrelSpawn[] {
        if (!config.barrelCount) return [];

        const barrels: BarrelSpawn[] = [];

        for (const room of rooms) {
            if (room.isSafe || room.isTeleporterRoom) continue;

            const count = this.rangeInt(config.barrelCount.min, config.barrelCount.max);
            for (let i = 0; i < count; i++) {
                // In enemy (combat) rooms, barrels spawn only on the perimeter
                // to avoid breaking enemy navigation
                const isEnemyRoom = !room.isLootRoom;
                const extraExclusions = (mapItemSpawn && mapItemSpawn.roomId === room.id)
                    ? [{ x: mapItemSpawn.x, z: mapItemSpawn.z, radius: 2 }]
                    : [];
                const pos = isEnemyRoom
                    ? this.findPerimeterSpawnPosition(room, obstacles, teleporterPos, spawnPos, trapSpawns, extraExclusions)
                    : this.findSpawnPosition(room, obstacles, teleporterPos, spawnPos, trapSpawns, extraExclusions);
                if (pos) {
                    barrels.push({ x: pos.x, y: room.elevation, z: pos.z });
                }
            }
        }
        return barrels;
    }

    // -----------------------------------------------------------------------
    // Trap spawn generation
    // -----------------------------------------------------------------------

    private buildTrapSpawns(
        rooms: DungeonRoom[],
        config: RoomGenerationConfig,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        spawnPos: Vec2,
    ): TrapSpawn[] {
        if (!config.trapConfig) return [];

        const tc = config.trapConfig;
        const traps: TrapSpawn[] = [];

        for (const room of rooms) {
            // Traps only in combat rooms (not safe, loot, or teleporter)
            if (room.isSafe || room.isTeleporterRoom || room.isLootRoom) continue;

            const count = this.rangeInt(tc.count.min, tc.count.max);
            for (let i = 0; i < count; i++) {
                const w = this.rangeInt(tc.width.min, tc.width.max);
                const l = this.rangeInt(tc.length.min, tc.length.max);
                const pos = this.findSpawnPosition(room, obstacles, teleporterPos, spawnPos);
                if (!pos) continue;

                const pattern = tc.patterns.length > 0
                    ? tc.patterns[this.rangeInt(0, tc.patterns.length - 1)]
                    : [];

                traps.push({
                    x: pos.x,
                    y: room.elevation,
                    z: pos.z,
                    width: w,
                    length: l,
                    damage: tc.damage,
                    activationInterval: pattern,
                });
            }
        }
        return traps;
    }

    /** Check whether a point overlaps any trap (with 0.5m buffer). */
    private isOnTrap(x: number, z: number, traps: TrapSpawn[]): boolean {
        return traps.some(t =>
            Math.abs(x - t.x) <= t.width / 2 + 0.5 &&
            Math.abs(z - t.z) <= t.length / 2 + 0.5,
        );
    }

    /**
     * Find a valid spawn position inside a room that avoids obstacles,
     * the teleporter, and the player spawn.
     */
    private findSpawnPosition(
        room: DungeonRoom,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        spawnPos: Vec2,
        trapSpawns: TrapSpawn[] = [],
        extraExclusions: Array<{ x: number; z: number; radius: number }> = [],
    ): Vec2 | null {
        const exclusions: Array<{ x: number; z: number; radius: number }> = [];
        exclusions.push({ x: teleporterPos.x, z: teleporterPos.z, radius: 3 });
        exclusions.push({ x: spawnPos.x, z: spawnPos.z, radius: 3 });

        for (const obs of obstacles) {
            if (
                obs.x >= room.centerX - room.width / 2 &&
                obs.x <= room.centerX + room.width / 2 &&
                obs.z >= room.centerZ - room.depth / 2 &&
                obs.z <= room.centerZ + room.depth / 2
            ) {
                exclusions.push({ x: obs.x, z: obs.z, radius: Math.max(obs.width, obs.depth) });
            }
        }

        // Also exclude door openings
        for (const door of room.doors) {
            const doorPos = this.doorWorldPosition(room, door);
            exclusions.push({ x: doorPos.x, z: doorPos.z, radius: CORRIDOR_WIDTH + 1 });
        }
        exclusions.push(...extraExclusions);

        const minX = room.centerX - room.width / 2 + SPAWN_PADDING;
        const maxX = room.centerX + room.width / 2 - SPAWN_PADDING;
        const minZ = room.centerZ - room.depth / 2 + SPAWN_PADDING;
        const maxZ = room.centerZ + room.depth / 2 - SPAWN_PADDING;

        for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
            const x = this.range(minX, maxX);
            const z = this.range(minZ, maxZ);
            const excluded = exclusions.some(ez => {
                const dx = x - ez.x;
                const dz = z - ez.z;
                return dx * dx + dz * dz < ez.radius * ez.radius;
            }) || this.isOnTrap(x, z, trapSpawns);
            if (!excluded) return { x, z };
        }
        return null;
    }

    /**
     * Find a valid spawn position on the perimeter of a room (within
     * SPAWN_PADDING of a wall). Used for barrels in combat rooms to avoid
     * breaking enemy navigation.
     */
    private findPerimeterSpawnPosition(
        room: DungeonRoom,
        obstacles: RoomObstacle[],
        teleporterPos: Vec2,
        spawnPos: Vec2,
        trapSpawns: TrapSpawn[] = [],
        extraExclusions: Array<{ x: number; z: number; radius: number }> = [],
    ): Vec2 | null {
        const exclusions: Array<{ x: number; z: number; radius: number }> = [];
        exclusions.push({ x: teleporterPos.x, z: teleporterPos.z, radius: 3 });
        exclusions.push({ x: spawnPos.x, z: spawnPos.z, radius: 3 });

        for (const obs of obstacles) {
            if (
                obs.x >= room.centerX - room.width / 2 &&
                obs.x <= room.centerX + room.width / 2 &&
                obs.z >= room.centerZ - room.depth / 2 &&
                obs.z <= room.centerZ + room.depth / 2
            ) {
                exclusions.push({ x: obs.x, z: obs.z, radius: Math.max(obs.width, obs.depth) });
            }
        }

        for (const door of room.doors) {
            const doorPos = this.doorWorldPosition(room, door);
            exclusions.push({ x: doorPos.x, z: doorPos.z, radius: CORRIDOR_WIDTH + 1 });
        }
        exclusions.push(...extraExclusions);

        const perimeterDepth = SPAWN_PADDING + 1;
        const minX = room.centerX - room.width / 2 + SPAWN_PADDING;
        const maxX = room.centerX + room.width / 2 - SPAWN_PADDING;
        const minZ = room.centerZ - room.depth / 2 + SPAWN_PADDING;
        const maxZ = room.centerZ + room.depth / 2 - SPAWN_PADDING;
        const innerMinX = room.centerX - room.width / 2 + perimeterDepth;
        const innerMaxX = room.centerX + room.width / 2 - perimeterDepth;
        const innerMinZ = room.centerZ - room.depth / 2 + perimeterDepth;
        const innerMaxZ = room.centerZ + room.depth / 2 - perimeterDepth;

        const isExcluded = (x: number, z: number): boolean =>
            exclusions.some(ez => {
                const dx = x - ez.x;
                const dz = z - ez.z;
                return dx * dx + dz * dz < ez.radius * ez.radius;
            }) || this.isOnTrap(x, z, trapSpawns);

        for (let attempt = 0; attempt < MAX_SPAWN_ATTEMPTS; attempt++) {
            const x = this.range(minX, maxX);
            const z = this.range(minZ, maxZ);
            // Reject positions that are inside the inner area (i.e. not on perimeter)
            if (x > innerMinX && x < innerMaxX && z > innerMinZ && z < innerMaxZ) continue;
            if (!isExcluded(x, z)) return { x, z };
        }
        return null;
    }

    private buildMapItemSpawn(rooms: DungeonRoom[]): MapItemSpawn | null {
        const lootRooms = rooms.filter(r => r.isLootRoom);
        if (lootRooms.length === 0) return null;

        const room = lootRooms[this.rangeInt(0, lootRooms.length - 1)];
        return {
            x: room.centerX,
            y: room.elevation + MAP_ITEM_SPAWN_Y_OFFSET,
            z: room.centerZ,
            roomId: room.id,
        };
    }

    private buildMinimapLayout(
        rooms: DungeonRoom[],
        corridors: Corridor[],
        floorBounds: { minX: number; maxX: number; minZ: number; maxZ: number },
    ): StageMinimapLayout {
        const rects = [
            ...rooms.map(room => ({
                x: room.centerX,
                z: room.centerZ,
                width: room.width,
                depth: room.depth,
                kind: 'room' as const,
                roomId: room.id,
            })),
            ...corridors.map(corridor => ({
                x: corridor.centerX,
                z: corridor.centerZ,
                width: corridor.width,
                depth: corridor.depth,
                kind: 'corridor' as const,
            })),
        ];

        return { rects, bounds: floorBounds };
    }

    // -----------------------------------------------------------------------
    // Floor bounds
    // -----------------------------------------------------------------------

    private computeFloorBounds(
        rooms: DungeonRoom[],
        corridors: Corridor[],
    ): { minX: number; maxX: number; minZ: number; maxZ: number } {
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;

        for (const room of rooms) {
            minX = Math.min(minX, room.centerX - room.width / 2);
            maxX = Math.max(maxX, room.centerX + room.width / 2);
            minZ = Math.min(minZ, room.centerZ - room.depth / 2);
            maxZ = Math.max(maxZ, room.centerZ + room.depth / 2);
        }

        for (const cor of corridors) {
            minX = Math.min(minX, cor.centerX - cor.width / 2);
            maxX = Math.max(maxX, cor.centerX + cor.width / 2);
            minZ = Math.min(minZ, cor.centerZ - cor.depth / 2);
            maxZ = Math.max(maxZ, cor.centerZ + cor.depth / 2);
        }

        // Add a small margin
        return {
            minX: minX - 1,
            maxX: maxX + 1,
            minZ: minZ - 1,
            maxZ: maxZ + 1,
        };
    }
}

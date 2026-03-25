/**
 * Wall height and thickness constants (in metres).
 * 2 m height prevents the player from jumping over walls.
 * 1 m thickness gives walls a solid physical presence.
 */
export const WALL_HEIGHT = 2;
export const WALL_THICKNESS = 1;

/** Width of the corridor / door opening that connects adjacent rooms (in metres). */
export const CORRIDOR_WIDTH = 3;

/** Length of the corridor connecting two rooms (in metres). */
export const CORRIDOR_LENGTH = 5;

/** Fixed size (width = depth) for the safe starting room (in metres). */
export const SAFE_ROOM_SIZE = 10;

/** Minimum distance in metres between an enemy spawn point and the nearest wall. */
const ENEMY_SPAWN_PADDING = 2;

// ---------------------------------------------------------------------------
// Data types – all are plain serialisable data; no Three.js / CANNON deps.
// ---------------------------------------------------------------------------

export interface Vec2 {
    x: number;
    z: number;
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
    /** True for the last room – contains the boss and the teleporter. */
    isFinal: boolean;
    /** Has a door (corridor connection) on the –X side. */
    hasWestDoor: boolean;
    /** Has a door (corridor connection) on the +X side. */
    hasEastDoor: boolean;
}

/** A single axis-aligned wall box described by its centre and extents. */
export interface WallSegment {
    centerX: number;
    centerY: number;
    centerZ: number;
    /** Extent along the X axis. */
    width: number;
    /** Extent along the Y axis (always WALL_HEIGHT). */
    height: number;
    /** Extent along the Z axis. */
    depth: number;
}

/** A single enemy spawn point together with the enemy archetype. */
export interface EnemySpawnPoint {
    x: number;
    y: number;
    z: number;
    type: 'regular' | 'large' | 'boss';
}

/** All enemy spawn points that belong to one room. */
export interface RoomSpawns {
    roomId: number;
    spawns: EnemySpawnPoint[];
}

/** Complete dungeon layout returned by {@link RoomBasedDungeonGenerator.generate}. */
export interface DungeonLayout {
    rooms: DungeonRoom[];
    walls: WallSegment[];
    roomSpawns: RoomSpawns[];
    /** Centre of the safe (starting) room. */
    spawnPosition: Vec2;
    /** Centre of the final room – place the teleporter here. */
    teleporterPosition: Vec2;
    /** Bounding rectangle covering all rooms + corridors (for floor geometry). */
    floorBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
}

/**
 * Configuration passed to {@link RoomBasedDungeonGenerator.generate}.
 * Keep fields explicit so callers (stages) can vary difficulty easily.
 */
export interface RoomGenerationConfig {
    /** Number of *combat* rooms (safe start and final room are always added). */
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
     * Enemy density expressed as floor area (m²) per enemy.
     * Lower values → more enemies per room.
     */
    enemyDensity: {
        regularPerArea: number;
        largePerArea: number;
    };
    /** Whether a boss should be placed in the final room. */
    hasBoss: boolean;
}

// ---------------------------------------------------------------------------
// Generator
// ---------------------------------------------------------------------------

/**
 * Generates a linear chain of rooms connected by corridors.
 *
 * Layout (X axis):
 * ```
 * [Safe room] ── corridor ── [Room 1] ── corridor ── … ── [Final room]
 * ```
 *
 * All rooms are centred on Z = 0. Corridors keep the path width to
 * {@link CORRIDOR_WIDTH} m.
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
        const rooms = this.buildRooms(config);
        const walls = this.buildWalls(rooms);
        const roomSpawns = this.buildEnemySpawns(rooms, config);

        const safeRoom = rooms[0];
        const finalRoom = rooms[rooms.length - 1];

        const spawnPosition: Vec2 = { x: safeRoom.centerX, z: 0 };

        // Place teleporter slightly in front of the final room's centre
        const teleporterPosition: Vec2 = { x: finalRoom.centerX, z: 0 };

        const floorBounds = this.computeFloorBounds(rooms);

        return { rooms, walls, roomSpawns, spawnPosition, teleporterPosition, floorBounds };
    }

    // -----------------------------------------------------------------------
    // Room placement
    // -----------------------------------------------------------------------

    private buildRooms(config: RoomGenerationConfig): DungeonRoom[] {
        const rooms: DungeonRoom[] = [];
        const numCombat = this.rangeInt(config.combatRoomCount.min, config.combatRoomCount.max);
        const totalRooms = 1 + numCombat + 1; // safe + combat + final

        let cursorX = 0; // tracks the right edge of the last placed room

        for (let i = 0; i < totalRooms; i++) {
            const isSafe = i === 0;
            const isFinal = i === totalRooms - 1;

            const { width, depth } = this.pickRoomSize(isSafe, isFinal, config);

            const centerX = cursorX + width / 2;
            const hasWestDoor = i > 0;
            const hasEastDoor = i < totalRooms - 1;

            rooms.push({
                id: i,
                centerX,
                centerZ: 0,
                width,
                depth,
                isSafe,
                isFinal,
                hasWestDoor,
                hasEastDoor,
            });

            cursorX += width;
            if (hasEastDoor) {
                cursorX += CORRIDOR_LENGTH;
            }
        }

        return rooms;
    }

    private pickRoomSize(
        isSafe: boolean,
        isFinal: boolean,
        config: RoomGenerationConfig,
    ): { width: number; depth: number } {
        if (isSafe) {
            return { width: SAFE_ROOM_SIZE, depth: SAFE_ROOM_SIZE };
        }
        const s = isFinal ? config.finalRoomSize : config.combatRoomSize;
        return {
            width: this.range(s.minWidth, s.maxWidth),
            depth: this.range(s.minDepth, s.maxDepth),
        };
    }

    // -----------------------------------------------------------------------
    // Wall generation
    // -----------------------------------------------------------------------

    private buildWalls(rooms: DungeonRoom[]): WallSegment[] {
        const walls: WallSegment[] = [];

        for (const room of rooms) {
            walls.push(...this.buildRoomWalls(room));
        }

        // Corridor side walls between every pair of adjacent rooms
        for (let i = 0; i < rooms.length - 1; i++) {
            walls.push(...this.buildCorridorWalls(rooms[i], rooms[i + 1]));
        }

        return walls;
    }

    /**
     * Build the four walls of a single room.
     * East / West walls are split to leave a {@link CORRIDOR_WIDTH} door gap
     * centred at Z = 0 when the room connects to a neighbour.
     */
    private buildRoomWalls(room: DungeonRoom): WallSegment[] {
        const walls: WallSegment[] = [];
        const { centerX: cx, centerZ: cz, width, depth } = room;
        const halfW = width / 2;
        const halfD = depth / 2;

        // North wall – full width, parallel to X axis
        walls.push(this.xWall(cx, cz + halfD, width));

        // South wall – full width, parallel to X axis
        walls.push(this.xWall(cx, cz - halfD, width));

        // West wall (parallel to Z axis)
        if (room.hasWestDoor) {
            walls.push(...this.zWallWithDoor(cx - halfW, cz, halfD));
        } else {
            walls.push(this.zWall(cx - halfW, cz, depth));
        }

        // East wall (parallel to Z axis)
        if (room.hasEastDoor) {
            walls.push(...this.zWallWithDoor(cx + halfW, cz, halfD));
        } else {
            walls.push(this.zWall(cx + halfW, cz, depth));
        }

        return walls;
    }

    /**
     * Split a Z-parallel wall into two segments separated by a door gap.
     *
     * @param wallX   X position of the wall centre line.
     * @param roomCz  Z centre of the room (door is centred here).
     * @param halfD   Half the room's depth in Z.
     */
    private zWallWithDoor(wallX: number, roomCz: number, halfD: number): WallSegment[] {
        const halfDoor = CORRIDOR_WIDTH / 2;
        const segments: WallSegment[] = [];

        // South segment: from (roomCz − halfD) to (roomCz − halfDoor)
        const southLen = halfD - halfDoor;
        if (southLen > 0) {
            const southCz = roomCz - (halfD + halfDoor) / 2;
            segments.push(this.zWall(wallX, southCz, southLen));
        }

        // North segment: from (roomCz + halfDoor) to (roomCz + halfD)
        const northLen = halfD - halfDoor;
        if (northLen > 0) {
            const northCz = roomCz + (halfD + halfDoor) / 2;
            segments.push(this.zWall(wallX, northCz, northLen));
        }

        return segments;
    }

    /** Corridor side walls running between two adjacent rooms. */
    private buildCorridorWalls(roomA: DungeonRoom, roomB: DungeonRoom): WallSegment[] {
        const corStartX = roomA.centerX + roomA.width / 2;
        const corEndX = roomB.centerX - roomB.width / 2;
        const corCenterX = (corStartX + corEndX) / 2;
        const corLength = corEndX - corStartX;

        if (corLength <= 0) return [];

        return [
            // North corridor wall
            this.xWall(corCenterX, CORRIDOR_WIDTH / 2, corLength),
            // South corridor wall
            this.xWall(corCenterX, -CORRIDOR_WIDTH / 2, corLength),
        ];
    }

    // -----------------------------------------------------------------------
    // Wall segment factories
    // -----------------------------------------------------------------------

    /** Wall extending along the X axis (north/south room walls, corridor side walls). */
    private xWall(centerX: number, centerZ: number, length: number): WallSegment {
        return {
            centerX,
            centerY: WALL_HEIGHT / 2,
            centerZ,
            width: length,
            height: WALL_HEIGHT,
            depth: WALL_THICKNESS,
        };
    }

    /** Wall extending along the Z axis (east/west room walls). */
    private zWall(centerX: number, centerZ: number, length: number): WallSegment {
        return {
            centerX,
            centerY: WALL_HEIGHT / 2,
            centerZ,
            width: WALL_THICKNESS,
            height: WALL_HEIGHT,
            depth: length,
        };
    }

    // -----------------------------------------------------------------------
    // Enemy spawn generation
    // -----------------------------------------------------------------------

    private buildEnemySpawns(rooms: DungeonRoom[], config: RoomGenerationConfig): RoomSpawns[] {
        return rooms.map(room => ({
            roomId: room.id,
            spawns: this.spawnsForRoom(room, config),
        }));
    }

    private spawnsForRoom(room: DungeonRoom, config: RoomGenerationConfig): EnemySpawnPoint[] {
        if (room.isSafe) return [];

        const area = room.width * room.depth;
        const spawns: EnemySpawnPoint[] = [];

        // Boss spawns at room centre in the final room
        if (room.isFinal && config.hasBoss) {
            spawns.push({ x: room.centerX, y: 0.5, z: 0, type: 'boss' });
        }

        // Regular and large enemies scale linearly with room area
        const numRegular = Math.max(1, Math.floor(area / config.enemyDensity.regularPerArea));
        const numLarge = Math.floor(area / config.enemyDensity.largePerArea);

        // Keep enemies away from walls
        const minX = room.centerX - room.width / 2 + ENEMY_SPAWN_PADDING;
        const maxX = room.centerX + room.width / 2 - ENEMY_SPAWN_PADDING;
        const minZ = room.centerZ - room.depth / 2 + ENEMY_SPAWN_PADDING;
        const maxZ = room.centerZ + room.depth / 2 - ENEMY_SPAWN_PADDING;

        for (let i = 0; i < numRegular; i++) {
            spawns.push({ x: this.range(minX, maxX), y: 0.5, z: this.range(minZ, maxZ), type: 'regular' });
        }

        for (let i = 0; i < numLarge; i++) {
            spawns.push({ x: this.range(minX, maxX), y: 1.0, z: this.range(minZ, maxZ), type: 'large' });
        }

        return spawns;
    }

    // -----------------------------------------------------------------------
    // Floor bounds
    // -----------------------------------------------------------------------

    private computeFloorBounds(
        rooms: DungeonRoom[],
    ): { minX: number; maxX: number; minZ: number; maxZ: number } {
        const lastRoom = rooms[rooms.length - 1];
        const maxHalfDepth = Math.max(...rooms.map(r => r.depth / 2));

        return {
            minX: 0,
            maxX: lastRoom.centerX + lastRoom.width / 2,
            minZ: -(maxHalfDepth + CORRIDOR_WIDTH / 2),
            maxZ: maxHalfDepth + CORRIDOR_WIDTH / 2,
        };
    }
}

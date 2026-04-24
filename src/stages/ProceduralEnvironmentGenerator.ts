/**
 * Configuration for a single obstacle in the environment.
 */
export interface ObstacleConfig {
    width: number;
    height: number;
    depth: number;
    x: number;
    y: number;
    z: number;
}

/**
 * A zone where no obstacles or enemies should be placed (e.g., spawn point, teleporter).
 */
export interface ExclusionZone {
    x: number;
    z: number;
    radius: number;
}

/**
 * Count range for each enemy type to spawn.
 */
export interface EnemyCounts {
    regular?: { min: number; max: number };
    elite?: { min: number; max: number };
    boss?: number;
}

/**
 * Configuration passed to generateLayout().
 */
export interface GenerationConfig {
    bounds: { min: number; max: number };
    exclusionZones: ExclusionZone[];
    obstacleCount: { min: number; max: number };
    enemyCounts: EnemyCounts;
}

/**
 * The fully generated environment layout returned by generateLayout().
 */
export interface EnvironmentLayout {
    obstacles: ObstacleConfig[];
    enemyPositions: { x: number; y: number; z: number }[];
    eliteEnemyPositions: { x: number; y: number; z: number }[];
    bossPositions: { x: number; y: number; z: number }[];
}

/**
 * Generates procedural dungeon environments using a seeded linear-congruential
 * random-number generator so layouts are deterministic when the same seed is
 * provided, but vary between runs when no seed is given.
 */
export class ProceduralEnvironmentGenerator {
    private rngState: number;

    constructor(seed?: number) {
        // Condense the seed into a non-zero 31-bit integer using a mixing step
        // to ensure different seed values start from different states.
        const raw = seed !== undefined ? seed : Math.random();
        this.rngState = ((Math.abs(raw) * 1664525 + 1013904223) & 0x7fffffff) || 1;
    }

    /**
     * Advance the LCG state and return a float in [0, 1).
     */
    private next(): number {
        this.rngState = (this.rngState * 1103515245 + 12345) & 0x7fffffff;
        return this.rngState / 0x80000000;
    }

    /**
     * Random float in [min, max).
     */
    private range(min: number, max: number): number {
        return min + this.next() * (max - min);
    }

    /**
     * Random integer in [min, max] (inclusive on both ends).
     */
    private rangeInt(min: number, max: number): number {
        return Math.floor(this.range(min, max + 1));
    }

    /**
     * Returns true if the given (x, z) point falls inside any exclusion zone.
     */
    private isExcluded(x: number, z: number, zones: ExclusionZone[]): boolean {
        return zones.some(zone => {
            const dx = x - zone.x;
            const dz = z - zone.z;
            return dx * dx + dz * dz < zone.radius * zone.radius;
        });
    }

    /**
     * Generate `count` world positions that lie within `bounds` and outside
     * every `exclusionZone`.
     */
    generatePositions(
        count: number,
        bounds: { min: number; max: number },
        exclusionZones: ExclusionZone[],
        yPos: number = 0.5
    ): { x: number; y: number; z: number }[] {
        const positions: { x: number; y: number; z: number }[] = [];
        const maxAttempts = count * 20;
        let attempts = 0;

        while (positions.length < count && attempts < maxAttempts) {
            attempts++;
            const x = this.range(bounds.min, bounds.max);
            const z = this.range(bounds.min, bounds.max);
            if (!this.isExcluded(x, z, exclusionZones)) {
                positions.push({ x, y: yPos, z });
            }
        }

        return positions;
    }

    /**
     * Generate `count` obstacle configurations within `bounds`, avoiding
     * every `exclusionZone`.  Each obstacle's `y` is set to `height / 2` so
     * its bottom face sits on the floor plane.
     */
    generateObstacles(
        count: number,
        bounds: { min: number; max: number },
        exclusionZones: ExclusionZone[]
    ): ObstacleConfig[] {
        const obstacles: ObstacleConfig[] = [];
        const maxAttempts = count * 20;
        let attempts = 0;

        while (obstacles.length < count && attempts < maxAttempts) {
            attempts++;
            const w = this.range(1, 5);
            const h = this.range(1, 4);
            const d = this.range(1, 5);
            const x = this.range(bounds.min, bounds.max);
            const z = this.range(bounds.min, bounds.max);
            if (!this.isExcluded(x, z, exclusionZones)) {
                obstacles.push({ width: w, height: h, depth: d, x, y: h / 2, z });
            }
        }

        return obstacles;
    }

    /**
     * Generate a complete environment layout — obstacles and all enemy types —
     * from the provided configuration.
     *
     * Generated obstacles are added to the exclusion zone list before enemy
     * positions are calculated, reducing the chance of enemies spawning inside
     * obstacles.
     */
    generateLayout(config: GenerationConfig): EnvironmentLayout {
        const { bounds, exclusionZones, obstacleCount, enemyCounts } = config;

        const numObstacles = this.rangeInt(obstacleCount.min, obstacleCount.max);
        const obstacles = this.generateObstacles(numObstacles, bounds, exclusionZones);

        // Extend exclusion zones with generated obstacle centres so enemies
        // are unlikely to spawn inside them.
        const spawnZones: ExclusionZone[] = [
            ...exclusionZones,
            ...obstacles.map(o => ({ x: o.x, z: o.z, radius: Math.max(o.width, o.depth) })),
        ];

        const numRegular = enemyCounts.regular
            ? this.rangeInt(enemyCounts.regular.min, enemyCounts.regular.max)
            : 0;
        const enemyPositions = this.generatePositions(numRegular, bounds, spawnZones, 0.5);

        const numElite = enemyCounts.elite
            ? this.rangeInt(enemyCounts.elite.min, enemyCounts.elite.max)
            : 0;
        const eliteEnemyPositions = this.generatePositions(numElite, bounds, spawnZones, 1.0);

        const numBoss = enemyCounts.boss ?? 0;
        const bossPositions = this.generatePositions(numBoss, bounds, spawnZones, 0.5);

        return { obstacles, enemyPositions, eliteEnemyPositions, bossPositions };
    }
}

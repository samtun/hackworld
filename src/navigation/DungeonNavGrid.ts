import type { DungeonLayout, DungeonRoom, WallSegment, RoomObstacle } from '../stages/RoomBasedDungeonGenerator';
import { CORRIDOR_WIDTH } from '../stages/RoomBasedDungeonGenerator';

/** Size of each navigation grid cell in metres. */
export const NAV_CELL_SIZE = 1;

/** A 2D grid coordinate. */
interface GridCell {
    gx: number;
    gz: number;
}

/** A waypoint in world space returned by the pathfinder. */
export interface NavWaypoint {
    x: number;
    z: number;
}

/**
 * A 2D navigation grid built from a {@link DungeonLayout}.
 *
 * Walkable cells are determined by the union of room interiors and corridor
 * areas, minus any cells blocked by walls or obstacles.
 *
 * Pathfinding uses A* with 8-directional movement (diagonal cost √2).
 */
export class DungeonNavGrid {
    /** Grid origin in world X. */
    private readonly originX: number;
    /** Grid origin in world Z. */
    private readonly originZ: number;
    /** Number of cells along X. */
    private readonly cols: number;
    /** Number of cells along Z. */
    private readonly rows: number;
    /**
     * Flat boolean array: `walkable[gz * cols + gx]`.
     * `true` = the cell is passable.
     */
    private readonly walkable: boolean[];

    constructor(layout: DungeonLayout) {
        const pad = 2; // extra cells around the bounding box
        this.originX = layout.floorBounds.minX - pad;
        this.originZ = layout.floorBounds.minZ - pad;

        const worldW = layout.floorBounds.maxX - layout.floorBounds.minX + pad * 2;
        const worldD = layout.floorBounds.maxZ - layout.floorBounds.minZ + pad * 2;

        this.cols = Math.ceil(worldW / NAV_CELL_SIZE);
        this.rows = Math.ceil(worldD / NAV_CELL_SIZE);

        // Start all cells as non-walkable
        this.walkable = new Array(this.cols * this.rows).fill(false);

        // Mark room interiors and corridors as walkable
        this.carveRooms(layout.rooms);
        this.carveCorridors(layout.rooms);

        // Block cells occupied by walls and obstacles
        this.blockWalls(layout.walls);
        this.blockObstacles(layout.obstacles);
    }

    // -------------------------------------------------------------------
    // Grid ↔ world coordinate conversions
    // -------------------------------------------------------------------

    private worldToGrid(wx: number, wz: number): GridCell {
        return {
            gx: Math.floor((wx - this.originX) / NAV_CELL_SIZE),
            gz: Math.floor((wz - this.originZ) / NAV_CELL_SIZE),
        };
    }

    private gridToWorld(gx: number, gz: number): NavWaypoint {
        return {
            x: this.originX + (gx + 0.5) * NAV_CELL_SIZE,
            z: this.originZ + (gz + 0.5) * NAV_CELL_SIZE,
        };
    }

    private inBounds(gx: number, gz: number): boolean {
        return gx >= 0 && gx < this.cols && gz >= 0 && gz < this.rows;
    }

    private isWalkable(gx: number, gz: number): boolean {
        if (!this.inBounds(gx, gz)) return false;
        return this.walkable[gz * this.cols + gx];
    }

    // -------------------------------------------------------------------
    // Grid carving helpers
    // -------------------------------------------------------------------

    /** Mark every cell that falls inside a room's rectangle as walkable. */
    private carveRooms(rooms: DungeonRoom[]): void {
        for (const room of rooms) {
            const minX = room.centerX - room.width / 2;
            const maxX = room.centerX + room.width / 2;
            const minZ = room.centerZ - room.depth / 2;
            const maxZ = room.centerZ + room.depth / 2;
            this.setRect(minX, maxX, minZ, maxZ, true);
        }
    }

    /** Mark corridor areas between adjacent rooms as walkable. */
    private carveCorridors(rooms: DungeonRoom[]): void {
        for (let i = 0; i < rooms.length - 1; i++) {
            const a = rooms[i];
            const b = rooms[i + 1];
            const corStartX = a.centerX + a.width / 2;
            const corEndX = b.centerX - b.width / 2;
            const halfCor = CORRIDOR_WIDTH / 2;
            this.setRect(corStartX, corEndX, -halfCor, halfCor, true);
        }
    }

    /** Block cells under wall segments. */
    private blockWalls(walls: WallSegment[]): void {
        for (const w of walls) {
            const halfW = w.width / 2;
            const halfD = w.depth / 2;
            this.setRect(
                w.centerX - halfW,
                w.centerX + halfW,
                w.centerZ - halfD,
                w.centerZ + halfD,
                false,
            );
        }
    }

    /** Block cells under obstacles. */
    private blockObstacles(obstacles: RoomObstacle[]): void {
        for (const obs of obstacles) {
            const halfW = obs.width / 2;
            const halfD = obs.depth / 2;
            this.setRect(
                obs.x - halfW,
                obs.x + halfW,
                obs.z - halfD,
                obs.z + halfD,
                false,
            );
        }
    }

    /** Set every grid cell that overlaps a world-space rectangle. */
    private setRect(minX: number, maxX: number, minZ: number, maxZ: number, value: boolean): void {
        const g0 = this.worldToGrid(minX, minZ);
        const g1 = this.worldToGrid(maxX, maxZ);

        const gxMin = Math.max(0, g0.gx);
        const gxMax = Math.min(this.cols - 1, g1.gx);
        const gzMin = Math.max(0, g0.gz);
        const gzMax = Math.min(this.rows - 1, g1.gz);

        for (let gz = gzMin; gz <= gzMax; gz++) {
            for (let gx = gxMin; gx <= gxMax; gx++) {
                this.walkable[gz * this.cols + gx] = value;
            }
        }
    }

    // -------------------------------------------------------------------
    // A* pathfinding
    // -------------------------------------------------------------------

    /**
     * Compute a path from `start` to `goal` in world coordinates.
     *
     * Returns an array of world-space waypoints (smoothed so redundant
     * intermediate nodes on straight runs are removed).  Returns an empty
     * array if no path exists.
     */
    findPath(startX: number, startZ: number, goalX: number, goalZ: number): NavWaypoint[] {
        const start = this.worldToGrid(startX, startZ);
        const goal = this.worldToGrid(goalX, goalZ);

        // Snap start / goal to closest walkable cell if they fall on a wall
        const snappedStart = this.nearestWalkable(start);
        const snappedGoal = this.nearestWalkable(goal);
        if (!snappedStart || !snappedGoal) return [];

        // Fast path: if start and goal are the same cell, return the goal directly
        if (snappedStart.gx === snappedGoal.gx && snappedStart.gz === snappedGoal.gz) {
            return [{ x: goalX, z: goalZ }];
        }

        const gridPath = this.astar(snappedStart, snappedGoal);
        if (gridPath.length === 0) return [];

        // Convert to world waypoints and smooth
        const worldPath = gridPath.map(c => this.gridToWorld(c.gx, c.gz));

        // Replace the last waypoint with the exact goal position
        worldPath[worldPath.length - 1] = { x: goalX, z: goalZ };

        return this.smoothPath(worldPath);
    }

    /** Find the nearest walkable cell to `cell` within a small search radius. */
    private nearestWalkable(cell: GridCell): GridCell | null {
        if (this.isWalkable(cell.gx, cell.gz)) return cell;
        // Expand in concentric rings up to 5 cells
        for (let r = 1; r <= 5; r++) {
            for (let dz = -r; dz <= r; dz++) {
                for (let dx = -r; dx <= r; dx++) {
                    if (Math.abs(dx) !== r && Math.abs(dz) !== r) continue;
                    const gx = cell.gx + dx;
                    const gz = cell.gz + dz;
                    if (this.isWalkable(gx, gz)) return { gx, gz };
                }
            }
        }
        return null;
    }

    /** Standard A* with 8-directional neighbours. */
    private astar(start: GridCell, goal: GridCell): GridCell[] {
        const key = (gx: number, gz: number) => gz * this.cols + gx;

        const gScore = new Map<number, number>();
        const fScore = new Map<number, number>();
        const cameFrom = new Map<number, number>();

        const startKey = key(start.gx, start.gz);
        const goalKey = key(goal.gx, goal.gz);

        gScore.set(startKey, 0);
        fScore.set(startKey, this.heuristic(start, goal));

        // Simple binary-heap-like open set using a sorted insertion
        const open: number[] = [startKey];
        const inOpen = new Set<number>([startKey]);

        const dirs = [
            { dx: 1, dz: 0, cost: 1 },
            { dx: -1, dz: 0, cost: 1 },
            { dx: 0, dz: 1, cost: 1 },
            { dx: 0, dz: -1, cost: 1 },
            { dx: 1, dz: 1, cost: Math.SQRT2 },
            { dx: -1, dz: 1, cost: Math.SQRT2 },
            { dx: 1, dz: -1, cost: Math.SQRT2 },
            { dx: -1, dz: -1, cost: Math.SQRT2 },
        ];

        // Safety limit
        const maxIterations = this.cols * this.rows;
        let iterations = 0;

        while (open.length > 0 && iterations < maxIterations) {
            iterations++;

            // Pick node with lowest fScore
            let bestIdx = 0;
            let bestF = fScore.get(open[0]) ?? Infinity;
            for (let i = 1; i < open.length; i++) {
                const f = fScore.get(open[i]) ?? Infinity;
                if (f < bestF) {
                    bestF = f;
                    bestIdx = i;
                }
            }
            const currentKey = open[bestIdx];
            open.splice(bestIdx, 1);
            inOpen.delete(currentKey);

            if (currentKey === goalKey) {
                return this.reconstructPath(cameFrom, goalKey);
            }

            const cx = currentKey % this.cols;
            const cz = Math.floor(currentKey / this.cols);
            const currentG = gScore.get(currentKey) ?? Infinity;

            for (const { dx, dz, cost } of dirs) {
                const nx = cx + dx;
                const nz = cz + dz;
                if (!this.isWalkable(nx, nz)) continue;

                // For diagonals, ensure both cardinal neighbours are walkable
                // to prevent cutting corners through walls
                if (dx !== 0 && dz !== 0) {
                    if (!this.isWalkable(cx + dx, cz) || !this.isWalkable(cx, cz + dz)) {
                        continue;
                    }
                }

                const nk = key(nx, nz);
                const tentG = currentG + cost;
                if (tentG < (gScore.get(nk) ?? Infinity)) {
                    cameFrom.set(nk, currentKey);
                    gScore.set(nk, tentG);
                    fScore.set(nk, tentG + this.heuristic({ gx: nx, gz: nz }, goal));
                    if (!inOpen.has(nk)) {
                        open.push(nk);
                        inOpen.add(nk);
                    }
                }
            }
        }

        return []; // No path found
    }

    /** Octile-distance heuristic (consistent for 8-dir movement). */
    private heuristic(a: GridCell, b: GridCell): number {
        const dx = Math.abs(a.gx - b.gx);
        const dz = Math.abs(a.gz - b.gz);
        return Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz);
    }

    /** Walk back through the came-from map to reconstruct the cell path. */
    private reconstructPath(cameFrom: Map<number, number>, goalKey: number): GridCell[] {
        const path: GridCell[] = [];
        let k = goalKey;
        while (k !== undefined) {
            path.push({ gx: k % this.cols, gz: Math.floor(k / this.cols) });
            const prev = cameFrom.get(k);
            if (prev === undefined) break;
            k = prev;
        }
        path.reverse();
        return path;
    }

    /**
     * Remove intermediate waypoints on collinear straight runs so the
     * enemy can move smoothly without zig-zagging through every cell.
     */
    private smoothPath(waypoints: NavWaypoint[]): NavWaypoint[] {
        if (waypoints.length <= 2) return waypoints;

        const result: NavWaypoint[] = [waypoints[0]];

        for (let i = 1; i < waypoints.length - 1; i++) {
            const prev = result[result.length - 1];
            const curr = waypoints[i];
            const next = waypoints[i + 1];

            // Keep waypoint if direction changes
            const dx1 = curr.x - prev.x;
            const dz1 = curr.z - prev.z;
            const dx2 = next.x - curr.x;
            const dz2 = next.z - curr.z;

            // Cross product – non-zero means direction changed
            if (Math.abs(dx1 * dz2 - dz1 * dx2) > 0.001) {
                result.push(curr);
            }
        }

        result.push(waypoints[waypoints.length - 1]);
        return result;
    }
}

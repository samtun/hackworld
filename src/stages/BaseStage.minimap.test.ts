import { describe, it, expect, vi } from 'vitest';
import { BaseStage } from './BaseStage';
import type { StageMinimapLayout } from './StageMinimapLayout';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { DungeonLayout, EnemySpawnPoint } from './RoomBasedDungeonGenerator';
import { EnemyType } from '../enemies/EnemyType';

/** Minimal duck-type for the CANNON.Vec3 positions passed to spawnEnemy stubs. */
interface Vec3Like { x: number; y: number; z: number; }

function makeStage(layout: StageMinimapLayout | null, teleporter?: { position: { x: number; z: number }; isActive: boolean }) {
    const stage = Object.create(BaseStage.prototype) as any;
    stage.minimapLayout = layout;
    stage.teleporter = teleporter;
    stage.dungeonRooms = [];
    stage.enemies = [];
    stage.roomEnemyMap = new Map();
    stage.roomPendingSpawnData = new Map();
    return stage as BaseStage;
}

/**
 * Build a minimal stage wired up for lazy-spawning tests.
 * Returns the stage plus a list that captures every enemy spawned.
 */
function makeSpawningStage() {
    const stage = Object.create(BaseStage.prototype) as any;
    stage.minimapLayout = null;
    stage.teleporter = undefined;
    stage.enemies = [] as any[];
    stage.roomEnemyMap = new Map<number, any[]>();
    stage.roomPendingSpawnData = new Map<number, EnemySpawnPoint[]>();
    stage.totalExpectedEnemies = 0;
    stage.navGrid = null;
    stage.dungeonRooms = [
        { id: 1, centerX: 0, centerZ: 0, width: 10, depth: 10 },
    ];

    // Stub spawnEnemy so it pushes a fake enemy object with the same fields Enemy has
    stage.spawnEnemy = vi.fn((pos: Vec3Like) => {
        stage.enemies.push({ aggroEnabled: false, spawnInactiveTimer: 0, navGrid: null, spawnedAt: pos });
    });
    stage.spawnBoss = vi.fn();
    stage.getEnemyConfig = vi.fn().mockReturnValue({});

    return stage;
}

describe('BaseStage.getMinimapLayout', () => {
    it('injects teleporter marker with active state when teleporter exists', () => {
        const stage = makeStage(
            {
                rects: [],
                bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
            },
            { position: { x: 12, z: -7 }, isActive: true },
        );

        const layout = stage.getMinimapLayout();

        expect(layout?.teleporter).toEqual({ x: 12, z: -7, active: true });
    });

    it('returns layout without teleporter when teleporter is absent', () => {
        const baseLayout: StageMinimapLayout = {
            rects: [],
            bounds: { minX: -1, maxX: 1, minZ: -1, maxZ: 1 },
        };
        const stage = makeStage(baseLayout);

        const layout = stage.getMinimapLayout();

        expect(layout).toEqual(baseLayout);
        expect(layout?.teleporter).toBeUndefined();
    });

    it('marks cleared rooms with cleared:true when all their enemies are dead', () => {
        const fakeEnemy = { id: 'e1' } as any;
        const stage = Object.create(BaseStage.prototype) as any;
        stage.teleporter = undefined;
        stage.minimapLayout = {
            rects: [
                { x: 0, z: 0, width: 10, depth: 10, kind: 'room', roomId: 1 },
                { x: 20, z: 0, width: 10, depth: 10, kind: 'room', roomId: 2 },
                { x: 10, z: 0, width: 4, depth: 4, kind: 'corridor' },
            ],
            bounds: { minX: -5, maxX: 25, minZ: -5, maxZ: 5 },
        };
        stage.dungeonRooms = [{ id: 1 }, { id: 2 }];
        // room 1 still has a living enemy; room 2's enemy is dead (not in enemies array)
        stage.enemies = [fakeEnemy];
        stage.roomPendingSpawnData = new Map();
        stage.roomEnemyMap = new Map([
            [1, [fakeEnemy]],
            [2, []],
        ]);

        const layout = stage.getMinimapLayout()!;
        const room1 = layout.rects.find((r: any) => r.roomId === 1)!;
        const room2 = layout.rects.find((r: any) => r.roomId === 2)!;
        const corridor = layout.rects.find((r: any) => r.kind === 'corridor')!;

        expect(room1.cleared).toBeUndefined();
        expect(room2.cleared).toBe(true);
        expect(corridor.cleared).toBeUndefined();
    });

    it('does not mark a room with pending spawns as cleared', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        stage.teleporter = undefined;
        stage.minimapLayout = {
            rects: [
                { x: 0, z: 0, width: 10, depth: 10, kind: 'room', roomId: 1 },
                { x: 20, z: 0, width: 10, depth: 10, kind: 'room', roomId: 2 },
            ],
            bounds: { minX: -5, maxX: 25, minZ: -5, maxZ: 5 },
        };
        stage.dungeonRooms = [{ id: 1 }, { id: 2 }];
        stage.enemies = [];
        // room 1 has been visited and cleared; room 2 still has pending spawns
        stage.roomPendingSpawnData = new Map([[2, [{ type: EnemySpawnType.Regular, x: 20, y: 0.5, z: 0 }]]]);
        stage.roomEnemyMap = new Map([
            [1, []],
            [2, []],
        ]);

        const layout = stage.getMinimapLayout()!;
        const room1 = layout.rects.find((r: any) => r.roomId === 1)!;
        const room2 = layout.rects.find((r: any) => r.roomId === 2)!;

        expect(room1.cleared).toBe(true);
        expect(room2.cleared).toBeUndefined();
    });
});

describe('BaseStage lobby return teleporter placement', () => {
    it('places the lobby return teleporter at the starting-room centre', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        stage.createLobbyReturnTeleporter = vi.fn();

        const layout = {
            spawnPosition: { x: 4, z: -3 },
            spawnElevation: 2,
        } as DungeonLayout;

        stage.createCenteredLobbyReturnTeleporter(layout, 'lobby');

        expect(stage.createLobbyReturnTeleporter).toHaveBeenCalledWith(
            expect.objectContaining({ x: 4, y: 2, z: -3 }),
            'lobby',
        );
    });

    it('places the player spawn in front of the starting-room teleporter', () => {
        const stage = Object.create(BaseStage.prototype) as any;
        stage.spawnPosition = { set: vi.fn() };

        const layout = {
            spawnPosition: { x: 4, z: -3 },
            spawnElevation: 2,
        } as DungeonLayout;

        stage.setSpawnPositionInFrontOfLobbyReturnTeleporter(layout);

        expect(stage.spawnPosition.set).toHaveBeenCalledWith(4, 2.4, -1);
    });
});

describe('BaseStage lazy enemy spawning', () => {
    it('enemies are not present before the player enters their room', () => {
        const stage = makeSpawningStage();
        stage.roomPendingSpawnData.set(1, [
            { type: EnemySpawnType.Regular, x: 3, y: 0.5, z: 3 } as EnemySpawnPoint,
        ]);
        stage.totalExpectedEnemies = 1;

        // Player is outside the room
        const player = { body: { position: { x: 100, z: 100 } } } as any;
        (stage as any).updateRoomAggro(player);

        expect(stage.enemies).toHaveLength(0);
        expect(stage.roomPendingSpawnData.size).toBe(1);
    });

    describe('BaseStage enemy type resolution', () => {
        it('uses explicit spawn enemyType when provided', () => {
            const stage = Object.create(BaseStage.prototype) as any;
            const resolved = stage.resolveEnemyTypeForSpawn({
                x: 0, y: 0, z: 0, type: EnemySpawnType.Regular, enemyType: EnemyType.Stalker,
            });
            expect(resolved).toBe(EnemyType.Stalker);
        });

        it('uses available enemy types when spawn does not specify one', () => {
            const stage = Object.create(BaseStage.prototype) as any;
            stage.getAvailableEnemyTypes = vi.fn().mockReturnValue([EnemyType.Stalker]);
            const resolved = stage.resolveEnemyTypeForSpawn({
                x: 0, y: 0, z: 0, type: EnemySpawnType.Elite,
            });
            expect(resolved).toBe(EnemyType.Stalker);
        });

        it('falls back to Brute when no enemy types are available', () => {
            const stage = Object.create(BaseStage.prototype) as any;
            stage.getAvailableEnemyTypes = vi.fn().mockReturnValue([]);
            const resolved = stage.resolveEnemyTypeForSpawn({
                x: 0, y: 0, z: 0, type: EnemySpawnType.Boss,
            });
            expect(resolved).toBe(EnemyType.Brute);
        });
    });

    it('enemies are spawned when the player enters their room', () => {
        const stage = makeSpawningStage();
        stage.roomPendingSpawnData.set(1, [
            { type: EnemySpawnType.Regular, x: 3, y: 0.5, z: 3 } as EnemySpawnPoint,
        ]);
        stage.totalExpectedEnemies = 1;

        // Player inside room 1 (centerX=0, centerZ=0, width=10, depth=10)
        const player = { body: { position: { x: 0, y: 0, z: 0 } } } as any;
        (stage as any).updateRoomAggro(player);

        expect(stage.spawnEnemy).toHaveBeenCalledTimes(1);
        expect(stage.enemies).toHaveLength(1);
        expect(stage.enemies[0].aggroEnabled).toBe(true);
        expect(stage.enemies[0].spawnInactiveTimer).toBe(0.5);
        expect(stage.roomPendingSpawnData.size).toBe(0);
    });

    it('entering the same room a second time does not re-spawn enemies', () => {
        const stage = makeSpawningStage();
        stage.roomPendingSpawnData.set(1, [
            { type: EnemySpawnType.Regular, x: 3, y: 0.5, z: 3 } as EnemySpawnPoint,
        ]);
        stage.totalExpectedEnemies = 1;

        const player = { body: { position: { x: 0, y: 0, z: 0 } } } as any;
        (stage as any).updateRoomAggro(player);
        (stage as any).updateRoomAggro(player);

        expect(stage.spawnEnemy).toHaveBeenCalledTimes(1);
        expect(stage.enemies).toHaveLength(1);
    });

    it('spawn point within 3m of player is pushed outward to exactly 3m', () => {
        const stage = makeSpawningStage();
        // Spawn point at (1, 0.5, 0) – only 1 m from player at origin
        stage.roomPendingSpawnData.set(1, [
            { type: EnemySpawnType.Regular, x: 1, y: 0.5, z: 0 } as EnemySpawnPoint,
        ]);
        stage.totalExpectedEnemies = 1;

        const player = { body: { position: { x: 0, y: 0, z: 0 } } } as any;
        (stage as any).updateRoomAggro(player);

        const spawnedPos = stage.enemies[0].spawnedAt;
        const dist = Math.sqrt(spawnedPos.x ** 2 + spawnedPos.z ** 2);
        expect(dist).toBeCloseTo(3, 4);
        // Direction is preserved (positive X)
        expect(spawnedPos.x).toBeGreaterThan(0);
        expect(spawnedPos.z).toBeCloseTo(0, 4);
    });

    it('spawn point more than 3m from player is not moved', () => {
        const stage = makeSpawningStage();
        stage.roomPendingSpawnData.set(1, [
            { type: EnemySpawnType.Regular, x: 4, y: 0.5, z: 0 } as EnemySpawnPoint,
        ]);
        stage.totalExpectedEnemies = 1;

        const player = { body: { position: { x: 0, y: 0, z: 0 } } } as any;
        (stage as any).updateRoomAggro(player);

        const spawnedPos = stage.enemies[0].spawnedAt;
        expect(spawnedPos.x).toBeCloseTo(4, 5);
        expect(spawnedPos.z).toBeCloseTo(0, 5);
    });
});

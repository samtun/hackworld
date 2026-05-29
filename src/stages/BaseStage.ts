import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Enemy } from '../enemies/Enemy';
import type { EnemyArchetypeConfig } from '../enemies/Enemy';
import { AssetManager } from '../AssetManager';
import { Teleporter } from '../Teleporter';
import { Player } from '../Player';
import { Npc } from '../npcs/Npc';
import { BossEnemy } from '../enemies/BossEnemy';
import { DungeonNavGrid } from '../navigation/DungeonNavGrid';
import { createWallMaterial, createObstacleMaterial, createFloorMaterial, updateWallUniforms } from '../WallShaderUtils';
import { EnemySpawnType } from './RoomBasedDungeonGenerator';
import type { DungeonRoom, DungeonLayout, Corridor } from './RoomBasedDungeonGenerator';
import { WALL_HEIGHT, WALL_THICKNESS, CORRIDOR_WIDTH } from './RoomBasedDungeonGenerator';
import { LootChest } from '../items/LootChest';
import { BreakableBarrel } from '../items/BreakableBarrel';
import { ElectricTrap } from '../items/ElectricTrap';
import type { StageMinimapLayout } from './StageMinimapLayout';
import { ItemDropManager } from '../items/ItemDropManager';
import { MinimapDrop } from '../items/minimap/MinimapDrop';
import type { EnemySpawnPoint } from './RoomBasedDungeonGenerator';
import { AudioManager } from '../AudioManager';
import { ModelProp } from '../ModelProp';
import { DEFAULT_ENEMY_TYPE, EnemyType } from '../enemies/EnemyType';

/**
 * Tiny Y offset applied to north/south walls (those running along X) to
 * prevent z-fighting where they overlap east/west walls at room corners.
 */
const NS_WALL_Y_OFFSET = 0.01;

/**
 * Minimum distance (in metres) between a freshly spawned enemy and the
 * player.  Spawn points closer than this are pushed radially outward.
 */
const ENEMY_SAFE_SPAWN_RADIUS = 3;

/**
 * Tolerance used when comparing distances to zero.  Spawn points that are
 * effectively at the same position as the player (dist < this value) are
 * relocated to the room centre instead of being pushed in a degenerate
 * direction.
 */
const SPAWN_DEGENERATE_DISTANCE_THRESHOLD = 0.001;

/**
 * Duration (seconds) for which freshly spawned enemies stay inactive after
 * a lazy room-entry spawn.  Gives the physics engine time to position them
 * before their AI begins chasing the player.
 */
const ENEMY_SPAWN_INACTIVE_DURATION = 0.5;

/**
 * Base class for all dungeon stages
 * Each dungeon stage should extend this and implement the load() method
 */
export abstract class BaseStage {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract environmentMap: string
    abstract spawnPosition: CANNON.Vec3;

    // Static method to get metadata without instantiation
    static getMetadata(): { id: string; name: string; description: string; requiredProgress: number } {
        throw new Error('getMetadata() must be implemented in derived class');
    }

    protected scene: THREE.Scene;
    protected physicsWorld: CANNON.World;
    protected physicsMaterial: CANNON.Material;
    protected assetManager: AssetManager;

    teleporter?: Teleporter;
    lobbyReturnTeleporter?: Teleporter;
    bodies: CANNON.Body[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    npcs: Set<Npc> = new Set<Npc>();
    lootChests: LootChest[] = [];
    breakableBarrels: BreakableBarrel[] = [];
    electricTraps: ElectricTrap[] = [];
    props: ModelProp[] = [];

    /**
     * Room definitions set by procedural stages.
     * When non-empty, BaseStage automatically manages per-room enemy aggro
     * and activates the teleporter once all enemies are defeated.
     */
    protected dungeonRooms: DungeonRoom[] = [];

    /**
     * Maps room id → enemies that belong to that room.
     * Populated lazily as the player enters each room.
     */
    protected roomEnemyMap: Map<number, Enemy[]> = new Map();

    /**
     * Maps room id → pending spawn points for rooms the player has not yet entered.
     * Entries are removed as rooms are visited and their enemies are spawned.
     */
    private roomPendingSpawnData: Map<number, EnemySpawnPoint[]> = new Map();

    /**
     * Total number of enemies expected across all rooms, counted upfront from
     * the layout.  Used by {@link checkTeleporterActivation} to guard against
     * activating the teleporter on stages with no enemies.
     */
    private totalExpectedEnemies = 0;

    /**
     * Navigation grid built from the dungeon layout.
     * Passed to each enemy so they can pathfind around walls and obstacles.
     */
    protected navGrid: DungeonNavGrid | null = null;

    /**
     * Wall materials using the transparency shader.
     * Uniforms are updated each frame so walls fade when the player is behind them.
     */
    protected wallMaterials: THREE.MeshStandardMaterial[] = [];
    private minimapLayout: StageMinimapLayout | null = null;
    private minimapVisible = false;

    /** Accumulated wall/obstacle shader time (seconds). */
    private shaderTime = 0;

    /**
     * Corridors of the current dungeon layout.
     * Needed for boss room force field placement.
     */
    private dungeonCorridors: Corridor[] = [];

    /**
     * Maps boss room id → force field data (mesh + physics body) for each
     * corridor entrance into that room.
     */
    private bossForceFields: Map<number, { mesh: THREE.Mesh; body: CANNON.Body }[]> = new Map();

    /**
     * Set of boss room ids whose force field has already been spawned.
     * Prevents re-spawning when the player re-enters an active boss room.
     */
    private bossForceFieldSpawned: Set<number> = new Set();

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material
    ) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.Instance;
    }

    /**
     * Get list of assets required by this stage
     * To be implemented by each stage
     */
    getRequiredAssets(): string[] {
        return [];
    }

    /**
     * Get the progress value that should be marked as completed when this stage
     * instance is fully cleared.
     */
    getRequiredProgress(): number {
        const stageClass = this.constructor as typeof BaseStage;
        return stageClass.getMetadata().requiredProgress;
    }

    /**
     * Load the stage - to be implemented by each stage
     */
    abstract load(): Promise<void>;

    /**
     * Load environment map from EXR file
     */
    protected async loadEnvironmentMap(): Promise<void> {
        if (!this.environmentMap) return;

        new EXRLoader().load(this.environmentMap, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            this.scene.environment = texture;
        });
    }

    /**
     * Clean up all resources
     */
    clear(): void {
        this.scene.environment = null;

        // Reset room-tracking state
        this.dungeonRooms = [];
        this.roomEnemyMap.clear();
        this.roomPendingSpawnData.clear();
        this.totalExpectedEnemies = 0;
        this.navGrid = null;
        this.minimapLayout = null;
        this.minimapVisible = false;

        // Remove all boss room force fields
        for (const fields of this.bossForceFields.values()) {
            for (const ff of fields) {
                this.scene.remove(ff.mesh);
                ff.mesh.geometry.dispose();
                (ff.mesh.material as THREE.Material).dispose();
                this.physicsWorld.removeBody(ff.body);
            }
        }
        this.bossForceFields.clear();
        this.bossForceFieldSpawned.clear();
        this.dungeonCorridors = [];

        // Dispose wall shader materials before clearing the array
        for (const mat of this.wallMaterials) {
            mat.dispose();
        }
        this.wallMaterials = [];

        // Stop and remove mixers
        for (const mixer of this.mixers) {
            mixer.stopAllAction();
        }
        this.mixers = [];

        // Remove enemies
        for (const enemy of this.enemies) {
            enemy.cleanup();
        }
        this.enemies = [];

        // Remove physics bodies
        for (const body of this.bodies) {
            this.physicsWorld.removeBody(body);
        }
        this.bodies = [];

        // Remove visual meshes
        for (const mesh of this.meshes) {
            this.scene.remove(mesh);
            const m = mesh as any;
            if (m.geometry) m.geometry.dispose();
            if (m.material) {
                if (Array.isArray(m.material)) {
                    m.material.forEach((mat: any) => mat.dispose());
                } else {
                    m.material.dispose();
                }
            }
        }
        this.meshes = [];

        // Clean up all NPCs (including teleporter)
        for (const npc of this.npcs) {
            npc.cleanup(this.scene, this.physicsWorld);
        }
        this.npcs.clear();

        // Clean up loot chests
        for (const chest of this.lootChests) {
            chest.cleanup();
        }
        this.lootChests = [];

        // Clean up breakable barrels
        for (const barrel of this.breakableBarrels) {
            barrel.cleanup();
        }
        this.breakableBarrels = [];

        // Clean up electric traps
        for (const trap of this.electricTraps) {
            trap.cleanup();
        }
        this.electricTraps = [];

        // Clean up model props
        for (const prop of this.props) {
            prop.cleanup(this.scene);
        }
        this.props = [];

        // Clear teleporter references
        this.teleporter = undefined;
        this.lobbyReturnTeleporter = undefined;
    }

    /**
     * Create a box obstacle
     */
    protected createBox(w: number, h: number, d: number, pos: CANNON.Vec3, rot?: CANNON.Quaternion): void {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos as any);
        if (rot) {
            mesh.quaternion.copy(rot as any);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
        const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
        body.addShape(shape);
        body.position.copy(pos);
        if (rot) {
            body.quaternion.copy(rot);
        }
        this.physicsWorld.addBody(body);
        this.bodies.push(body);
    }

    /**
     * Create floor collider plane
     */
    protected createFloorCollider(): void {
        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({
            mass: 0,
            material: this.physicsMaterial
        });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(floorBody);
        this.bodies.push(floorBody);
    }

    /**
     * Create teleporter
     * @param startActive When false the teleporter starts invisible and
     *                    non-interactive until {@link Teleporter.activate} is called.
     */
    protected createTeleporter(position: CANNON.Vec3, destination: string, startActive: boolean = true): void {
        this.teleporter = new Teleporter(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position,
            destination,
            startActive
        );
        // Add teleporter to npcs set so it's handled like any other NPC
        this.npcs.add(this.teleporter);
    }

    /**
     * Create a lobby return teleporter at the spawn point.
     * Always active – allows players to return to the lobby at any time.
     */
    protected createLobbyReturnTeleporter(position: CANNON.Vec3, lobbyId: string): void {
        this.lobbyReturnTeleporter = new Teleporter(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            position,
            lobbyId,
            true,
            'Return to Lobby'
        );
        this.npcs.add(this.lobbyReturnTeleporter);
    }

    /**
     * Build scene meshes and physics bodies for all obstacles in the layout.
     * Obstacles use the same transparency shader as walls so they fade when
     * the player is behind them relative to the camera.
     */
    protected buildObstaclesFromLayout(layout: DungeonLayout): void {
        for (const obs of layout.obstacles) {
            const geo = new THREE.BoxGeometry(obs.width, obs.height, obs.depth);
            const mat = createObstacleMaterial(0x555555, obs.height);
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(obs.x, obs.y, obs.z);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 1;
            this.scene.add(mesh);
            this.meshes.push(mesh);
            this.wallMaterials.push(mat);

            const shape = new CANNON.Box(
                new CANNON.Vec3(obs.width / 2, obs.height / 2, obs.depth / 2),
            );
            const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
            body.addShape(shape);
            body.position.set(obs.x, obs.y, obs.z);
            this.physicsWorld.addBody(body);
            this.bodies.push(body);
        }
    }

    /**
     * Build wall meshes and physics bodies from the layout, using the
     * transparency shader that fades walls when the player is behind them.
     */
    protected buildWallsFromLayout(layout: DungeonLayout): void {
        for (const wall of layout.walls) {
            const geo = new THREE.BoxGeometry(wall.width, wall.height, wall.depth);
            const mat = createWallMaterial(0x555555, wall.width, wall.height, wall.depth);
            const mesh = new THREE.Mesh(geo, mat);
            // N/S walls (running along X) get a tiny Y offset to avoid
            // z-fighting where they overlap with E/W walls at corners.
            const isNorthSouth = wall.width > wall.depth;
            const yOffset = isNorthSouth ? NS_WALL_Y_OFFSET : 0;
            mesh.position.set(wall.centerX, wall.centerY + yOffset, wall.centerZ);
            mesh.castShadow = false;
            mesh.receiveShadow = false;
            mesh.renderOrder = 1;
            this.scene.add(mesh);
            this.meshes.push(mesh);
            this.wallMaterials.push(mat);

            const shape = new CANNON.Box(
                new CANNON.Vec3(wall.width / 2, (wall.colliderHeight ?? wall.height) / 2, wall.depth / 2),
            );
            const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
            body.addShape(shape);
            // Keep the collider bottom flush with the visual mesh bottom so
            // any extra colliderHeight extends upward above the mesh.
            const wallBottom = wall.centerY - wall.height / 2;
            const colliderH = wall.colliderHeight ?? wall.height;
            const colliderCenterY = wallBottom + colliderH / 2;
            body.position.set(wall.centerX, colliderCenterY + yOffset, wall.centerZ);
            this.physicsWorld.addBody(body);
            this.bodies.push(body);
        }
    }

    /**
     * Build individual floor segments for each room and corridor so the floor
     * only appears underneath walkable areas.  Elevated rooms get physics
     * colliders; corridors between different elevations become ramps.
     */
    protected buildFloorFromLayout(layout: DungeonLayout, color: number = 0x0a2a0a): void {
        const floorMat = createFloorMaterial(color);
        const FLOOR_THICKNESS = 0.5;

        for (const room of layout.rooms) {
            const geo = new THREE.PlaneGeometry(room.width, room.depth);
            geo.rotateX(-Math.PI / 2);
            const mesh = new THREE.Mesh(geo, floorMat);
            mesh.position.set(room.centerX, room.elevation, room.centerZ);
            mesh.receiveShadow = true;
            this.scene.add(mesh);
            this.meshes.push(mesh);

            // Physics floor for elevated rooms
            if (room.elevation > 0) {
                const shape = new CANNON.Box(
                    new CANNON.Vec3(room.width / 2, FLOOR_THICKNESS / 2, room.depth / 2),
                );
                const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
                body.addShape(shape);
                body.position.set(room.centerX, room.elevation - FLOOR_THICKNESS / 2, room.centerZ);
                this.physicsWorld.addBody(body);
                this.bodies.push(body);
            }
        }

        for (const cor of layout.corridors) {
            const elevDiff = cor.elevationEnd - cor.elevationStart;
            const isHorizontal = cor.width > cor.depth;

            if (Math.abs(elevDiff) < 0.01) {
                // Flat corridor
                const geo = new THREE.PlaneGeometry(cor.width, cor.depth);
                geo.rotateX(-Math.PI / 2);
                const mesh = new THREE.Mesh(geo, floorMat);
                mesh.position.set(cor.centerX, cor.elevationStart, cor.centerZ);
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.meshes.push(mesh);

                // Physics floor for elevated flat corridors
                if (cor.elevationStart > 0) {
                    const shape = new CANNON.Box(
                        new CANNON.Vec3(cor.width / 2, FLOOR_THICKNESS / 2, cor.depth / 2),
                    );
                    const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
                    body.addShape(shape);
                    body.position.set(cor.centerX, cor.elevationStart - FLOOR_THICKNESS / 2, cor.centerZ);
                    this.physicsWorld.addBody(body);
                    this.bodies.push(body);
                }
            } else {
                // Ramp corridor – modify vertex Y values for the slope
                const geo = new THREE.PlaneGeometry(cor.width, cor.depth);
                geo.rotateX(-Math.PI / 2);

                const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
                const mainLen = isHorizontal ? cor.width : cor.depth;
                for (let i = 0; i < posAttr.count; i++) {
                    const axisVal = isHorizontal ? posAttr.getX(i) : posAttr.getZ(i);
                    const t = (axisVal / mainLen) + 0.5; // 0 at negative end, 1 at positive end
                    posAttr.setY(i, cor.elevationStart + t * elevDiff);
                }
                posAttr.needsUpdate = true;
                geo.computeVertexNormals();

                const mesh = new THREE.Mesh(geo, floorMat);
                mesh.position.set(cor.centerX, 0, cor.centerZ);
                mesh.receiveShadow = true;
                this.scene.add(mesh);
                this.meshes.push(mesh);

                // Physics ramp: thin box rotated to match the slope
                const slopeLen = Math.sqrt(mainLen * mainLen + elevDiff * elevDiff);
                const rampAngle = Math.atan2(elevDiff, mainLen);
                const midElev = (cor.elevationStart + cor.elevationEnd) / 2;

                const rampShape = new CANNON.Box(new CANNON.Vec3(
                    (isHorizontal ? slopeLen : cor.width) / 2,
                    FLOOR_THICKNESS / 2,
                    (isHorizontal ? cor.depth : slopeLen) / 2,
                ));
                const rampBody = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
                rampBody.addShape(rampShape);
                rampBody.position.set(cor.centerX, midElev - FLOOR_THICKNESS / 2, cor.centerZ);
                if (isHorizontal) {
                    rampBody.quaternion.setFromEuler(0, 0, rampAngle);
                } else {
                    rampBody.quaternion.setFromEuler(-rampAngle, 0, 0);
                }
                this.physicsWorld.addBody(rampBody);
                this.bodies.push(rampBody);
            }
        }
    }

    /**
     * Register all enemy spawn points defined by a procedural dungeon layout.
     * Enemies are NOT spawned immediately; each room's spawn data is stored and
     * enemies are created lazily the first time the player enters that room.
     * This keeps initial load time low and prevents enemies in adjacent rooms
     * from attacking before an encounter starts.
     *
     * A {@link DungeonNavGrid} is built from the layout so enemies can pathfind
     * around walls and obstacles instead of walking in a straight line.
     */
    protected spawnEnemiesFromLayout(layout: DungeonLayout): void {
        // Build the navigation grid once for the entire stage
        this.navGrid = new DungeonNavGrid(layout);

        // Store corridors for boss room force field placement
        this.dungeonCorridors = layout.corridors;

        for (const roomSpawns of layout.roomSpawns) {
            // Initialise an empty enemy list for every room; populated on entry
            this.roomEnemyMap.set(roomSpawns.roomId, []);

            if (roomSpawns.spawns.length > 0) {
                this.roomPendingSpawnData.set(roomSpawns.roomId, roomSpawns.spawns);
                this.totalExpectedEnemies += roomSpawns.spawns.length;
            }
        }
    }

    /**
     * Spawn regular enemy
     */
    protected spawnEnemy(
        position: CANNON.Vec3,
        spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite = EnemySpawnType.Regular,
        spawn?: EnemySpawnPoint,
        enemyType: EnemyType = DEFAULT_ENEMY_TYPE,
    ): void {
        const enemy = new Enemy(
            this.scene,
            this.physicsWorld,
            position,
            this.physicsMaterial,
            this.getEnemyConfig(spawnType, spawn),
            enemyType,
        );
        this.enemies.push(enemy);
    }

    /**
     * Spawn boss enemy
     */
    protected spawnBoss(
        position: CANNON.Vec3,
        spawn?: EnemySpawnPoint,
        enemyType: EnemyType = DEFAULT_ENEMY_TYPE,
    ): void {
        const boss = new BossEnemy(
            this.scene,
            this.physicsWorld,
            position,
            this.physicsMaterial,
            this.getBossConfig(spawn),
            enemyType,
        );
        this.enemies.push(boss);
        AudioManager.Instance.playBossSpawn();
    }

    /**
     * List enemy families that can be rolled for a spawn tier.
     * Stages can override this to restrict specific tiers (for example, only
     * Brutes for early-game regular spawns while allowing Stalkers on elites).
     * The default implementation ignores the tier and enables all known types.
     */
    protected getAvailableEnemyTypes(spawnType: EnemySpawnType): readonly EnemyType[] {
        void spawnType;
        return [EnemyType.Brute, EnemyType.Stalker];
    }

    /**
     * Resolve the enemy family for an individual spawn point.
     * Priority: explicit {@link EnemySpawnPoint.enemyType}, then random choice
     * from {@link getAvailableEnemyTypes}, then a brute fallback.
     */
    private resolveEnemyTypeForSpawn(spawn: EnemySpawnPoint): EnemyType {
        if (spawn.enemyType) {
            return spawn.enemyType;
        }
        const availableEnemyTypes = this.getAvailableEnemyTypes(spawn.type);
        if (availableEnemyTypes.length === 0) {
            return DEFAULT_ENEMY_TYPE;
        }
        const selectedIndex = Math.floor(Math.random() * availableEnemyTypes.length);
        return availableEnemyTypes[selectedIndex];
    }

    protected getEnemyConfig(
        _spawnType: EnemySpawnType.Regular | EnemySpawnType.Elite,
        _spawn?: EnemySpawnPoint,
    ): Partial<EnemyArchetypeConfig> {
        return {};
    }

    protected getBossConfig(_spawn?: EnemySpawnPoint): Partial<EnemyArchetypeConfig> {
        return {};
    }

    /**
     * Build loot chests from the dungeon layout.
     */
    protected buildChestsFromLayout(layout: DungeonLayout): void {
        for (const cs of layout.chestSpawns) {
            const chest = new LootChest(
                this.scene, this.physicsWorld, this.physicsMaterial,
                new CANNON.Vec3(cs.x, cs.y, cs.z),
                cs.itemQualityFactor,
            );
            this.lootChests.push(chest);
        }
    }

    /**
     * Build breakable barrels from the dungeon layout.
     */
    protected buildBarrelsFromLayout(layout: DungeonLayout): void {
        for (const bs of layout.barrelSpawns) {
            const barrel = new BreakableBarrel(
                this.scene, this.physicsWorld, this.physicsMaterial,
                new CANNON.Vec3(bs.x, bs.y, bs.z),
            );
            this.breakableBarrels.push(barrel);
        }
    }

    /**
     * Build electric traps from the dungeon layout.
     */
    protected buildTrapsFromLayout(layout: DungeonLayout): void {
        for (const ts of layout.trapSpawns) {
            const trap = new ElectricTrap(this.scene, {
                x: ts.x,
                y: ts.y,
                z: ts.z,
                width: ts.width,
                length: ts.length,
                damage: ts.damage,
                activationInterval: ts.activationInterval,
            });
            this.electricTraps.push(trap);
        }
    }

    protected setMinimapLayout(layout: StageMinimapLayout | null, visible: boolean): void {
        this.minimapLayout = layout;
        this.minimapVisible = visible;
    }

    protected buildMinimapDropFromLayout(layout: DungeonLayout): void {
        if (!layout.mapItemSpawn) return;
        const pos = layout.mapItemSpawn;
        ItemDropManager.Instance.addDrop(new MinimapDrop(this.scene, new CANNON.Vec3(pos.x, pos.y, pos.z)));
    }

    revealMinimap(): void {
        this.minimapVisible = true;
    }

    getMinimapLayout(): StageMinimapLayout | null {
        if (!this.minimapLayout) return null;

        const clearedRoomIds = this.computeClearedRoomIds();

        const rects = this.minimapLayout.rects.map(rect => {
            if (rect.kind === 'room' && rect.roomId !== undefined && clearedRoomIds.has(rect.roomId)) {
                return { ...rect, cleared: true };
            }
            return rect;
        });

        const layout: StageMinimapLayout = { ...this.minimapLayout, rects };

        if (!this.teleporter) return layout;
        return {
            ...layout,
            teleporter: {
                x: this.teleporter.position.x,
                z: this.teleporter.position.z,
                active: this.teleporter.isActive,
            },
        };
    }

    /**
     * Compute the set of room IDs that have been cleared (no living enemies).
     * Rooms that never had enemy spawns are considered cleared immediately.
     * Rooms whose enemies have not yet been spawned (player never entered) are
     * never considered cleared.
     * Only meaningful when a procedural dungeon layout is active.
     */
    private computeClearedRoomIds(): Set<number> {
        if (!this.dungeonRooms || this.dungeonRooms.length === 0) return new Set();

        const aliveEnemies = new Set(this.enemies ?? []);
        const cleared = new Set<number>();

        for (const room of this.dungeonRooms) {
            // Rooms with pending spawns have not been visited yet – not cleared
            if (this.roomPendingSpawnData.has(room.id)) continue;

            const roomEnemies = this.roomEnemyMap?.get(room.id) ?? [];
            if (roomEnemies.every(e => !aliveEnemies.has(e))) {
                cleared.add(room.id);
            }
        }

        return cleared;
    }

    isMinimapVisible(): boolean {
        return this.minimapVisible;
    }

    /**
     * Update teleporter particles, NPC animations, mixers, and – when a
     * procedural room layout is active – room-based enemy aggro, automatic
     * teleporter activation, and wall transparency shader uniforms.
     */
    update(dt: number, player: Player, _anyMenuOpen: boolean, cameraPosition?: THREE.Vector3): void {
        if (this.teleporter) {
            this.teleporter.update(dt);
        }

        // Update mixers
        for (const npc of this.npcs) {
            npc.update(dt);
        }

        for (const mixer of this.mixers) {
            mixer.update(dt);
        }

        for (const prop of this.props) {
            prop.update(dt);
        }

        // Update barrel destruction animations
        for (const barrel of this.breakableBarrels) {
            barrel.update(dt);
        }

        // Update electric traps (damage, particles, activation)
        for (const trap of this.electricTraps) {
            trap.update(dt, player, this.enemies);
        }

        if (this.dungeonRooms.length > 0) {
            this.updateRoomAggro(player);
            this.checkTeleporterActivation();

            // Update wall transparency shader with player and camera positions
            if (cameraPosition && this.wallMaterials.length > 0) {
                this.shaderTime += dt;
                updateWallUniforms(this.wallMaterials, player.position, cameraPosition, this.shaderTime);
            }
        }
    }

    /**
     * Spawn enemies for a room the first time the player enters it.
     * Any spawn point within {@link ENEMY_SAFE_SPAWN_RADIUS} of the player is
     * pushed radially outward to that distance, preventing instant attacks while
     * preserving all precomputed obstacle/trap avoidance from the generator.
     */
    private spawnPendingEnemiesForRoom(room: DungeonRoom, spawns: EnemySpawnPoint[], playerPos: CANNON.Vec3): void {
        const roomEnemies: Enemy[] = [];

        for (const spawn of spawns) {
            let sx = spawn.x;
            let sz = spawn.z;

            // Push spawn point away from player if it falls within the safe radius
            const dx = sx - playerPos.x;
            const dz = sz - playerPos.z;
            const dist = Math.sqrt(dx * dx + dz * dz);

            if (dist < ENEMY_SAFE_SPAWN_RADIUS) {
                if (dist < SPAWN_DEGENERATE_DISTANCE_THRESHOLD) {
                    // Degenerate case: enemy would spawn on top of player – offset to room centre
                    sx = room.centerX;
                    sz = room.centerZ + ENEMY_SAFE_SPAWN_RADIUS;
                } else {
                    const scale = ENEMY_SAFE_SPAWN_RADIUS / dist;
                    sx = playerPos.x + dx * scale;
                    sz = playerPos.z + dz * scale;
                }
            }

            const pos = new CANNON.Vec3(sx, spawn.y, sz);
            const countBefore = this.enemies.length;
            const enemyType = this.resolveEnemyTypeForSpawn(spawn);

            if (spawn.type === EnemySpawnType.Regular || spawn.type === EnemySpawnType.Elite) {
                this.spawnEnemy(pos, spawn.type, spawn, enemyType);
            } else if (spawn.type === EnemySpawnType.Boss) {
                this.spawnBoss(pos, spawn, enemyType);
            }

            if (this.enemies.length > countBefore) {
                const enemy = this.enemies[this.enemies.length - 1];
                // Enable aggro so the enemy tracks the player, but hold it
                // inactive for a brief period so it is positioned before engaging.
                enemy.aggroEnabled = true;
                enemy.spawnInactiveTimer = ENEMY_SPAWN_INACTIVE_DURATION;
                enemy.navGrid = this.navGrid;
                enemy.breakableBarrels = this.breakableBarrels;
                roomEnemies.push(enemy);
            }
        }

        this.roomEnemyMap.set(room.id, roomEnemies);
    }

    /**
     * Spawn enemies for any room the player has just entered (if not already
     * spawned) and enable aggro for all enemies in the current room.
     * Once aggro is enabled it is never revoked, so enemies continue chasing
     * even if the player retreats.
     * Boss rooms additionally spawn a blocking force field on entry and remove
     * it once all boss room enemies are defeated.
     */
    private updateRoomAggro(player: Player): void {
        const px = player.body.position.x;
        const pz = player.body.position.z;

        for (const room of this.dungeonRooms) {
            const inRoom =
                Math.abs(px - room.centerX) <= room.width / 2 &&
                Math.abs(pz - room.centerZ) <= room.depth / 2;

            if (!inRoom) continue;

            // Lazily spawn enemies the first time the player enters this room
            const pendingSpawns = this.roomPendingSpawnData.get(room.id);
            if (pendingSpawns) {
                this.spawnPendingEnemiesForRoom(room, pendingSpawns, player.body.position);
                this.roomPendingSpawnData.delete(room.id);
            }

            const roomEnemies = this.roomEnemyMap.get(room.id) ?? [];
            for (const enemy of roomEnemies) {
                if (!enemy.aggroEnabled) {
                    enemy.aggroEnabled = true;
                }
            }

            // Boss rooms: spawn a force field on first entry, remove when cleared
            if (room.isFinal) {
                if (!this.bossForceFieldSpawned.has(room.id)) {
                    this.spawnBossRoomForceField(room);
                    this.bossForceFieldSpawned.add(room.id);
                }

                // Remove force field once all boss room enemies are defeated
                if (
                    this.bossForceFields.has(room.id) &&
                    !this.roomPendingSpawnData.has(room.id) &&
                    roomEnemies.every(e => !this.enemies.includes(e))
                ) {
                    this.removeBossRoomForceField(room.id);
                }
            }
        }
    }

    /**
     * Spawn semi-transparent red force field barriers at every corridor entrance
     * of the given boss room, preventing the player from leaving until the boss
     * is defeated.
     */
    private spawnBossRoomForceField(room: DungeonRoom): void {
        const fields: { mesh: THREE.Mesh; body: CANNON.Body }[] = [];
        const ffHeight = WALL_HEIGHT * 2; // tall enough to block jumping
        const ffThickness = WALL_THICKNESS;

        const corridors = this.dungeonCorridors.filter(
            c => c.fromRoomId === room.id || c.toRoomId === room.id,
        );

        for (const cor of corridors) {
            const isHorizontal = cor.width > cor.depth;
            let ffW: number, ffH: number, ffD: number;
            let ffX: number, ffY: number, ffZ: number;

            if (isHorizontal) {
                // Corridor runs east-west – barrier blocks in X
                ffW = ffThickness;
                ffH = ffHeight;
                ffD = CORRIDOR_WIDTH;
                ffZ = cor.centerZ;
                // Place at the room wall boundary
                ffX = cor.centerX < room.centerX
                    ? room.centerX - room.width / 2  // corridor is to the west
                    : room.centerX + room.width / 2; // corridor is to the east
                ffY = room.elevation + ffH / 2;
            } else {
                // Corridor runs north-south – barrier blocks in Z
                ffW = CORRIDOR_WIDTH;
                ffH = ffHeight;
                ffD = ffThickness;
                ffX = cor.centerX;
                // Place at the room wall boundary
                ffZ = cor.centerZ < room.centerZ
                    ? room.centerZ - room.depth / 2  // corridor is to the north
                    : room.centerZ + room.depth / 2; // corridor is to the south
                ffY = room.elevation + ffH / 2;
            }

            // Visual mesh – semi-transparent red
            const geo = new THREE.BoxGeometry(ffW, ffH, ffD);
            const mat = new THREE.MeshStandardMaterial({
                color: 0xff2222,
                transparent: true,
                opacity: 0.45,
                depthWrite: false,
            });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(ffX, ffY, ffZ);
            this.scene.add(mesh);

            // Physics body
            const shape = new CANNON.Box(new CANNON.Vec3(ffW / 2, ffH / 2, ffD / 2));
            const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
            body.addShape(shape);
            body.position.set(ffX, ffY, ffZ);
            this.physicsWorld.addBody(body);

            fields.push({ mesh, body });
        }

        this.bossForceFields.set(room.id, fields);
    }

    /**
     * Remove the force field barriers for the given boss room and dispose their
     * resources.
     */
    private removeBossRoomForceField(roomId: number): void {
        const fields = this.bossForceFields.get(roomId);
        if (!fields) return;

        for (const ff of fields) {
            this.scene.remove(ff.mesh);
            ff.mesh.geometry.dispose();
            (ff.mesh.material as THREE.Material).dispose();
            this.physicsWorld.removeBody(ff.body);
        }
        this.bossForceFields.delete(roomId);
    }

    /**
     * Activate the teleporter once every enemy in the stage has been defeated.
     *
     * With lazy enemy spawning the teleporter must not activate while unvisited
     * rooms still have pending spawns.  World.ts removes dead enemies from
     * `stage.enemies` after cleanup, so the correct signal is:
     * - no rooms with pending spawns remain (all rooms have been visited), AND
     * - `enemies.length === 0` (all spawned enemies have been killed).
     * A guard on `totalExpectedEnemies > 0` prevents activation on empty stages.
     */
    private checkTeleporterActivation(): void {
        if (!this.teleporter || this.teleporter.isActive) return;
        if (this.totalExpectedEnemies === 0) return;
        if (this.roomPendingSpawnData.size === 0 && this.enemies.length === 0) {
            AudioManager.Instance.playStageCleared();
            this.teleporter.activate();
        }
    }
}

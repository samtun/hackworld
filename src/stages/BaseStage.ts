import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Enemy } from '../enemies/Enemy';
import { LargeEnemy } from '../enemies/LargeEnemy';
import { AssetManager } from '../AssetManager';
import { Teleporter } from '../Teleporter';
import { Player } from '../Player';
import { Npc } from '../npcs/Npc';
import { BossEnemy } from '../enemies/BossEnemy';
import type { DungeonRoom, DungeonLayout } from './RoomBasedDungeonGenerator';

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
    bodies: CANNON.Body[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    npcs: Set<Npc> = new Set<Npc>();

    /**
     * Room definitions set by procedural stages.
     * When non-empty, BaseStage automatically manages per-room enemy aggro
     * and activates the teleporter once all enemies are defeated.
     */
    protected dungeonRooms: DungeonRoom[] = [];

    /**
     * Maps room id → enemies that belong to that room.
     * Populated by {@link spawnEnemiesFromLayout}.
     */
    protected roomEnemyMap: Map<number, Enemy[]> = new Map();

    /**
     * Total number of enemies spawned for this stage load.
     * Used by {@link checkTeleporterActivation} to detect the moment all
     * enemies have been killed and cleaned up (enemies array becomes empty).
     */
    private totalEnemiesSpawned = 0;

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
        this.totalEnemiesSpawned = 0;

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

        // Clear teleporter reference
        this.teleporter = undefined;
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
     * Build scene meshes and physics bodies for all obstacles in the layout.
     */
    protected buildObstaclesFromLayout(layout: DungeonLayout): void {
        for (const obs of layout.obstacles) {
            this.createBox(obs.width, obs.height, obs.depth, new CANNON.Vec3(obs.x, obs.y, obs.z));
        }
    }

    /**
     * Spawn all enemies defined by a procedural dungeon layout and register
     * them with their corresponding room so that room-based aggro can be applied.
     * Enemies start with {@link Enemy.aggroEnabled} = false and are enabled
     * individually when the player enters their room.
     */
    protected spawnEnemiesFromLayout(layout: DungeonLayout): void {
        for (const roomSpawns of layout.roomSpawns) {
            const roomEnemies: Enemy[] = [];

            for (const spawn of roomSpawns.spawns) {
                const pos = new CANNON.Vec3(spawn.x, spawn.y, spawn.z);
                const countBefore = this.enemies.length;

                if (spawn.type === 'regular') {
                    this.spawnEnemy(pos);
                } else if (spawn.type === 'large') {
                    this.spawnLargeEnemy(pos);
                } else if (spawn.type === 'boss') {
                    this.spawnBoss(pos);
                }

                // Verify the spawn added an enemy before accessing it
                if (this.enemies.length > countBefore) {
                    const enemy = this.enemies[this.enemies.length - 1];
                    enemy.aggroEnabled = false;
                    roomEnemies.push(enemy);
                    this.totalEnemiesSpawned++;
                }
            }

            this.roomEnemyMap.set(roomSpawns.roomId, roomEnemies);
        }
    }

    /**
     * Spawn regular enemy
     */
    protected spawnEnemy(position: CANNON.Vec3): void {
        const enemy = new Enemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(enemy);
    }

    /**
     * Spawn large enemy
     */
    protected spawnLargeEnemy(position: CANNON.Vec3): void {
        const largeEnemy = new LargeEnemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(largeEnemy);
    }

    /**
     * Spawn boss enemy
     */
    protected spawnBoss(position: CANNON.Vec3): void {
        const boss = new BossEnemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(boss);
    }

    /**
     * Update teleporter particles, NPC animations, mixers, and – when a
     * procedural room layout is active – room-based enemy aggro and automatic
     * teleporter activation.
     */
    update(dt: number, player: Player, _anyMenuOpen: boolean): void {
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

        if (this.dungeonRooms.length > 0) {
            this.updateRoomAggro(player);
            this.checkTeleporterActivation();
        }
    }

    /**
     * Enable aggro for every enemy in the room that the player is currently
     * standing in.  Once enabled, aggro is never revoked so enemies continue
     * chasing even if the player retreats.
     */
    private updateRoomAggro(player: Player): void {
        const px = player.body.position.x;
        const pz = player.body.position.z;

        for (const room of this.dungeonRooms) {
            const inRoom =
                Math.abs(px - room.centerX) <= room.width / 2 &&
                Math.abs(pz - room.centerZ) <= room.depth / 2;

            if (!inRoom) continue;

            const roomEnemies = this.roomEnemyMap.get(room.id) ?? [];
            for (const enemy of roomEnemies) {
                if (!enemy.aggroEnabled) {
                    enemy.aggroEnabled = true;
                }
            }
        }
    }

    /**
     * Activate the teleporter once every enemy in the stage has been defeated.
     *
     * World.ts removes dead enemies from `stage.enemies` after cleanup, so the
     * correct signal is `enemies.length === 0` combined with a guard that
     * confirms at least one enemy was spawned (to avoid activating on empty stages).
     */
    private checkTeleporterActivation(): void {
        if (!this.teleporter || this.teleporter.isActive) return;
        if (this.totalEnemiesSpawned === 0) return;
        if (this.enemies.length === 0) {
            this.teleporter.activate();
        }
    }
}

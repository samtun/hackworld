import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { RapierPhysics } from '../physics/RapierPhysics';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Enemy } from '../enemies/Enemy';
import { LargeEnemy } from '../enemies/LargeEnemy';
import { AssetManager } from '../AssetManager';
import { Teleporter } from '../Teleporter';
import { Player } from '../Player';
import { Npc } from '../npcs/Npc';

/**
 * Base class for all dungeon stages
 * Each dungeon stage should extend this and implement the load() method
 */
export abstract class BaseStage {
    abstract id: string;
    abstract name: string;
    abstract description: string;
    abstract environmentMap: string
    abstract spawnPosition: THREE.Vector3;

    // Static method to get metadata without instantiation
    static getMetadata(): { id: string; name: string; description: string; stageIndex: number } {
        throw new Error('getMetadata() must be implemented in derived class');
    }

    protected scene: THREE.Scene;
    protected physicsWorld: RAPIER.World;
    protected physicsMaterial: any; // Temporary for Enemy and Npc compatibility
    protected assetManager: AssetManager;

    teleporter?: Teleporter;
    bodies: RAPIER.RigidBody[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    npcs: Set<Npc> = new Set<Npc>();

    constructor(
        scene: THREE.Scene,
        physicsWorld: RAPIER.World,
        physicsMaterial: any // Temporary for Enemy and Npc compatibility
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
        const physics = RapierPhysics.Instance;
        for (const body of this.bodies) {
            physics.removeBody(body);
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
    protected createBox(w: number, h: number, d: number, pos: THREE.Vector3, rot?: THREE.Quaternion): void {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos);
        if (rot) {
            mesh.quaternion.copy(rot);
        }
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);

        const physics = RapierPhysics.Instance;
        const body = physics.createStaticBody(pos, rot);
        physics.addBoxCollider(body, new THREE.Vector3(w / 2, h / 2, d / 2));
        this.bodies.push(body);
    }

    /**
     * Create floor collider plane
     */
    protected createFloorCollider(): void {
        const FLOOR_SIZE = 1000; // Size of the floor plane in units
        const FLOOR_THICKNESS = 2.0; // Thickness of the floor collider
        
        const physics = RapierPhysics.Instance;
        // Create floor so that the TOP surface is at y=0
        const body = physics.createStaticBody(new THREE.Vector3(0, -FLOOR_THICKNESS, 0));
        
        // Create a large thin box collider for the floor (half extents)
        // Y extent is small (thickness), X and Z are large (floor size)
        const halfExtents = new THREE.Vector3(FLOOR_SIZE, FLOOR_THICKNESS, FLOOR_SIZE);
        physics.addBoxCollider(body, halfExtents);
        this.bodies.push(body);
    }

    /**
     * Create teleporter
     */
    protected createTeleporter(position: THREE.Vector3, destination: string): void {
        const pos = new THREE.Vector3(position.x, position.y, position.z);
        this.teleporter = new Teleporter(
            this.scene,
            this.physicsWorld,
            this.physicsMaterial,
            pos,
            destination
        );
        // Add teleporter to npcs set so it's handled like any other NPC
        this.npcs.add(this.teleporter);
    }

    /**
     * Spawn regular enemy
     */
    protected spawnEnemy(position: THREE.Vector3): void {
        const pos = new THREE.Vector3(position.x, position.y, position.z);
        const enemy = new Enemy(this.scene, this.physicsWorld, pos);
        this.enemies.push(enemy);
    }

    /**
     * Spawn large enemy
     */
    protected spawnLargeEnemy(position: THREE.Vector3): void {
        const pos = new THREE.Vector3(position.x, position.y, position.z);
        const largeEnemy = new LargeEnemy(this.scene, this.physicsWorld, pos);
        this.enemies.push(largeEnemy);
    }

    /**
     * Update teleporter particles
     */
    update(dt: number, _: Player): void {
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
    }

}

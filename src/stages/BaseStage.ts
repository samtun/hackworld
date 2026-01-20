import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import * as CANNON from 'cannon-es'; // Temporary for Enemy and Npc compatibility
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
    protected physicsMaterial: CANNON.Material; // Temporary for Enemy and Npc compatibility
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
        physicsMaterial: CANNON.Material // Temporary for Enemy and Npc compatibility
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
            npc.cleanup(this.scene, this.physicsWorld as any); // NPCs still use CANNON types
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
        const physics = RapierPhysics.Instance;
        const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
        const body = physics.createStaticBody(new THREE.Vector3(0, 0, 0), rotation);
        
        // Create a large box collider to simulate the floor plane
        const halfExtents = new THREE.Vector3(1000, 0.1, 1000);
        physics.addBoxCollider(body, halfExtents, new THREE.Vector3(0, -0.1, 0));
        this.bodies.push(body);
    }

    /**
     * Create teleporter
     */
    protected createTeleporter(position: THREE.Vector3, destination: string): void {
        // Convert THREE.Vector3 to CANNON.Vec3 for backward compatibility with Teleporter
        const cannonPos = new CANNON.Vec3(position.x, position.y, position.z);
        this.teleporter = new Teleporter(
            this.scene,
            this.physicsWorld as any, // Teleporter still uses CANNON types
            this.physicsMaterial,
            cannonPos,
            destination
        );
        // Add teleporter to npcs set so it's handled like any other NPC
        this.npcs.add(this.teleporter);
    }

    /**
     * Spawn regular enemy
     */
    protected spawnEnemy(position: THREE.Vector3): void {
        // Convert THREE.Vector3 to CANNON.Vec3 for backward compatibility with Enemy
        const cannonPos = new CANNON.Vec3(position.x, position.y, position.z);
        const enemy = new Enemy(this.scene, this.physicsWorld as any, cannonPos);
        this.enemies.push(enemy);
    }

    /**
     * Spawn large enemy
     */
    protected spawnLargeEnemy(position: THREE.Vector3): void {
        // Convert THREE.Vector3 to CANNON.Vec3 for backward compatibility with LargeEnemy
        const cannonPos = new CANNON.Vec3(position.x, position.y, position.z);
        const largeEnemy = new LargeEnemy(this.scene, this.physicsWorld as any, cannonPos);
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

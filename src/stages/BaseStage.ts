import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader.js';
import { Enemy } from '../enemies/Enemy';
import { LargeEnemy } from '../enemies/LargeEnemy';
import { AssetManager } from '../AssetManager';
import { Portal } from '../Portal';
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
    abstract spawnPosition: CANNON.Vec3;

    // Static method to get metadata without instantiation
    static getMetadata(): { id: string; name: string; description: string; stageIndex?: number } {
        throw new Error('getMetadata() must be implemented in derived class');
    }

    protected scene: THREE.Scene;
    protected physicsWorld: CANNON.World;
    protected physicsMaterial: CANNON.Material;
    protected assetManager: AssetManager;

    portal?: Portal;
    bodies: CANNON.Body[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    npcs: Set<Npc> = new Set<Npc>();

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

        for (const npc of this.npcs) {
            npc.cleanup(this.scene, this.physicsWorld);
        }

        // Remove portal if exists
        if (this.portal) {
            this.portal.cleanup(this.scene);
            this.portal = undefined;
        }
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
     * Create portal
     */
    protected createPortal(position: CANNON.Vec3, color: number, destination: string): void {
        this.portal = new Portal(this.scene, position, color, destination);
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
     * Update portal particles
     */
    update(dt: number, _: Player): void {
        if (this.portal) {
            this.portal.update(dt);
        }

        // Update mixers
        for (const npc of this.npcs) {
            npc.update(dt);
        }

        for (const mixer of this.mixers) {
            mixer.update(dt);
        }
    }

    /**
     * Check if player is near portal
     */
    checkPortalInteraction(playerPosition: THREE.Vector3): string | null {
        if (this.portal) {
            const dist = playerPosition.distanceTo(this.portal.mesh.position);
            if (dist < 1.5) {
                return this.portal.destination || null;
            }
        }
        return null;
    }
}

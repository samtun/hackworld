import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../enemies/Enemy';
import { LargeEnemy } from '../enemies/LargeEnemy';
import { AssetManager } from '../AssetManager';
import { Portal } from '../Portal';

/**
 * Base class for all dungeon stages
 * Each dungeon stage should extend this and implement the load() method
 */
export abstract class BaseDungeon {
    abstract id: string;
    abstract name: string;
    abstract description: string;

    // Static method to get metadata without instantiation
    static getMetadata(): { id: string; name: string; description: string } {
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

    constructor(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        physicsMaterial: CANNON.Material
    ) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.getInstance();
    }

    /**
     * Load the dungeon - to be implemented by each stage
     */
    abstract load(): void;

    /**
     * Clean up all resources
     */
    clear(): void {
        // Stop and remove mixers
        for (const mixer of this.mixers) {
            mixer.stopAllAction();
        }
        this.mixers = [];

        // Remove enemies
        for (const enemy of this.enemies) {
            this.scene.remove(enemy.mesh);
            this.physicsWorld.removeBody(enemy.body);
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

        // Remove portal if exists
        if (this.portal) {
            this.portal.cleanup(this.scene);
            this.portal = undefined;
        }
    }

    /**
     * Create a box obstacle
     */
    protected createBox(w: number, h: number, d: number, pos: CANNON.Vec3): void {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: 0x555555 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.copy(pos as any);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.scene.add(mesh);
        this.meshes.push(mesh);

        const shape = new CANNON.Box(new CANNON.Vec3(w / 2, h / 2, d / 2));
        const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
        body.addShape(shape);
        body.position.copy(pos);
        this.physicsWorld.addBody(body);
        this.bodies.push(body);
    }

    /**
     * Create floor
     */
    protected createFloor(size: number, color: number): void {
        const floorGeo = new THREE.PlaneGeometry(size, size);
        const floorMat = new THREE.MeshStandardMaterial({ color });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
        this.meshes.push(floorMesh);

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
    update(deltaTime: number): void {
        if (this.portal) {
            this.portal.update(deltaTime);
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

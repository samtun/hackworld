import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from './Enemy';
import { LargeEnemy } from './LargeEnemy';
import { Player } from './Player';
import { AssetManager } from './AssetManager';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    portalMesh!: THREE.Mesh;
    portalMesh2?: THREE.Mesh; // Second portal for dungeon2
    bodies: CANNON.Body[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    physicsMaterial: CANNON.Material;
    assetManager: AssetManager;

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;
        this.assetManager = AssetManager.getInstance();

        // Preload all assets before starting
        this.preloadAssets().then(() => {
            // Start in Lobby after assets are loaded
            this.loadLobby();
        });
    }

    /**
     * Preload all assets used in all scenes
     */
    async preloadAssets(): Promise<void> {
        const assetsToPreload = [
            'models/trader_weapons.glb',
            'models/monster.glb',
            // Weapon models (used by player)
            'models/sword.glb',
            'models/double_sword.glb',
            'models/lance.glb',
            'models/hammer.glb'
        ];

        await this.assetManager.preloadAll(assetsToPreload);
    }

    clear() {
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
        if (this.portalMesh) {
            this.scene.remove(this.portalMesh);
        }
        if (this.portalMesh2) {
            this.scene.remove(this.portalMesh2);
            this.portalMesh2 = undefined;
        }
    }

    loadLobby() {
        this.clear();
        console.log("Loading Lobby...");

        // Floor
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const floorMesh = new THREE.Mesh(floorGeo, floorMat);
        floorMesh.rotation.x = -Math.PI / 2;
        floorMesh.receiveShadow = true;
        this.scene.add(floorMesh);
        this.meshes.push(floorMesh);

        const floorShape = new CANNON.Plane();
        const floorBody = new CANNON.Body({
            mass: 0, // Static
            material: this.physicsMaterial
        });
        floorBody.addShape(floorShape);
        floorBody.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
        this.physicsWorld.addBody(floorBody);
        this.bodies.push(floorBody);

        // Portal to Dungeon 1
        const portalGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        this.portalMesh.position.set(5, 0.05, 5);
        this.portalMesh.userData = { destination: 'dungeon' }; // Mark destination
        this.scene.add(this.portalMesh);

        // Portal to Dungeon 2
        const portal2Geo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        const portal2Mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.5 }); // Magenta portal
        this.portalMesh2 = new THREE.Mesh(portal2Geo, portal2Mat);
        this.portalMesh2.position.set(-5, 0.05, 5);
        this.portalMesh2.userData = { destination: 'dungeon2' }; // Mark destination
        this.scene.add(this.portalMesh2);

        // Add some walls or obstacles
        this.createBox(2, 2, 2, new CANNON.Vec3(-5, 1, -5));

        // Load Trader Model from cache
        const traderGltf = this.assetManager.get('models/trader_weapons.glb');
        if (traderGltf) {
            const model = traderGltf.scene.clone(true);
            model.position.set(0, 0, -5);
            this.scene.add(model);
            this.meshes.push(model);

            // Shadows
            model.traverse((child) => {
                if ((child as THREE.Mesh).isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                }
            });

            // Animation
            if (traderGltf.animations && traderGltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(traderGltf.animations[0]);
                action.play();
                this.mixers.push(mixer);
            }

            // Physics Body (Simple Box)
            const box = new THREE.Box3().setFromObject(model);
            const size = new THREE.Vector3();
            box.getSize(size);
            const center = new THREE.Vector3();
            box.getCenter(center);

            const halfExtents = new CANNON.Vec3(size.x / 2, size.y / 2, size.z / 2);
            const shape = new CANNON.Box(halfExtents);
            const body = new CANNON.Body({ mass: 0, material: this.physicsMaterial });
            body.addShape(shape);
            body.position.set(center.x, center.y, center.z);

            this.physicsWorld.addBody(body);
            this.bodies.push(body);
        } else {
            console.warn('Trader model not preloaded');
        }
    }

    loadDungeon() {
        this.clear();
        console.log("Loading Dungeon...");

        // Darker Floor
        const floorGeo = new THREE.PlaneGeometry(40, 40);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x330000 }); // Dark Red
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

        // Portal back to Lobby
        const portalGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 }); // Blue portal
        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        this.portalMesh.position.set(-10, 0.05, -10);
        this.portalMesh.userData = { destination: 'lobby' }; // Mark destination
        this.scene.add(this.portalMesh);

        // Dungeon Obstacles
        this.createBox(4, 1, 4, new CANNON.Vec3(5, 0.5, 5));
        this.createBox(1, 4, 1, new CANNON.Vec3(-5, 2, 5));

        // Spawn Enemies
        this.spawnEnemy(new CANNON.Vec3(5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(-5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(8, 2, 8));
        
        // Spawn Large Enemies
        this.spawnLargeEnemy(new CANNON.Vec3(0, 2, 10));
        this.spawnLargeEnemy(new CANNON.Vec3(10, 2, 0));
    }

    loadDungeon2() {
        this.clear();
        console.log("Loading Dungeon 2...");

        // Different themed floor - purple/dark blue
        const floorGeo = new THREE.PlaneGeometry(50, 50);
        const floorMat = new THREE.MeshStandardMaterial({ color: 0x1a0033 }); // Dark Purple
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

        // Portal back to Lobby
        const portalGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x0000ff, transparent: true, opacity: 0.5 }); // Blue portal
        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        this.portalMesh.position.set(12, 0.05, 12);
        this.portalMesh.userData = { destination: 'lobby' }; // Mark destination
        this.scene.add(this.portalMesh);

        // Different dungeon layout with more obstacles
        this.createBox(2, 3, 2, new CANNON.Vec3(0, 1.5, 0));
        this.createBox(3, 2, 3, new CANNON.Vec3(-8, 1, -8));
        this.createBox(2, 2, 5, new CANNON.Vec3(8, 1, -8));
        this.createBox(5, 1, 2, new CANNON.Vec3(-8, 0.5, 8));

        // Spawn more enemies - harder stage
        this.spawnEnemy(new CANNON.Vec3(6, 2, 6));
        this.spawnEnemy(new CANNON.Vec3(-6, 2, 6));
        this.spawnEnemy(new CANNON.Vec3(6, 2, -6));
        this.spawnEnemy(new CANNON.Vec3(-6, 2, -6));
        this.spawnEnemy(new CANNON.Vec3(0, 2, -10));
    }

    spawnEnemy(position: CANNON.Vec3) {
        const enemy = new Enemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(enemy);
    }

    spawnLargeEnemy(position: CANNON.Vec3) {
        const largeEnemy = new LargeEnemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(largeEnemy);
    }

    update(dt: number, player: Player) {
        // Update mixers
        for (const mixer of this.mixers) {
            mixer.update(dt);
        }

        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, player);

            if (enemy.isDead) {
                // Remove dead enemies from list (visual/physics cleanup is in Enemy.die or World.clear)
                // For now, we keep them in the list but they are invisible/inactive, 
                // or we can remove them fully. Let's remove them fully to save perf.
                this.scene.remove(enemy.mesh);
                this.physicsWorld.removeBody(enemy.body);
                this.enemies.splice(i, 1);
            }
        }
    }

    createBox(w: number, h: number, d: number, pos: CANNON.Vec3) {
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

    checkPortalInteraction(playerPosition: THREE.Vector3): string | null {
        // Check primary portal
        if (this.portalMesh) {
            const dist = playerPosition.distanceTo(this.portalMesh.position);
            if (dist < 1.5) {
                return this.portalMesh.userData.destination || 'dungeon';
            }
        }

        // Check secondary portal if it exists
        if (this.portalMesh2) {
            const dist2 = playerPosition.distanceTo(this.portalMesh2.position);
            if (dist2 < 1.5) {
                return this.portalMesh2.userData.destination || 'dungeon2';
            }
        }

        return null;
    }
}

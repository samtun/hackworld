import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Enemy } from './Enemy';
import { Player } from './Player';

export class World {
    scene: THREE.Scene;
    physicsWorld: CANNON.World;
    portalMesh!: THREE.Mesh;
    bodies: CANNON.Body[] = [];
    meshes: (THREE.Mesh | THREE.Group | THREE.Object3D)[] = [];
    enemies: Enemy[] = [];
    mixers: THREE.AnimationMixer[] = [];
    physicsMaterial: CANNON.Material;

    constructor(scene: THREE.Scene, physicsWorld: CANNON.World, physicsMaterial: CANNON.Material) {
        this.scene = scene;
        this.physicsWorld = physicsWorld;
        this.physicsMaterial = physicsMaterial;

        // Start in Lobby
        this.loadLobby();
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

        // Portal to Dungeon
        const portalGeo = new THREE.CylinderGeometry(1, 1, 0.1, 32);
        const portalMat = new THREE.MeshBasicMaterial({ color: 0x00ff00, transparent: true, opacity: 0.5 });
        this.portalMesh = new THREE.Mesh(portalGeo, portalMat);
        this.portalMesh.position.set(5, 0.05, 5);
        this.scene.add(this.portalMesh);
        // Note: Portal is special, not in general meshes list for now to avoid accidental deletion if we want to keep ref, 
        // but here we clear everything so it's fine.

        // Add some walls or obstacles
        this.createBox(2, 2, 2, new CANNON.Vec3(-5, 1, -5));

        // Load Trader Model
        const loader = new GLTFLoader();
        loader.load('models/trader_weapons.glb', (gltf) => {
            const model = gltf.scene;
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
            if (gltf.animations && gltf.animations.length > 0) {
                const mixer = new THREE.AnimationMixer(model);
                const action = mixer.clipAction(gltf.animations[0]);
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
        });
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
        this.scene.add(this.portalMesh);

        // Dungeon Obstacles
        this.createBox(4, 1, 4, new CANNON.Vec3(5, 0.5, 5));
        this.createBox(1, 4, 1, new CANNON.Vec3(-5, 2, 5));

        // Spawn Enemies
        this.spawnEnemy(new CANNON.Vec3(5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(-5, 2, -5));
        this.spawnEnemy(new CANNON.Vec3(8, 2, 8));
    }

    spawnEnemy(position: CANNON.Vec3) {
        const enemy = new Enemy(this.scene, this.physicsWorld, position, this.physicsMaterial);
        this.enemies.push(enemy);
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

    checkPortalInteraction(playerPosition: THREE.Vector3): boolean {
        // Simple distance check
        const dist = playerPosition.distanceTo(this.portalMesh.position);
        return dist < 1.5;
    }
}

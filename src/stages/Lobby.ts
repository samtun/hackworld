import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { BaseDungeon } from './BaseDungeon';

export class Lobby extends BaseDungeon {
    id = 'lobby';
    name = 'Lobby';
    description = 'Safe hub area';
    
    // Store trader position for interaction
    private traderPosition: CANNON.Vec3 = new CANNON.Vec3(0, 0, -5);

    load(): void {
        this.clear();
        console.log("Loading Lobby...");

        // Floor
        this.createFloor(20, 0x808080);

        // Portal (single portal that will show selection UI)
        this.createPortal(new CANNON.Vec3(5, 0.05, 5), 0x00ff00, 'selection');

        // Add some walls or obstacles
        this.createBox(2, 2, 2, new CANNON.Vec3(-5, 1, -5));

        // Load Trader Model from cache
        const traderGltf = this.assetManager.get('models/trader_weapons.glb');
        if (traderGltf) {
            const model = traderGltf.scene;
            model.position.set(0, 0, -5);
            this.scene.add(model);
            this.meshes.push(model);

            // Shadows
            model.traverse((child) => {
                if ((child as any).isMesh) {
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

    /**
     * Check if player is near trader
     */
    checkTraderInteraction(playerPosition: THREE.Vector3): boolean {
        const dist = playerPosition.distanceTo(
            new THREE.Vector3(this.traderPosition.x, this.traderPosition.y, this.traderPosition.z)
        );
        return dist < 2.0; // Interaction range
    }
}

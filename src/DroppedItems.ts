import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Item } from './InventoryManager';

/**
 * Represents a collectible bundle of dropped items at the player's death position
 */
export class DroppedItems {
    mesh: THREE.Mesh;
    body: CANNON.Body;
    items: Item[]; // Full item objects that were dropped
    private floatTimer: number = 0;
    private baseY: number;

    constructor(scene: THREE.Scene, world: CANNON.World, position: THREE.Vector3, items: Item[]) {
        this.items = items;
        this.baseY = position.y;

        // Create visual mesh - a glowing purple/magenta box
        const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
        const material = new THREE.MeshStandardMaterial({
            color: 0xff00ff, // Magenta
            emissive: 0xff00ff,
            emissiveIntensity: 0.5,
            transparent: true,
            opacity: 0.8
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.castShadow = true;
        scene.add(this.mesh);

        // Create physics body (kinematic - not affected by physics but can be detected)
        const shape = new CANNON.Box(new CANNON.Vec3(0.25, 0.25, 0.25));
        this.body = new CANNON.Body({
            mass: 0, // Static/kinematic body
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: shape,
            collisionResponse: false // Don't physically collide, just detect
        });
        world.addBody(this.body);
    }

    /**
     * Update the dropped items (floating animation)
     */
    update(dt: number) {
        this.floatTimer += dt;
        
        // Float up and down
        const floatOffset = Math.sin(this.floatTimer * 2) * 0.1;
        this.mesh.position.y = this.baseY + floatOffset;
        this.body.position.y = this.baseY + floatOffset;

        // Rotate slowly
        this.mesh.rotation.y += dt;

        // Pulse the glow
        const pulseFactor = 0.5 + Math.sin(this.floatTimer * 3) * 0.3;
        (this.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = pulseFactor;
    }

    /**
     * Check if player is nearby for interaction
     */
    isPlayerNearby(playerPosition: THREE.Vector3): boolean {
        const distance = this.mesh.position.distanceTo(playerPosition);
        return distance < 2.0; // 2 units interaction range
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene, world: CANNON.World) {
        scene.remove(this.mesh);
        world.removeBody(this.body);
        if (this.mesh.geometry) this.mesh.geometry.dispose();
        const material = this.mesh.material as THREE.Material;
        if (material && typeof material.dispose === 'function') {
            material.dispose();
        }
    }
}

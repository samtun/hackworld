import * as THREE from 'three';
import RAPIER from '@dimforge/rapier3d-compat';
import { ItemDrop } from '../ItemDrop';

/**
 * BoosterPackDrop entity - represents a booster pack that can be picked up from the ground
 * Displays a 3D text label and animates in a floating motion
 */
export class BoosterPackDrop extends ItemDrop {
    mesh: THREE.Group;
    textMesh: THREE.Mesh | null = null;

    private floatTimer: number = 0;
    private baseHeight: number;
    private readonly FLOAT_SPEED: number = 1.5;
    private readonly FLOAT_AMPLITUDE: number = 0.15;

    constructor(scene: THREE.Scene, position: THREE.Vector3) {
        super();
        this.baseHeight = position.y;

        // Create visual group
        this.mesh = new THREE.Group();

        // Create booster pack visual (colorful box)
        const packGeometry = new THREE.BoxGeometry(0.4, 0.6, 0.3);
        const packMaterial = new THREE.MeshStandardMaterial({
            color: 0xffaa00, // Orange/gold color
            emissive: 0xffaa00,
            emissiveIntensity: 0.4,
            metalness: 0.5,
            roughness: 0.3
        });
        const packMesh = new THREE.Mesh(packGeometry, packMaterial);
        packMesh.position.y = 0.3;
        this.mesh.add(packMesh);

        // Create text label using shared method with custom orange color
        this.textMesh = this.createTextLabel('Booster Pack', '', '#ffaa00');
        this.mesh.add(this.textMesh);

        // Position the group
        this.mesh.position.set(position.x, position.y, position.z);
        scene.add(this.mesh);
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        // Floating animation
        this.floatTimer += deltaTime;
        const floatOffset = Math.sin(this.floatTimer * this.FLOAT_SPEED) * this.FLOAT_AMPLITUDE;
        this.mesh.position.y = this.baseHeight + floatOffset;

        // Rotate the pack slowly
        this.mesh.children[0].rotation.y += deltaTime * 0.8;

        // Calculate distance to player
        const distanceToPlayer = this.mesh.position.distanceTo(playerPosition);
        const isNearPlayer = distanceToPlayer < this.PICKUP_DISTANCE;

        // Show text only when player is close enough
        if (this.textMesh) {
            this.textMesh.visible = isNearPlayer;

            // Make text label face camera (billboard effect)
            if (isNearPlayer) {
                const direction = new THREE.Vector3()
                    .subVectors(cameraPosition, this.mesh.position)
                    .normalize();
                const angle = Math.atan2(direction.x, direction.z);
                this.textMesh.rotation.y = angle;
            }
        }
    }

    cleanup(scene: THREE.Scene, _world: RAPIER.World): void {
        scene.remove(this.mesh);

        // Dispose of geometries and materials
        this.mesh.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            }
        });
    }
}

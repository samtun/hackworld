import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Visual indicator for EXP gained from defeating enemies
 * Spawns above enemy death location, floats upward, and fades out
 */
export class EXPNumber {
    mesh: THREE.Mesh;
    private timer: number = 0;
    private readonly LIFETIME: number = 1.2; // seconds
    private readonly FLOAT_SPEED: number = 1.5; // units per second
    private initialY: number;
    private textTexture: THREE.CanvasTexture;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, expAmount: number) {
        this.initialY = position.y;

        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;

        // Draw text on canvas
        context.fillStyle = '#ffffff';
        context.font = 'bold 80px "Share Tech", Arial, sans-serif';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(`+${expAmount}`, canvas.width / 2, canvas.height / 2);

        // Add outline for better visibility
        context.strokeStyle = '#000000';
        context.lineWidth = 1;
        context.strokeText(`+${expAmount}`, canvas.width / 2, canvas.height / 2);

        // Create texture from canvas
        this.textTexture = new THREE.CanvasTexture(canvas);

        // Create sprite-like plane with text
        const geometry = new THREE.PlaneGeometry(2, 1);
        const material = new THREE.MeshBasicMaterial({
            map: this.textTexture,
            transparent: true,
            opacity: 1,
            side: THREE.DoubleSide,
            depthWrite: false
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(position.x, position.y, position.z);

        // Make the mesh always face the camera (billboard effect will be applied in update)
        scene.add(this.mesh);
    }

    /**
     * Update the EXP number - float upward and fade out
     * @param dt Delta time
     * @param cameraPosition Camera position for billboard effect
     * @returns true if the entity should be removed
     */
    update(dt: number, cameraPosition: THREE.Vector3): boolean {
        this.timer += dt;

        // Float upward
        this.mesh.position.y = this.initialY + (this.timer * this.FLOAT_SPEED);

        // Fade out based on lifetime
        const progress = this.timer / this.LIFETIME;
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - progress;

        // Billboard effect - always face camera
        this.mesh.lookAt(cameraPosition);

        // Return true if lifetime exceeded
        return this.timer >= this.LIFETIME;
    }

    /**
     * Clean up resources
     */
    cleanup(scene: THREE.Scene): void {
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        (this.mesh.material as THREE.Material).dispose();
        this.textTexture.dispose();
    }
}

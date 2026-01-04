import * as THREE from 'three';
import * as CANNON from 'cannon-es';

/**
 * Configuration for a floating number display
 */
export interface FloatingNumberConfig {
    text: string;
    color: string;
    prefix?: string;
    suffix?: string;
    fontSize?: number;
    lifetime?: number;
    floatSpeed?: number;
}

/**
 * Visual indicator for floating numbers (damage, EXP, etc.)
 * Spawns above entity location, floats upward, and fades out
 */
export class FloatingNumber {
    static readonly DEFAULT_LIFETIME: number = 0.8;
    static readonly DEFAULT_FLOAT_SPEED: number = 2.0;
    static readonly DEFAULT_FONTSIZE: number = 80;

    mesh: THREE.Mesh;
    private timer: number = 0;
    private readonly lifetime: number;
    private readonly floatSpeed: number;
    private initialY: number;
    private textTexture: THREE.CanvasTexture;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, config: FloatingNumberConfig) {
        this.initialY = position.y;
        this.lifetime = config.lifetime ?? FloatingNumber.DEFAULT_LIFETIME; // seconds
        this.floatSpeed = config.floatSpeed ?? FloatingNumber.DEFAULT_FLOAT_SPEED; // units per second

        // Create canvas for text texture
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d')!;
        canvas.width = 256;
        canvas.height = 128;

        // Prepare display text
        const displayText = `${config.prefix ?? ''}${config.text}${config.suffix ?? ''}`;
        const fontSize = config.fontSize ?? FloatingNumber.DEFAULT_FONTSIZE;

        // Draw text on canvas
        context.fillStyle = config.color;
        context.font = `bold ${fontSize}px "Share Tech", Arial, sans-serif`;
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(displayText, canvas.width / 2, canvas.height / 2);

        // Add outline for better visibility
        context.strokeStyle = '#000000';
        context.lineWidth = 1;
        context.strokeText(displayText, canvas.width / 2, canvas.height / 2);

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
     * Update the floating number - float upward and fade out
     * @param dt Delta time
     * @param cameraPosition Camera position for billboard effect
     * @returns true if the entity should be removed
     */
    update(dt: number, cameraPosition: THREE.Vector3): boolean {
        this.timer += dt;

        // Float upward
        this.mesh.position.y = this.initialY + (this.timer * this.floatSpeed);

        // Fade out based on lifetime
        const progress = this.timer / this.lifetime;
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        material.opacity = 1 - progress;

        // Billboard effect - always face camera
        this.mesh.lookAt(cameraPosition);

        // Return true if lifetime exceeded
        return this.timer >= this.lifetime;
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

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
    riseTime?: number;
    floatSpeed?: number;
}

/**
 * Visual indicator for floating numbers (damage, EXP, etc.)
 * Spawns above entity location, floats upward, and fades out
 */
export class FloatingNumber {
    static readonly DEFAULT_RISE_TIME: number = 0.2;
    static readonly DEFAULT_FLOAT_SPEED: number = 2.0;
    static readonly DEFAULT_FONTSIZE: number = 80;
    static readonly HOLD_TIME: number = 0.5;
    static readonly FADE_TIME: number = 0.2;

    mesh: THREE.Mesh;
    private timer: number = 0;
    private readonly lifetime: number;
    private readonly riseTime: number;
    private readonly floatSpeed: number;
    private initialY: number;
    private textTexture: THREE.CanvasTexture;

    constructor(scene: THREE.Scene, position: CANNON.Vec3, config: FloatingNumberConfig) {
        let numberPosition = new CANNON.Vec3(position.x, position.y + 1.0, position.z);
        this.initialY = numberPosition.y;
        this.riseTime = config.riseTime ?? FloatingNumber.DEFAULT_RISE_TIME; // seconds
        this.lifetime = this.riseTime + FloatingNumber.HOLD_TIME + FloatingNumber.FADE_TIME;
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
            depthWrite: false,
            depthTest: false // Disable depth testing to render on top of everything
        });

        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(numberPosition.x, numberPosition.y, numberPosition.z);
        
        // Set high render order to ensure it renders last (on top)
        this.mesh.renderOrder = 999;

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
        if (this.timer < this.riseTime) {
            this.mesh.position.y = this.initialY + (this.timer * this.floatSpeed);
        } else {
            this.mesh.position.y = this.initialY + (this.riseTime * this.floatSpeed);
        }

        // Fade out logic
        const material = this.mesh.material as THREE.MeshBasicMaterial;
        if (this.timer < this.riseTime + FloatingNumber.HOLD_TIME) {
            material.opacity = 1;
        } else {
            const fadeProgress = (this.timer - (this.riseTime + FloatingNumber.HOLD_TIME)) / FloatingNumber.FADE_TIME;
            material.opacity = Math.max(0, 1 - fadeProgress);
        }

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

import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FloatingNumber, FloatingNumberConfig } from './FloatingNumber';

/**
 * Manager for all floating numbers in the game (damage, EXP, etc.)
 * Handles creation, updates, and cleanup
 */
export class FloatingNumberManager {
    private floatingNumbers: FloatingNumber[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Spawn a floating number at the given position
     */
    spawn(position: CANNON.Vec3, config: FloatingNumberConfig): void {
        const floatingNumber = new FloatingNumber(this.scene, position, config);
        this.floatingNumbers.push(floatingNumber);
    }

    /**
     * Spawn a damage number
     */
    spawnDamage(position: CANNON.Vec3, amount: number, color: string): void {
        this.spawn(position, {
            text: amount.toString(),
            color: color,
            fontSize: 80
        });
    }

    /**
     * Spawn an EXP number (white color with + prefix)
     */
    spawnEXP(position: CANNON.Vec3, amount: number): void {
        this.spawn(position, {
            text: amount.toString(),
            color: '#ffffff',
            prefix: '+',
            suffix: ' EXP',
            fontSize: 80,
            floatSpeed: 1.4,
            lifetime: 1.2
        });
    }

    /**
     * Update all floating numbers
     * @param dt Delta time
     * @param cameraPosition Camera position for billboard effect
     */
    update(dt: number, cameraPosition: THREE.Vector3): void {
        for (let i = this.floatingNumbers.length - 1; i >= 0; i--) {
            const floatingNumber = this.floatingNumbers[i];
            const shouldRemove = floatingNumber.update(dt, cameraPosition);

            if (shouldRemove) {
                floatingNumber.cleanup(this.scene);
                this.floatingNumbers.splice(i, 1);
            }
        }
    }

    /**
     * Clear all floating numbers
     */
    clear(): void {
        for (const floatingNumber of this.floatingNumbers) {
            floatingNumber.cleanup(this.scene);
        }
        this.floatingNumbers = [];
    }
}

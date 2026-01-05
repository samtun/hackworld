import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FloatingIndicator, FloatingIndicatorConfig } from './FloatingIndicator';

/**
 * Manager for all floating indicators in the game (damage, EXP, tech points, etc.)
 * Handles creation, updates, and cleanup
 */
export class FloatingIndicatorManager {
    private floatingIndicators: FloatingIndicator[] = [];
    private scene: THREE.Scene;

    constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    /**
     * Spawn a floating indicator at the given position
     */
    spawn(position: CANNON.Vec3, config: FloatingIndicatorConfig): void {
        const floatingIndicator = new FloatingIndicator(this.scene, position, config);
        this.floatingIndicators.push(floatingIndicator);
    }

    /**
     * Spawn a damage number
     */
    spawnDamage(position: CANNON.Vec3, amount: number, color: string): void {
        this.spawn(position, {
            text: amount.toString(),
            color: color,
            fontSize: 60,
        });
    }

    /**
     * Spawn an EXP number (white color with EXP suffix)
     */
    spawnEXP(position: CANNON.Vec3, amount: number): void {
        this.spawn(position, {
            text: amount.toString(),
            color: '#ffffff',
            suffix: ' EXP',
            fontSize: 80,
            priority: true
        });
    }

    /**
     * Spawn a tech point indicator
     */
    spawnTech(position: CANNON.Vec3): void {
        this.spawn(position, {
            text: '⬆️tech',
            color: '#00ff00',
            fontSize: 70,
            priority: true
        });
    }

    /**
     * Update all floating indicators
     * @param dt Delta time
     * @param cameraPosition Camera position for billboard effect
     */
    update(dt: number, cameraPosition: THREE.Vector3): void {
        for (let i = this.floatingIndicators.length - 1; i >= 0; i--) {
            const floatingIndicator = this.floatingIndicators[i];
            const shouldRemove = floatingIndicator.update(dt, cameraPosition);

            if (shouldRemove) {
                floatingIndicator.cleanup(this.scene);
                this.floatingIndicators.splice(i, 1);
            }
        }
    }

    /**
     * Clear all floating indicators
     */
    clear(): void {
        for (const floatingIndicator of this.floatingIndicators) {
            floatingIndicator.cleanup(this.scene);
        }
        this.floatingIndicators = [];
    }
}

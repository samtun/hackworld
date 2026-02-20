import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { FloatingIndicator, FloatingIndicatorConfig } from './FloatingIndicator';
import { ItemDrop } from './items/ItemDrop';
import { MoneyDrop } from './items/bits/MoneyDrop';
import { XDataDrop } from './items/xdata/XDataDrop';

/**
 * Manager for all floating indicators in the game (damage, EXP, tech points, etc.)
 * Handles creation, updates, and cleanup
 */
export class FloatingIndicatorManager {
    private static instance: FloatingIndicatorManager;
    private floatingIndicators: FloatingIndicator[] = [];
    private scene: THREE.Scene;

    private constructor(scene: THREE.Scene) {
        this.scene = scene;
    }

    public static getInstance(scene: THREE.Scene): FloatingIndicatorManager {
        return this.instance || (this.instance = new this(scene));
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
            text: '⇧ tech',
            color: '#FFFFFF',
            fontSize: 50,
            priority: true,
            floatSpeed: 1.0,
            holdTime: 0,
            riseTime: 0.5
        });
    }
    /**
     * Spawn a pickup indicator for auto pickup drops
     */
    spawnPickupIndicator(drop: ItemDrop): void {
        const position = new CANNON.Vec3(drop.mesh.position.x, drop.mesh.position.y, drop.mesh.position.z);
        if (drop instanceof MoneyDrop) {
            console.log('Spawning Bits pickup indicator');
            let text = `${drop.amount} Bits`;
            this.spawn(position, {
                text: text,
                color: '#FFD700',
                fontSize: 50,
                priority: false
            });
        } else if (drop instanceof XDataDrop) {
            let text = `${drop.amount} XData`;
            this.spawn(position, {
                text: text,
                color: '#8a2bbd',
                fontSize: 50,
                priority: false
            });
        }
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

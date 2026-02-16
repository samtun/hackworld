import * as THREE from 'three';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { ItemDropType } from './ItemDropType';
import { WeaponDropStrategy } from './weapons/WeaponDropStrategy';
import { ChipDropStrategy } from './chips/ChipDropStrategy';
import { CoreDropStrategy } from './cores/CoreDropStrategy';
import { BoosterPackDropStrategy } from './cards/BoosterPackDropStrategy';
import { XDataDropStrategy } from './xdata/XDataDropStrategy';
import { MoneyDropStrategy } from './bits/MoneyDropStrategy';

export interface ItemDropStrategy {
    // unique identifier for this strategy type
    readonly key: ItemDropType;
    readonly distributionWeight: number; // probability weight for this drop type
    // returns the created drop object or null when no drop occurred
    tryDrop(scene: THREE.Scene, enemy: Enemy, player: Player): ItemDrop | null;
    // perform pickup logic (add item to inventory); do NOT cleanup the drop visuals/bodies
    pickup(drop: ItemDrop, player: Player): void;
}

export class ItemDropManager {
    private static instance: ItemDropManager;
    private drops: Map<ItemDropType, ItemDrop[]> = new Map();
    private itemDropStrategies: ItemDropStrategy[] = [];

    private constructor() {
        // Register all item drop strategies
        this.registerStrategy(new WeaponDropStrategy());
        this.registerStrategy(new ChipDropStrategy());
        this.registerStrategy(new CoreDropStrategy());
        this.registerStrategy(new BoosterPackDropStrategy());
        this.registerStrategy(new XDataDropStrategy());
        this.registerStrategy(new MoneyDropStrategy());
    }

    public static get Instance(): ItemDropManager {
        return this.instance || (this.instance = new this());
    }

    registerStrategy(strategy: ItemDropStrategy) {
        this.itemDropStrategies.push(strategy);
        this.drops.set(strategy.key, []);
    }

    private selectRandomStrategy(): ItemDropStrategy | null {
        // Calculate cumulative probabilities for weighted selection
        const totalProbability = this.itemDropStrategies.reduce((sum, s) => sum + s.distributionWeight, 0);
        if (totalProbability <= 0) return null;

        const random = Math.random() * totalProbability;

        // Using cumulative distribution to select strategy is necessary to avoid bias
        let cumulative = 0;
        for (const strategy of this.itemDropStrategies) {
            cumulative += strategy.distributionWeight;
            if (random < cumulative) {
                return strategy;
            }
        }

        return null;
    }

    /**
     * Try to drop an item from enemy.
     * Selects from weighted probabilities from all drop types.
     * @returns true if an item was dropped, false otherwise
     */
    tryDropItem(scene: THREE.Scene, enemy: Enemy, player: Player): boolean {
        const strategy = this.selectRandomStrategy();
        if (!strategy) return false;

        const drop = strategy.tryDrop(scene, enemy, player);
        if (drop) {
            const arr = this.drops.get(strategy.key)!;
            arr.push(drop);
            return true;
        }

        return false;
    }

    tryDrop(key: ItemDropType, scene: THREE.Scene, enemy: Enemy, player: Player): boolean {
        const dropStrategy = this.itemDropStrategies.find(strategy => strategy.key === key);
        if (!dropStrategy) return false;

        const drop = dropStrategy.tryDrop(scene, enemy, player);
        if (drop) {
            const arr = this.drops.get(key)!;
            arr.push(drop);
            return true;
        }
        return false;
    }

    // Common update logic for all drops: call each drop.update
    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3) {
        for (const [, arr] of this.drops.entries()) {
            for (const d of arr) {
                d.update(deltaTime, cameraPosition, playerPosition);
            }
        }
    }

    // Common interaction check: find a drop within pickup radius for a given key
    checkInteraction(key: ItemDropType, playerPosition: THREE.Vector3) {
        const arr = this.drops.get(key) || [];
        for (const d of arr) {
            const dist = playerPosition.distanceTo((d.mesh as any).position);
            if (dist < 1.5) return d;
        }
        return null;
    }

    // Delegate pickup to strategy, then cleanup and remove the drop from internal storage
    pickup(key: ItemDropType, scene: THREE.Scene, drop: ItemDrop, player: Player) {
        const strategy = this.itemDropStrategies.find(strategy => strategy.key === key);
        if (!strategy) return;

        strategy.pickup(drop, player);

        // cleanup visuals and physics body
        drop.cleanup(scene);

        const arr = this.drops.get(key) || [];
        const idx = arr.indexOf(drop);
        if (idx > -1) arr.splice(idx, 1);
    }

    // Clear all drops for all strategies
    clear(scene: THREE.Scene) {
        for (const [, arr] of this.drops.entries()) {
            for (const drop of arr) {
                drop.cleanup(scene);
            }
            arr.length = 0;
        }
    }
}

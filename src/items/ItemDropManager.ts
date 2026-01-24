import * as THREE from 'three';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { WeaponDropStrategy } from './strategies/WeaponDropStrategy';
import { ChipDropStrategy } from './strategies/ChipDropStrategy';
import { CoreDropStrategy } from './strategies/CoreDropStrategy';
import { BoosterPackDropStrategy } from './strategies/BoosterPackDropStrategy';
import { XDataDropStrategy } from './strategies/XDataDropStrategy';
import RAPIER from '@dimforge/rapier3d-compat';

export interface ItemDropStrategy {
    // unique identifier for this strategy type
    readonly key: string;
    // returns the created drop object or null when no drop occurred
    tryDrop(scene: THREE.Scene, world: RAPIER.World, enemy: Enemy, player: Player): ItemDrop | null;
    // perform pickup logic (add item to inventory); do NOT cleanup the drop visuals/bodies
    pickup(scene: THREE.Scene, world: RAPIER.World, drop: ItemDrop, player: Player): void;
    // return the probability weight for this drop type (e.g., 0.43 for weapon)
    getDropProbability(): number;
}

export class ItemDropManager {
    private static instance: ItemDropManager;
    private strategies: Map<string, ItemDropStrategy> = new Map();
    private drops: Map<string, ItemDrop[]> = new Map();
    private itemDropStrategies: ItemDropStrategy[] = [];

    private constructor() {
        // Register all item drop strategies internally (weapon, chip, core, boosterPack)
        this.registerStrategy(new WeaponDropStrategy());
        this.registerStrategy(new ChipDropStrategy());
        this.registerStrategy(new CoreDropStrategy());
        this.registerStrategy(new BoosterPackDropStrategy());

        // XData is separate from item drops
        this.registerStrategy(new XDataDropStrategy());

        // Build list of item drop strategies (excluding xData)
        this.itemDropStrategies = [
            this.strategies.get('weapon')!,
            this.strategies.get('chip')!,
            this.strategies.get('core')!,
            this.strategies.get('boosterPack')!
        ];
    }

    public static get Instance(): ItemDropManager {
        return this.instance || (this.instance = new this());
    }

    registerStrategy(strategy: ItemDropStrategy) {
        this.strategies.set(strategy.key, strategy);
        this.drops.set(strategy.key, []);
    }

    private selectRandomStrategy(): ItemDropStrategy | null {
        // Calculate cumulative probabilities for weighted selection
        const totalProbability = this.itemDropStrategies.reduce((sum, s) => sum + s.getDropProbability(), 0);
        if (totalProbability <= 0) return null;

        const random = Math.random() * totalProbability;

        // Using cumulative distribution to select strategy is necessary to avoid bias
        let cumulative = 0;
        for (const strategy of this.itemDropStrategies) {
            cumulative += strategy.getDropProbability();
            if (random < cumulative) {
                return strategy;
            }
        }
        return null;
    }

    /**
     * Try to drop an item from enemy using all registered item drop strategies.
     * Each strategy independently checks enemy.itemDropChance and only one item can be dropped.
     * Strategies are tried in order weighted by their drop probability.
     * @returns true if an item was dropped, false otherwise
     */
    tryDropItem(scene: THREE.Scene, world: RAPIER.World, enemy: Enemy, player: Player): boolean {
        const strategy = this.selectRandomStrategy();
        if (!strategy) return false;

        // Try this strategy
        const drop = strategy.tryDrop(scene, world, enemy, player);
        if (drop) {
            const arr = this.drops.get(strategy.key)!;
            arr.push(drop);
            return true;
        }

        return false;
    }

    tryDrop(key: string, scene: THREE.Scene, world: RAPIER.World, enemy: Enemy, player: Player): boolean {
        const s = this.strategies.get(key);
        if (!s) return false;
        const drop = s.tryDrop(scene, world, enemy, player);
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
    checkInteraction(key: string, playerPosition: THREE.Vector3) {
        const arr = this.drops.get(key) || [];
        for (const d of arr) {
            const dist = playerPosition.distanceTo((d.mesh as any).position);
            if (dist < 1.5) return d;
        }
        return null;
    }

    // Delegate pickup to strategy, then cleanup and remove the drop from internal storage
    pickup(key: string, scene: THREE.Scene, world: RAPIER.World, drop: ItemDrop, player: Player) {
        const s = this.strategies.get(key);
        if (!s) return;
        s.pickup(scene, world, drop, player);

        // cleanup visuals and physics body
        drop.cleanup(scene, world);

        const arr = this.drops.get(key) || [];
        const idx = arr.indexOf(drop);
        if (idx > -1) arr.splice(idx, 1);
    }

    // Clear all drops for all strategies
    clear(scene: THREE.Scene, world: RAPIER.World) {
        for (const [, arr] of this.drops.entries()) {
            for (const d of arr) {
                if (typeof d.cleanup === 'function') d.cleanup(scene, world);
            }
            arr.length = 0;
        }
    }
}

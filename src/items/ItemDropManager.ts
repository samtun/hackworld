import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { WeaponDropStrategy } from './strategies/WeaponDropStrategy';
import { ChipDropStrategy } from './strategies/ChipDropStrategy';
import { CoreDropStrategy } from './strategies/CoreDropStrategy';
import { BoosterPackDropStrategy } from './strategies/BoosterPackDropStrategy';
import { XDataDropStrategy } from './strategies/XDataDropStrategy';

export interface ItemDropStrategy {
    // returns the created drop object or null when no drop occurred
    tryDrop(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): ItemDrop | null;
    // perform pickup logic (add item to inventory); do NOT cleanup the drop visuals/bodies
    pickup(scene: THREE.Scene, world: CANNON.World, drop: ItemDrop, player: Player): void;
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
        this.registerStrategy('weapon', new WeaponDropStrategy());
        this.registerStrategy('chip', new ChipDropStrategy());
        this.registerStrategy('core', new CoreDropStrategy());
        this.registerStrategy('boosterPack', new BoosterPackDropStrategy());
        
        // XData is separate from item drops
        this.registerStrategy('xData', new XDataDropStrategy());

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

    registerStrategy(key: string, strategy: ItemDropStrategy) {
        this.strategies.set(key, strategy);
        this.drops.set(key, []);
    }

    /**
     * Try to drop an item from enemy using all registered item drop strategies.
     * Each strategy independently checks enemy.itemDropChance and only one item can be dropped.
     * Strategies are tried in order weighted by their drop probability.
     * @returns true if an item was dropped, false otherwise
     */
    tryDropItem(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): boolean {
        // Calculate cumulative probabilities for weighted selection
        const totalProbability = this.itemDropStrategies.reduce((sum, s) => sum + s.getDropProbability(), 0);
        const random = Math.random() * totalProbability;
        
        let cumulative = 0;
        for (const strategy of this.itemDropStrategies) {
            cumulative += strategy.getDropProbability();
            if (random < cumulative) {
                // Try this strategy
                const drop = strategy.tryDrop(scene, world, enemy, player);
                if (drop) {
                    // Find which key this strategy belongs to
                    for (const [key, s] of this.strategies.entries()) {
                        if (s === strategy) {
                            const arr = this.drops.get(key)!;
                            // Add physics body to world if provided by the drop
                            if (drop.body instanceof CANNON.Body) {
                                world.addBody(drop.body);
                            }
                            arr.push(drop);
                            return true;
                        }
                    }
                }
                // Strategy was called but didn't drop (failed itemDropChance check)
                return false;
            }
        }
        return false;
    }

    tryDrop(key: string, scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): boolean {
        const s = this.strategies.get(key);
        if (!s) return false;
        const drop = s.tryDrop(scene, world, enemy, player);
        if (drop) {
            const arr = this.drops.get(key)!;
            // Add physics body to world if provided by the drop
            if (drop.body instanceof CANNON.Body) {
                world.addBody(drop.body);
            }
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
    pickup(key: string, scene: THREE.Scene, world: CANNON.World, drop: ItemDrop, player: Player) {
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
    clear(scene: THREE.Scene, world: CANNON.World) {
        for (const [, arr] of this.drops.entries()) {
            for (const d of arr) {
                if (typeof d.cleanup === 'function') d.cleanup(scene, world);
            }
            arr.length = 0;
        }
    }
}

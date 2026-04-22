import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';
import { ItemDropType } from './ItemDropType';
import { WeaponDropStrategy } from './weapons/WeaponDropStrategy';
import { ChipDropStrategy } from './chips/ChipDropStrategy';
import { CoreDropStrategy } from './cores/CoreDropStrategy';
import { BoosterPackDropStrategy } from './cards/BoosterPackDropStrategy';
import { MinimapDropStrategy } from './minimap/MinimapDropStrategy';
import { XDataDropStrategy } from './xdata/XDataDropStrategy';
import { MoneyDropStrategy } from './bits/MoneyDropStrategy';
import { HPPotionDropStrategy, TPPotionDropStrategy } from './potions/PotionDropStrategies';
import { PotionDrop } from './potions/PotionDrop';
import { PotionType, determinePotionLevel } from './potions/PotionDefinitions';

export interface ItemDropStrategy {
    // unique identifier for this strategy type
    readonly key: ItemDropType;
    getDistributionWeight(enemy: Enemy, player: Player): number; // probability weight for this drop type
    // returns the created drop object or null when no drop occurred
    drop(scene: THREE.Scene, enemy: Enemy, player: Player): ItemDrop | null;
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
        this.registerStrategy(new MinimapDropStrategy());
        this.registerStrategy(new XDataDropStrategy());
        this.registerStrategy(new MoneyDropStrategy());
        this.registerStrategy(new HPPotionDropStrategy());
        this.registerStrategy(new TPPotionDropStrategy());
    }

    public static get Instance(): ItemDropManager {
        return this.instance || (this.instance = new this());
    }

    registerStrategy(strategy: ItemDropStrategy) {
        this.itemDropStrategies.push(strategy);
        this.drops.set(strategy.key, []);
    }

    private selectRandomStrategy(enemy: Enemy, player: Player): ItemDropStrategy | undefined {
        // Calculate cumulative probabilities for weighted selection
        const totalProbability = this.itemDropStrategies.reduce((sum, s) => sum + s.getDistributionWeight(enemy, player), 0);
        if (totalProbability <= 0) return undefined;

        const random = Math.random() * totalProbability;

        // Using cumulative distribution to select strategy is necessary to avoid bias
        let cumulative = 0;
        for (const strategy of this.itemDropStrategies) {
            cumulative += strategy.getDistributionWeight(enemy, player);
            if (random < cumulative) {
                return strategy;
            }
        }

        return undefined;
    }

    /**
     * Try to drop an item from enemy.
     * Selects from weighted probabilities from all drop types.
     * @returns true if an item was dropped, false otherwise
     */
    tryDropItem(scene: THREE.Scene, enemy: Enemy, player: Player): void {
        const strategy = this.selectRandomStrategy(enemy, player);
        if (!strategy) return;

        // Apply luck multiplier and collection bonus to drop chance
        const effectiveDropChance = enemy.itemDropChance + player.luckDropChanceBonus + player.collectionBonusItemDropChance;
        if (Math.random() > effectiveDropChance) return;

        const drop = strategy.drop(scene, enemy, player);
        if (drop) {
            const arr = this.drops.get(strategy.key)!;
            arr.push(drop);
        }
    }

    /**
     * Try to drop an HP or TP potion with a flat base chance, independent
     * of the normal weighted item-drop system.
     * @param baseChance probability (0–1) of a potion dropping (e.g. 0.05)
     */
    tryDropPotion(scene: THREE.Scene, position: CANNON.Vec3, player: Player, baseChance: number): void {
        if (Math.random() > baseChance) return;

        const potionType = Math.random() < 0.5 ? PotionType.HP : PotionType.TP;
        const level = determinePotionLevel(player.level);
        const drop = new PotionDrop(scene, position, potionType, level);
        const key = potionType === PotionType.HP ? ItemDropType.HP_POTION : ItemDropType.TP_POTION;
        this.drops.get(key)!.push(drop);
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

    /**
     * Register an externally-created drop (e.g. from a breakable barrel) with
     * the manager so it receives updates and can be picked up.
     */
    addDrop(drop: ItemDrop): void {
        const arr = this.drops.get(drop.dropType);
        if (arr) {
            arr.push(drop);
        }
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

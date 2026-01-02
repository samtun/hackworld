import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from './ItemDrop';

export interface ItemDropStrategy {
    // returns the created drop object or null when no drop occurred
    tryDrop(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): ItemDrop | null;
    // perform pickup logic (add item to inventory); do NOT cleanup the drop visuals/bodies
    pickup(scene: THREE.Scene, world: CANNON.World, drop: ItemDrop, player: Player): void;
}

export class ItemDropManager {
    private static instance: ItemDropManager;
    private strategies: Map<string, ItemDropStrategy> = new Map();
    private drops: Map<string, ItemDrop[]> = new Map();

    private constructor() {}

    public static get Instance(): ItemDropManager {
        return this.instance || (this.instance = new this());
    }

    registerStrategy(key: string, strategy: ItemDropStrategy) {
        this.strategies.set(key, strategy);
        this.drops.set(key, []);
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

import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { CoreDrop } from '../cores/CoreDrop';
import { CoreRepository } from '../cores/CoreRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';
import RAPIER from '@dimforge/rapier3d-compat';

export class CoreDropStrategy implements ItemDropStrategy {
    readonly key = 'core';
    private readonly DROP_PROBABILITY = 0.27; // 27% of total drops

    tryDrop(scene: THREE.Scene, _physicsWorld: RAPIER.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const luckMultiplier = 1 + (player.luck / 40000); // Formula: player.luck / 40000
        const effectiveDropChance = enemy.itemDropChance * luckMultiplier;

        if (Math.random() > effectiveDropChance) return null;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random core at the determined level from the repository
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;

        const bodyPos = enemy.body.translation();
        const pos = new THREE.Vector3(bodyPos.x, 0.5, bodyPos.z);

        const drop = new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
        console.log(`Enemy dropped ${drop}`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: RAPIER.World, drop: CoreDrop, player: Player): void {
        // Get the core from repository by ID to find its name
        const coreItem = CoreRepository.Instance.getCoreById(drop.coreId);
        if (!coreItem) {
            console.warn(`Core not found for ${drop.coreId}`);
            return;
        }

        player.inventory.push(coreItem);
        console.log(`Picked up core ${coreItem})`);
    }

    getDropProbability(): number {
        return this.DROP_PROBABILITY;
    }
}

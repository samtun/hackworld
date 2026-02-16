import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { CoreDrop } from './CoreDrop';
import { CoreRepository } from './CoreRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDropType } from '../ItemDropType';

export class CoreDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.CORE;
    public readonly distributionWeight = 4;

    tryDrop(scene: THREE.Scene, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const effectiveDropChance = enemy.itemDropChance + player.luckDropChanceBonus;
        
        if (Math.random() > effectiveDropChance) return null;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random core at the determined level from the repository
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
        console.log(`Enemy dropped ${drop}`);
        return drop;
    }

    pickup(drop: CoreDrop, player: Player): void {
        // Get the core from repository by ID to find its name
        const coreItem = CoreRepository.Instance.getCoreById(drop.coreId);
        if (!coreItem) {
            console.warn(`Core not found for ${drop.coreId}`);
            return;
        }

        player.inventory.push(coreItem);
        console.log(`Picked up core ${coreItem})`);
    }
}

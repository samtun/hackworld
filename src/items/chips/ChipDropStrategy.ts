import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { ChipDrop } from './ChipDrop';
import { ChipRepository } from './ChipRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { ItemDropType } from '../ItemDropType';

export class ChipDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.CHIP;
    public readonly distributionWeight = 4;

    tryDrop(scene: THREE.Scene, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const effectiveDropChance = enemy.itemDropChance * player.luckMultiplier;
        
        if (Math.random() > effectiveDropChance) return null;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random chip at the determined level from the repository
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new ChipDrop(scene, pos, chipItem.id, chipItem.name, chipItem.chipType, chipItem.buyPrice, chipItem.sellPrice, level);
        console.log(`Enemy dropped chip ${chipItem.name} (level ${level})`);
        return drop;
    }

    pickup(drop: ChipDrop, player: Player): void {
        // Get the chip from repository by ID to find its type
        const chipItem = ChipRepository.Instance.getChipById(drop.chipId);
        if (!chipItem) {
            console.warn(`Chip not found for ${drop.chipId}`);
            return;
        }

        player.inventory.push(chipItem);
        console.log(`Picked up chip ${chipItem}`);
    }
}

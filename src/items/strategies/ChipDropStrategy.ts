import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { ChipDrop } from '../chips/ChipDrop';
import { ChipRepository } from '../chips/ChipRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipDropStrategy implements ItemDropStrategy {
    readonly key = 'chip';
    private readonly DROP_PROBABILITY = 0.27; // 27% of total drops

    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

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

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: ChipDrop, player: Player): void {
        // Get the chip from repository by ID to find its type
        const chipItem = ChipRepository.Instance.getChipById(drop.chipId);
        if (!chipItem) {
            console.warn(`Chip not found for ${drop.chipId}`);
            return;
        }

        // Get the properly leveled chip from the repository
        const leveledChip = ChipRepository.Instance.getChipByTypeAndLevel(chipItem.chipType, drop.level);
        if (!leveledChip) {
            console.warn(`Chip not found in repository for type ${chipItem.chipType} and level ${drop.level}`);
            return;
        }

        player.inventory.push(leveledChip);
        console.log(`Picked up chip ${leveledChip.name} (level ${drop.level})`);
    }

    getDropProbability(): number {
        return this.DROP_PROBABILITY;
    }
}

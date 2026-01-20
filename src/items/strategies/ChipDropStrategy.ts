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
        // Apply luck multiplier to drop chance
        const luckMultiplier = 1 + (player.luck / 40000); // Formula: player.luck / 40000
        const effectiveDropChance = enemy.itemDropChance * luckMultiplier;
        
        if (Math.random() > effectiveDropChance) return null;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random chip at the determined level from the repository
        const chipItem = ChipRepository.Instance.getRandomChipOfLevel(level);
        if (!chipItem) return null;

        const bodyPos = enemy.body.translation();
        const pos = new CANNON.Vec3(bodyPos.x, 0.5, bodyPos.z);

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

        player.inventory.push(chipItem);
        console.log(`Picked up chip ${chipItem}`);
    }

    getDropProbability(): number {
        return this.DROP_PROBABILITY;
    }
}

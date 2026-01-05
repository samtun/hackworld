import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { CoreDrop } from '../cores/CoreDrop';
import { CoreRepository } from '../cores/CoreRepository';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class CoreDropStrategy implements ItemDropStrategy {
    readonly key = 'core';
    private readonly DROP_PROBABILITY = 0.27; // 27% of total drops

    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random core at the determined level from the repository
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return null;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
        console.log(`Enemy dropped core ${coreItem.name} (level ${level})`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: CoreDrop, player: Player): void {
        // Get the core from repository by ID to find its name
        const coreItem = CoreRepository.Instance.getCoreById(drop.coreId);
        if (!coreItem) {
            console.warn(`Core not found for ${drop.coreId}`);
            return;
        }

        // Get the properly leveled core from the repository
        const leveledCore = CoreRepository.Instance.getCoreByNameAndLevel(coreItem.name, drop.level);
        if (!leveledCore) {
            console.warn(`Core not found in repository for name ${coreItem.name} and level ${drop.level}`);
            return;
        }

        player.inventory.push(leveledCore);
        console.log(`Picked up core ${leveledCore.name} (level ${drop.level})`);
    }

    getDropProbability(): number {
        return this.DROP_PROBABILITY;
    }
}

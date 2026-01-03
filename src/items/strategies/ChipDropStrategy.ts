import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { ChipDrop } from '../chips/ChipDrop';
import { ChipRegistry } from '../chips/ChipRegistry';
import { ChipItem } from '../chips/ChipItem';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipDropStrategy implements ItemDropStrategy {
    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        const def = ChipRegistry.Instance.getRandomChip();
        if (!def) return null;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        const drop = new ChipDrop(scene, pos, def.id, def.name, def.type, def.buyPrice, def.sellPrice, level);
        console.log(`Enemy dropped chip ${def.name} (level ${level})`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: ChipDrop, player: Player): void {
        const def = ChipRegistry.Instance.getChipById(drop.chipId);
        if (!def) {
            console.warn(`Chip definition not found for ${drop.chipId}`);
            return;
        }

        const newItem = new ChipItem(
            crypto.randomUUID(),
            def.name,
            def.buyPrice,
            def.sellPrice,
            def.type,
            def.stats,
            drop.level
        );

        player.inventory.push(newItem);
        console.log(`Picked up chip ${def.name} (level ${drop.level})`);
    }
}

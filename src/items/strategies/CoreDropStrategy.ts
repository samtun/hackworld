import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { CoreDrop } from '../cores/CoreDrop';
import { CoreRegistry } from '../cores/CoreRegistry';
import { CoreItem } from '../cores/CoreItem';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class CoreDropStrategy implements ItemDropStrategy {
    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, _player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        const def = CoreRegistry.Instance.getRandomCore();
        if (!def) return null;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new CoreDrop(scene, pos, def.id, def.name, def.buyPrice, def.sellPrice);
        console.log(`Enemy dropped core ${def.name}`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: CoreDrop, player: Player): void {
        const def = CoreRegistry.Instance.getCoreById(drop.coreId);
        if (!def) {
            console.warn(`Core definition not found for ${drop.coreId}`);
            return;
        }

        const newItem = new CoreItem(
            crypto.randomUUID(),
            def.name,
            def.buyPrice,
            def.sellPrice,
            def.stats
        );

        player.inventory.push(newItem);
        console.log(`Picked up core ${def.name}`);
    }
}

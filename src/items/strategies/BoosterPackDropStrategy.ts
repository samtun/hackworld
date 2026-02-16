import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { BoosterPackDrop } from '../cards/BoosterPackDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemDropType } from '../ItemDropType';

export class BoosterPackDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.BOOSTER_PACK;
    public readonly distributionWeight = 1;

    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const effectiveDropChance = enemy.itemDropChance * player.luckMultiplier;
        
        if (Math.random() > effectiveDropChance) return null;

        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5;

        const drop = new BoosterPackDrop(scene, dropPosition);
        console.log('Enemy dropped Booster Pack');
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, _drop: BoosterPackDrop, player: Player): void {
        player.collectBoosterPack();
        console.log('Picked up Booster Pack');
    }
}

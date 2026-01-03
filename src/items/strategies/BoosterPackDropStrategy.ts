import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { BoosterPackDrop } from '../cards/BoosterPackDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class BoosterPackDropStrategy implements ItemDropStrategy {
    private readonly DROP_CHANCE = 0.03; // 3% chance

    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, _player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > this.DROP_CHANCE) return null;

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

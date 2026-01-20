import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { BoosterPackDrop } from '../cards/BoosterPackDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class BoosterPackDropStrategy implements ItemDropStrategy {
    readonly key = 'boosterPack';
    private readonly DROP_PROBABILITY = 0.03; // 3% of total drops

    tryDrop(scene: THREE.Scene, _physicsWorld: any, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const luckMultiplier = 1 + (player.luck / 40000); // Formula: player.luck / 40000
        const effectiveDropChance = enemy.itemDropChance * luckMultiplier;
        
        if (Math.random() > effectiveDropChance) return null;

        const bodyPos = enemy.body.translation();
        const dropPosition = new THREE.Vector3(bodyPos.x, 0.5, bodyPos.z);

        const drop = new BoosterPackDrop(scene, dropPosition);
        console.log('Enemy dropped Booster Pack');
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: any, _drop: BoosterPackDrop, player: Player): void {
        player.collectBoosterPack();
        console.log('Picked up Booster Pack');
    }

    getDropProbability(): number {
        return this.DROP_PROBABILITY;
    }
}

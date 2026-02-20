import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { BoosterPackDrop } from './BoosterPackDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemDropType } from '../ItemDropType';

export class BoosterPackDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.BOOSTER_PACK;
    public getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 1;
    }

    drop(scene: THREE.Scene, enemy: Enemy, _player: Player): import("../ItemDrop").ItemDrop | null {
        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const drop = new BoosterPackDrop(scene, dropPosition);
        console.log('Enemy dropped Booster Pack');
        return drop;
    }

    pickup(_drop: BoosterPackDrop, player: Player): void {
        player.collectBoosterPack();
        console.log('Picked up Booster Pack');
    }
}

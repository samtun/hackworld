import { ItemDropStrategy } from '../ItemDropManager';
import { BoosterPackDrop } from './BoosterPackDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../player/Player';
import { ItemDropType } from '../ItemDropType';
import { ItemDropFactory } from '../ItemDropFactory';

export class BoosterPackDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.BOOSTER_PACK;
    public getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 1;
    }

    constructor(private readonly itemDropFactory: ItemDropFactory) { }

    drop(enemy: Enemy, _player: Player): import("../ItemDrop").ItemDrop | null {
        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const drop = this.itemDropFactory.createBoosterPackDrop(dropPosition);
        console.log('Enemy dropped Booster Pack');
        return drop;
    }

    pickup(_drop: BoosterPackDrop, player: Player): void {
        player.collectBoosterPack();
        console.log('Picked up Booster Pack');
    }
}

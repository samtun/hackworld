import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../player/Player';
import { ItemDrop } from '../ItemDrop';
import { ItemDropStrategy } from '../ItemDropManager';
import { ItemDropType } from '../ItemDropType';
import { PotionDrop } from './PotionDrop';

/**
 * Strategy for HP potion drops.
 * Weight is 0 — potions are not part of the normal weighted distribution;
 * they are dropped via the separate tryDropPotion path.
 */

export class HPPotionDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.HP_POTION;

    getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 0;
    }

    drop(): ItemDrop | null {
        return null;
    }

    pickup(drop: ItemDrop, player: Player): void {
        const potion = drop as PotionDrop;
        player.heal(potion.amount, 0, true);
        console.log(`Picked up HP Potion Lv${potion.level}: +${potion.amount} HP`);
    }
}

import { ItemDropStrategy } from '../ItemDropManager';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { PotionDrop } from './PotionDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

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

/**
 * Strategy for TP potion drops.
 * Weight is 0 — potions are not part of the normal weighted distribution;
 * they are dropped via the separate tryDropPotion path.
 */
export class TPPotionDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.TP_POTION;

    getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 0;
    }

    drop(): ItemDrop | null {
        return null;
    }

    pickup(drop: ItemDrop, player: Player): void {
        const potion = drop as PotionDrop;
        player.heal(0, potion.amount, true);
        console.log(`Picked up TP Potion Lv${potion.level}: +${potion.amount} TP`);
    }
}

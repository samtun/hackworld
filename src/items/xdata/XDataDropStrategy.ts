import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { XDataDrop } from './XDataDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class XDataDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.XDATA;
    public getDistributionWeight(enemy: Enemy, player: Player): number {
        // Low level players should not get any X-Data yet
        if (player.level < 10) return 0;

        // Cap drop chance at level 100
        if (player.level >= 100) return enemy.xDataDropChanceWeight;

        return enemy.xDataDropChanceWeight * player.level / 100;
    }

    drop(scene: THREE.Scene, enemy: Enemy, player: Player): ItemDrop | null {
        const xDataAmount = this.determineAmount(player.level, enemy.xDataDropChanceWeight);
        if (xDataAmount <= 0) return null;

        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const drop = new XDataDrop(scene, dropPosition, xDataAmount);
        console.log(`Enemy dropped ${xDataAmount} XData`);
        return drop;
    }

    pickup(drop: XDataDrop, player: Player): void {
        player.collectXData(drop.amount);
        console.log(`Picked up ${drop.amount} XData`);
    }

    private determineAmount(playerLevel: number, dropChanceWeight: number): number {
        const amountRoll = Math.random();

        // Roll amount
        // Enemies with higher drop chance also have a higher probability for higher amounts
        const isHighChance: boolean = playerLevel >= 100 && dropChanceWeight >= 2.0;
        const veryHighAmountLimit: number = isHighChance ? 0.05 : 0;
        const highAmountLimit: number = isHighChance ? 0.2 : 0.05;
        const mediumAmountLimit: number = isHighChance ? 0.6 : 0.25;
        if (amountRoll < veryHighAmountLimit) {
            return 100;
        } else if (amountRoll < highAmountLimit) {
            return 20;
        } else if (amountRoll < mediumAmountLimit) {
            return 5;
        } else {
            return 1;
        }
    }
}

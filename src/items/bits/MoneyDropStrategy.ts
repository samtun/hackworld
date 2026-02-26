import * as THREE from 'three';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { ItemDrop } from '../ItemDrop';
import { ItemDropType } from '../ItemDropType';
import { MoneyDrop } from './MoneyDrop';
import { ItemDropStrategy } from '../ItemDropManager';

export class MoneyDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.MONEY;
    public getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 6;
    }

    /**
     * Try to drop money from enemy.
     * Always succeeds if called (money drop probability is handled in ItemDropManager).
     */
    drop(scene: THREE.Scene, enemy: Enemy, player: Player): ItemDrop | null {        
        const amount = this.determineMoneyAmount(player);
        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;
        return new MoneyDrop(scene, dropPosition, amount);
    }

    /**
     * Pickup money: add it to player's money
     */
    pickup(drop: ItemDrop, player: Player): void {
        const moneyDrop = drop as MoneyDrop;
        player.bits += moneyDrop.amount;
        console.log(`Picked up ${moneyDrop.amount} bits! Total: ${player.bits}`);
    }

    /**
     * Determine the amount of money to drop based on player level.
     */
    private determineMoneyAmount(player: Player): number {
        const levelBonus = Math.pow(Math.log10(player.level), 2) / 400;

        // Different amounts with base chances
        const chances = [
            { amount: 500, baseChance: 0.01 },
            { amount: 200, baseChance: 0.05 },
            { amount: 100, baseChance: 0.10 }
        ];

        const random = Math.random();
        let cumulativeChance = 0;

        for (const { amount, baseChance } of chances) {
            const adjustedChance = Math.min(1.0, baseChance + levelBonus);
            cumulativeChance += adjustedChance;

            if (random < cumulativeChance) {
                return amount;
            }
        }

        // Default to 10 bits if no other amount matched
        return 10;
    }
}

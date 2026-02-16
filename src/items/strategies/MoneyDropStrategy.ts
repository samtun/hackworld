import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';
import { ItemDrop } from '../ItemDrop';
import { MoneyDrop } from '../MoneyDrop';
import { ItemDropStrategy } from '../ItemDropManager';

export class MoneyDropStrategy implements ItemDropStrategy {
    readonly key: string = 'money';

    // Money drop probability: controlled externally (10% of all drops)
    getDropProbability(): number {
        return 0.10;
    }

    /**
     * Try to drop money from enemy.
     * Always succeeds if called (money drop probability is handled in ItemDropManager).
     */
    tryDrop(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): ItemDrop | null {
        // All enemies drop money
        const amount = this.determineMoneyAmount(player);
        const position = enemy.getDeathPosition();
        return new MoneyDrop(scene, position, amount);
    }

    /**
     * Pickup money: add it to player's money
     */
    pickup(scene: THREE.Scene, world: CANNON.World, drop: ItemDrop, player: Player): void {
        const moneyDrop = drop as MoneyDrop;
        player.money = (player.money || 0) + moneyDrop.amount;
        console.log(`Picked up ${moneyDrop.amount} bits! Total: ${player.money}`);
    }

    /**
     * Determine the amount of money to drop based on player level.
     * Formula: baseChance + log(player.level) * 3
     */
    private determineMoneyAmount(player: Player): number {
        const playerLevel = Math.max(1, player.level || 1);
        const levelBonus = Math.log(playerLevel) * 3;

        // Different amounts with base chances
        const chances = [
            { amount: 500, baseChance: 0.02 },
            { amount: 200, baseChance: 0.08 },
            { amount: 100, baseChance: 0.20 }
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

import { Enemy } from "../Enemy";
import { Player } from "../Player";

export class XDataDropManager {
    rollDrop(player: Player, enemy: Enemy): number {
        // Low level players should not get any X-Data yet
        if (player.level < 10) return 0;

        // Calculate drop chance with 2 factors:
        // 1. Factor: player level: Probability rises to from 0 at level 0 to 1 at level 100
        const levelDropChance = player.level >= 100
            ? 1
            : player.level / (428.7453673 - 3.285563999 * player.level);

        // Multiply by drop chance factor of the defeated enemy
        const dropChance: number = levelDropChance * enemy.xDataDropChance;
        const dropRoll: number = Math.random();
        console.log("XData level drop chance: " + levelDropChance);
        console.log("XData drop roll: " + dropRoll + ", dropChance: " + dropChance);
        if (dropRoll <= dropChance) {
            return this.determineAmount(enemy.xDataDropChance);
        }

        return 0;
    }

    private determineAmount(dropChance: number): number {
        const amountRoll = Math.random();

        // Roll amount
        // Enemies with higher drop chance also have a higher probability for higher amounts
        const isHighChance: boolean = dropChance >= 0.3;
        const veryHighAmountLimit: number = isHighChance ? 0.1 : 0.02;
        const highAmountLimit: number = isHighChance ? 0.3 : 0.05;
        const mediumAmountLimit: number = isHighChance ? 0.6 : 0.1
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
import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { ItemDrop } from '../ItemDrop';
import { XDataDrop } from '../xdata/XDataDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class XDataDropStrategy implements ItemDropStrategy {
    readonly key = 'xData';
    // X-Data drop chance calculation constants
    // These values determine the player level scaling factor for X-Data drops
    private static readonly XDATA_LEVEL_DIVISOR = 428.7453673;
    private static readonly XDATA_LEVEL_MULTIPLIER = 3.285563999;

    tryDrop(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): ItemDrop | null {
        // Low level players should not get any X-Data yet
        if (player.level < 10) return null;

        // Calculate drop chance with player level factor
        const levelDropChance = player.level >= 100
            ? 1
            : player.level / (XDataDropStrategy.XDATA_LEVEL_DIVISOR - XDataDropStrategy.XDATA_LEVEL_MULTIPLIER * player.level);
        
        // Apply luck multiplier to drop chance
        const luckMultiplier = 1 + (player.luck / 40000); // Formula: player.luck / 40000
        const xDataDropChance = levelDropChance * enemy.xDataDropChance * luckMultiplier;

        // Check if drop should occur
        if (Math.random() > xDataDropChance) return null;

        const xDataAmount = this.determineAmount(enemy.xDataDropChance);
        if (xDataAmount <= 0) return null;

        const bodyPos = enemy.body.translation();
        const dropPosition = new CANNON.Vec3(bodyPos.x, 0.5, bodyPos.z);

        const drop = new XDataDrop(scene, world, dropPosition, xDataAmount);
        console.log(`Enemy dropped ${xDataAmount} X-Data`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: XDataDrop, player: Player): void {
        player.collectXData(drop.amount);
        console.log(`Picked up ${drop.amount} X-Data`);
    }

    getDropProbability(): number {
        // XData doesn't use the weighted selection system as it's independent of item drops
        return 0;
    }

    private determineAmount(dropChance: number): number {
        const amountRoll = Math.random();

        // Roll amount
        // Enemies with higher drop chance also have a higher probability for higher amounts
        const isHighChance: boolean = dropChance >= 0.3;
        const veryHighAmountLimit: number = isHighChance ? 0.1 : 0.02;
        const highAmountLimit: number = isHighChance ? 0.3 : 0.05;
        const mediumAmountLimit: number = isHighChance ? 0.6 : 0.1;
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

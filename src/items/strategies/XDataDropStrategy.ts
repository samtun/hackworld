import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { XDataDrop } from '../xdata/XDataDrop';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';

export class XDataDropStrategy implements ItemDropStrategy {
    tryDrop(scene: THREE.Scene, world: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Low level players should not get any X-Data yet
        if (player.level < 10) return null;

        const xDataAmount = this.determineAmount(enemy.xDataDropChance);
        if (xDataAmount <= 0) return null;

        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5;

        const drop = new XDataDrop(scene, world, dropPosition, xDataAmount);
        console.log(`Enemy dropped ${xDataAmount} X-Data`);
        return drop;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: XDataDrop, player: Player): void {
        player.collectXData(drop.amount);
        console.log(`Picked up ${drop.amount} X-Data`);
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

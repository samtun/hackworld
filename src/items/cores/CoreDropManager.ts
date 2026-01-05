import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CoreDrop } from './CoreDrop';
import { CoreRepository } from './CoreRepository';
import { Player } from '../../Player';
import { Enemy } from '../../enemies/Enemy';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class CoreDropManager {
    private static instance: CoreDropManager;
    private coreDrops: CoreDrop[] = [];

    private constructor() {}

    public static get Instance(): CoreDropManager {
        return this.instance || (this.instance = new this());
    }

    tryDropCore(scene: THREE.Scene, enemy: Enemy, player: Player): boolean {
        if (Math.random() > enemy.itemDropChance) return false;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        // Get a random core at the determined level from the repository
        const coreItem = CoreRepository.Instance.getRandomCoreOfLevel(level);
        if (!coreItem) return false;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new CoreDrop(scene, pos, coreItem.id, coreItem.name, coreItem.buyPrice, coreItem.sellPrice, level);
        this.coreDrops.push(drop);
        console.log(`Enemy dropped core ${coreItem.name} (level ${level})`);
        return true;
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        for (const d of this.coreDrops) d.update(deltaTime, cameraPosition, playerPosition);
    }

    checkInteraction(playerPosition: THREE.Vector3): CoreDrop | null {
        for (const d of this.coreDrops) {
            const dist = playerPosition.distanceTo(d.mesh.position);
            if (dist < 1.5) return d;
        }
        return null;
    }

    pickup(scene: THREE.Scene, physicsWorld: CANNON.World, drop: CoreDrop, player: Player): void {
        // Get the core from repository by ID to find its name
        const coreItem = CoreRepository.Instance.getCoreById(drop.coreId);
        if (!coreItem) {
            console.warn(`Core not found for ${drop.coreId}`);
            return;
        }

        // Get the properly leveled core from the repository
        const leveledCore = CoreRepository.Instance.getCoreByNameAndLevel(coreItem.name, drop.level);
        if (!leveledCore) {
            console.warn(`Core not found in repository for name ${coreItem.name} and level ${drop.level}`);
            return;
        }

        player.inventory.push(leveledCore);
        console.log(`Picked up core ${leveledCore.name} (level ${drop.level})`);

        const idx = this.coreDrops.indexOf(drop);
        if (idx > -1) {
            drop.cleanup(scene, physicsWorld);
            this.coreDrops.splice(idx, 1);
        }
    }

    clear(scene: THREE.Scene, physicsWorld: CANNON.World): void {
        for (const d of this.coreDrops) d.cleanup(scene, physicsWorld);
        this.coreDrops = [];
    }
}

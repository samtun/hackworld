import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CoreDrop } from './CoreDrop';
import { CoreRegistry } from './CoreRegistry';
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

        const def = CoreRegistry.Instance.getRandomCore();
        if (!def) return false;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        const drop = new CoreDrop(scene, pos, def.id, def.name, def.buyPrice, def.sellPrice, level);
        this.coreDrops.push(drop);
        console.log(`Enemy dropped core ${def.name} (level ${level})`);
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
        // Find registry entry to get the base core name
        const def = CoreRegistry.Instance.getCoreById(drop.coreId);
        if (!def) {
            console.warn(`Core definition not found for ${drop.coreId}`);
            return;
        }

        // Get the leveled core from the repository
        const coreItem = CoreRepository.Instance.getCoreByNameAndLevel(def.name, drop.level);
        if (!coreItem) {
            console.warn(`Core not found in repository for name ${def.name} and level ${drop.level}`);
            return;
        }

        player.inventory.push(coreItem);
        console.log(`Picked up core ${coreItem.name} (level ${drop.level})`);

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

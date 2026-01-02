import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { CoreDrop } from './CoreDrop';
import { CoreRegistry } from './CoreRegistry';
import { CoreItem } from './CoreItem';
import { Player } from '../../Player';
import { Enemy } from '../../enemies/Enemy';

export class CoreDropManager {
    private static instance: CoreDropManager;
    private coreDrops: CoreDrop[] = [];

    private constructor() {}

    public static get Instance(): CoreDropManager {
        return this.instance || (this.instance = new this());
    }

    tryDropCore(scene: THREE.Scene, physicsWorld: CANNON.World, enemy: Enemy, _: Player): boolean {
        if (Math.random() > enemy.itemDropChance) return false;

        const def = CoreRegistry.Instance.getRandomCore();
        if (!def) return false;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        const drop = new CoreDrop(scene, pos, def.id, def.name, def.buyPrice, def.sellPrice);
        this.coreDrops.push(drop);
        console.log(`Enemy dropped core ${def.name}`);
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
        const def = CoreRegistry.Instance.getCoreById(drop.coreId);
        if (!def) {
            console.warn(`Core definition not found for ${drop.coreId}`);
            return;
        }

        const newItem = new CoreItem(
            crypto.randomUUID(),
            def.name,
            def.buyPrice,
            def.sellPrice,
            def.stats
        );

        player.inventory.push(newItem);
        console.log(`Picked up core ${def.name}`);

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

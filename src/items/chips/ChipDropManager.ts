import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ChipDrop } from './ChipDrop';
import { ChipRegistry } from './ChipRegistry';
import { ChipRepository } from './ChipRepository';
import { Player } from '../../Player';
import { Enemy } from '../../enemies/Enemy';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipDropManager {
    private static instance: ChipDropManager;
    private chipDrops: ChipDrop[] = [];

    private constructor() {}

    public static get Instance(): ChipDropManager {
        return this.instance || (this.instance = new this());
    }

    tryDropChip(scene: THREE.Scene, enemy: Enemy, player: Player): boolean {
        if (Math.random() > enemy.itemDropChance) return false;

        const def = ChipRegistry.Instance.getRandomChip();
        if (!def) return false;

        const pos = enemy.body.position.clone();
        pos.y = 0.5;

        // Use smart level determination based on player level
        const level = ItemLevelHelper.determineDropLevel(player.level);

        const drop = new ChipDrop(scene, pos, def.id, def.name, def.type, def.buyPrice, def.sellPrice, level);
        this.chipDrops.push(drop);
        console.log(`Enemy dropped chip ${def.name} (level ${level})`);
        return true;
    }

    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        for (const d of this.chipDrops) d.update(deltaTime, cameraPosition, playerPosition);
    }

    checkInteraction(playerPosition: THREE.Vector3): ChipDrop | null {
        for (const d of this.chipDrops) {
            const dist = playerPosition.distanceTo(d.mesh.position);
            if (dist < 1.5) return d;
        }
        return null;
    }

    pickup(scene: THREE.Scene, physicsWorld: CANNON.World, drop: ChipDrop, player: Player): void {
        // Find registry entry to get the base chip type
        const def = ChipRegistry.Instance.getChipById(drop.chipId);
        if (!def) {
            console.warn(`Chip definition not found for ${drop.chipId}`);
            return;
        }

        // Get the leveled chip from the repository
        const chipItem = ChipRepository.Instance.getChipByTypeAndLevel(def.type, drop.level);
        if (!chipItem) {
            console.warn(`Chip not found in repository for type ${def.type} and level ${drop.level}`);
            return;
        }

        player.inventory.push(chipItem);
        console.log(`Picked up chip ${chipItem.name} (level ${drop.level})`);

        const idx = this.chipDrops.indexOf(drop);
        if (idx > -1) {
            drop.cleanup(scene, physicsWorld);
            this.chipDrops.splice(idx, 1);
        }
    }

    clear(scene: THREE.Scene, physicsWorld: CANNON.World): void {
        for (const d of this.chipDrops) d.cleanup(scene, physicsWorld);
        this.chipDrops = [];
    }
}

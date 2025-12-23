import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { WeaponDrop } from './WeaponDrop';
import { WeaponType } from './Weapon';
import { WeaponDefinition, WeaponRegistry } from './WeaponRegistry';
import { Enemy } from '../enemies/Enemy';
import { Player } from '../Player';

/**
 * WeaponDropManager - manages all weapon drops in the world
 * Handles drop generation, updates, interaction, and cleanup
 */
export class WeaponDropManager {
    private weaponDrops: WeaponDrop[] = [];

    /**
     * Try to generate a weapon drop from a defeated enemy
     * Returns true if a weapon was dropped
     */
    tryDropWeapon(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        enemy: Enemy,
        player: Player
    ): boolean {
        // Roll for drop
        if (Math.random() > enemy.weaponDropChance) {
            return false; // No drop
        }

        // Select random weapon type with weighted probability
        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);

        // Get weapon definition from registry
        const weaponDef: WeaponDefinition = WeaponRegistry.Instance.getRandomWeaponOfType(weaponType);
        if (!weaponDef) {
            console.warn(`No weapon found for type ${weaponType}`);
            return false;
        }

        // Calculate bonus using the formula: (1.16 * x - 0.5)^5 * 10
        // This creates a distribution where most weapons are close to base stats
        const random = Math.random();
        const bonusValue = Math.pow(1.16 * random - 0.5, 5) * 10;

        // Apply bonus to base values
        const bonusMultiplier = 1 + bonusValue * 20 / 100;
        const finalDamage = Math.round(weaponDef.baseDamage * bonusMultiplier);

        // Calculate factor for damage diff to avoid small bonus values to raise price without changing the damage
        const damageFactor = finalDamage / weaponDef.baseDamage;
        const finalBuyPrice = Math.round(weaponDef.baseBuyPrice * damageFactor);
        const finalSellPrice = Math.round(weaponDef.baseSellPrice * damageFactor);

        // Create weapon drop at enemy position
        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5; // Slightly above ground

        const weaponDrop = new WeaponDrop(
            scene,
            physicsWorld,
            dropPosition,
            weaponType,
            weaponDef.name,
            finalDamage,
            finalBuyPrice,
            finalSellPrice
        );

        this.weaponDrops.push(weaponDrop);
        console.log(`Enemy dropped ${weaponDef.name} (${weaponType}) with ${bonusMultiplier.toFixed(2)}% bonus (from f(random) = ${bonusValue}) - Damage: ${finalDamage}, Buy: ${finalBuyPrice}, Sell: ${finalSellPrice}`);
        return true;
    }

    /**
     * Select random weapon type with weighted probability
     * Current weapon type gets 45% chance, others split the remaining 55%
     */
    private selectRandomWeaponType(currentWeaponType: WeaponType): WeaponType {
        const allTypes = [
            WeaponType.SWORD,
            WeaponType.DUAL_BLADE,
            WeaponType.LANCE,
            WeaponType.HAMMER
        ];

        const random = Math.random();

        // 45% chance for current weapon type
        if (random < 0.45) {
            return currentWeaponType;
        }

        // 55% chance split among other weapon types (13.75% each)
        const otherTypes = allTypes.filter(type => type !== currentWeaponType);
        const otherIndex = Math.floor((random - 0.45) / (0.55 / otherTypes.length));
        return otherTypes[Math.min(otherIndex, otherTypes.length - 1)];
    }

    /**
     * Update all weapon drops
     */
    update(deltaTime: number, cameraPosition: THREE.Vector3, playerPosition: THREE.Vector3): void {
        for (const drop of this.weaponDrops) {
            drop.update(deltaTime, cameraPosition, playerPosition);
        }
    }

    /**
     * Check if player is near a weapon drop
     */
    checkInteraction(playerPosition: THREE.Vector3): WeaponDrop | null {
        for (const drop of this.weaponDrops) {
            const dist = playerPosition.distanceTo(drop.mesh.position);
            if (dist < 1.5) {
                return drop;
            }
        }
        return null;
    }

    /**
     * Pick up a weapon drop
     */
    pickup(
        scene: THREE.Scene,
        physicsWorld: CANNON.World,
        drop: WeaponDrop,
        player: Player
    ): void {
        // Add weapon to player inventory
        const newItem = {
            id: crypto.randomUUID(),
            name: drop.weaponName,
            type: 'weapon' as const,
            weaponType: drop.weaponType,
            damage: drop.damage,
            buyPrice: drop.buyPrice,
            sellPrice: drop.sellPrice,
            isEquipped: false
        };

        player.inventory.push(newItem);
        console.log(`Picked up ${drop.weaponName} (Damage: ${drop.damage})`);

        // Remove drop from world
        const index = this.weaponDrops.indexOf(drop);
        if (index > -1) {
            drop.cleanup(scene, physicsWorld);
            this.weaponDrops.splice(index, 1);
        }
    }

    /**
     * Clear all weapon drops (when changing stages)
     */
    clear(scene: THREE.Scene, physicsWorld: CANNON.World): void {
        for (const drop of this.weaponDrops) {
            drop.cleanup(scene, physicsWorld);
        }
        this.weaponDrops = [];
    }
}

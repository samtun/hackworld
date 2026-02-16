import * as THREE from 'three';
import { ItemDropStrategy } from '../ItemDropManager';
import { WeaponDrop } from './WeaponDrop';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { WeaponItem } from './WeaponItem';
import { ItemDropType } from '../ItemDropType';

export class WeaponDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.WEAPON;
    // Threshold for becoming eligible for higher level drops (80% of next level requirement)
    private static readonly HIGHER_LEVEL_THRESHOLD = 0.8;
    public readonly distributionWeight = 5;

    tryDrop(scene: THREE.Scene, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        // Apply luck multiplier to drop chance
        const effectiveDropChance = enemy.itemDropChance * player.luckMultiplier;
        
        if (Math.random() > effectiveDropChance) return null;

        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        const weaponLevel = this.determineWeaponLevel(player.getTechForWeapon(weaponType));
        const weaponItem = WeaponRepository.Instance.getWeaponByTypeAndLevel(weaponType, weaponLevel);
        if (!weaponItem) return null;

        // Guard against zero damage
        if (weaponItem.damage <= 0) {
            console.warn(`Weapon ${weaponItem.name} has invalid damage: ${weaponItem.damage}`);
            return null;
        }

        const random = Math.random();
        const bonusValue = Math.pow(1.16 * random - 0.5, 5) * 10;
        const bonusMultiplier = 1 + bonusValue * 20 / 100;
        const finalDamage = Math.round(weaponItem.damage * bonusMultiplier);
        const damageFactor = finalDamage / weaponItem.damage;
        const finalBuyPrice = Math.round(weaponItem.buyPrice * damageFactor);
        const finalSellPrice = Math.round(weaponItem.sellPrice * damageFactor);

        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5;

        const wd = new WeaponDrop(
            weaponItem.id,
            scene,
            dropPosition,
            weaponType,
            weaponItem.name,
            finalDamage,
            finalBuyPrice,
            finalSellPrice,
            weaponLevel
        );
        console.log(`Enemy dropped ${weaponItem.name} (${weaponType}) Level ${weaponLevel} - Damage: ${finalDamage}`);
        return wd;
    }

    private selectRandomWeaponType(currentWeaponType: WeaponType): WeaponType {
        const allTypes = [WeaponType.SWORD, WeaponType.DUAL_BLADE, WeaponType.LANCE, WeaponType.HAMMER];
        const random = Math.random();
        if (random < 0.45) return currentWeaponType;
        const otherTypes = allTypes.filter(t => t !== currentWeaponType);
        const otherIndex = Math.floor((random - 0.45) / (0.55 / otherTypes.length));
        return otherTypes[Math.min(otherIndex, otherTypes.length - 1)];
    }

    /**
     * Determine the weapon level to drop based on player's tech stat for the weapon type
     * 
     * Logic:
     * 1. Base level is determined by player's tech stat (highest level they can equip)
     * 2. Single random roll determines the drop variation:
     *    - 25% chance to drop 1 level lower (only if base level > 1)
     *    - 25% chance to drop 1 level higher (only if player has 80%+ of next level's tech requirement)
     *    - Remaining probability drops at base level
     * 
     * Probability distribution examples:
     * - Both directions possible: 25% lower, 25% higher, 50% base
     * - Only one direction possible: 25% special, 75% base
     * - No special drops available: 100% base
     */
    private determineWeaponLevel(playerTech: number): number {
        // Determine base level (highest level player can equip)
        let baseLevel = 1;
        for (let i = 0; i < WeaponItem.WEAPON_LEVELS.length; i++) {
            if (playerTech >= WeaponItem.WEAPON_LEVELS[i].requiredTech) {
                baseLevel = i + 1; // Level is 1-indexed
            } else {
                break;
            }
        }

        // Check if player is at 80% or more of next level requirement
        const nextLevelIndex = baseLevel; // Index in array (0-based) for next level
        let canDropHigher = false;
        if (nextLevelIndex < WeaponItem.WEAPON_LEVELS.length) {
            const nextLevelReq = WeaponItem.WEAPON_LEVELS[nextLevelIndex].requiredTech;
            const threshold = nextLevelReq * WeaponDropStrategy.HIGHER_LEVEL_THRESHOLD;
            if (playerTech >= threshold) {
                canDropHigher = true;
            }
        }

        // Single roll for drop level variation
        const roll = Math.random();

        // 25% chance to drop 1 level lower (if possible)
        if (roll < 0.25 && baseLevel > 1) {
            return baseLevel - 1;
        }

        // 25% chance to drop 1 level higher (if eligible)
        // Checked in range [0.25, 0.5) to give it a true 25% chance
        if (roll >= 0.25 && roll < 0.5 && canDropHigher) {
            return baseLevel + 1;
        }

        // Default: drop at base level
        // This covers range [0.5, 1.0) plus any probability from unavailable special drops
        return baseLevel;
    }

    pickup(drop: WeaponDrop, player: Player): void {
        const weaponItem = WeaponRepository.Instance.getWeaponById(drop.weaponId);
        if (!weaponItem) {
            console.warn(`Weapon not found for ${drop.weaponId}`);
            return;
        }

        player.inventory.push(weaponItem);
        console.log(`Picked up ${weaponItem}`);
    }
}

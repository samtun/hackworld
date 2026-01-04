import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { WeaponDrop } from '../weapons/WeaponDrop';
import { WeaponRepository } from '../weapons/WeaponRepository';
import { WeaponType } from '../weapons/WeaponType';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { WeaponItem } from '../weapons/WeaponItem';

export class WeaponDropStrategy implements ItemDropStrategy {
    // Weapon level tech requirements (from WeaponItem.WEAPON_LEVELS)
    private static readonly WEAPON_LEVEL_TECH_REQUIREMENTS = [
        { level: 1, requiredTech: 0 },
        { level: 2, requiredTech: 120 },
        { level: 3, requiredTech: 460 },
        { level: 4, requiredTech: 720 },
        { level: 5, requiredTech: 1280 },
        { level: 6, requiredTech: 2500 }
    ];

    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        const weaponLevel = this.determineWeaponLevel(weaponType, player);
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
     * 2. If player has 80%+ of next level's tech requirement, 25% chance to drop 1 level higher
     * 3. Always 25% chance to drop 1 level lower than base level
     */
    private determineWeaponLevel(weaponType: WeaponType, player: Player): number {
        const playerTech = player.getTechForWeapon(weaponType);
        
        // Determine base level (highest level player can equip)
        let baseLevel = 1;
        for (const levelDef of WeaponDropStrategy.WEAPON_LEVEL_TECH_REQUIREMENTS) {
            if (playerTech >= levelDef.requiredTech) {
                baseLevel = levelDef.level;
            } else {
                break;
            }
        }
        
        // Check if player is at 80% or more of next level requirement
        const nextLevelIndex = baseLevel; // Index in array (0-based) for next level
        let canDropHigher = false;
        if (nextLevelIndex < WeaponDropStrategy.WEAPON_LEVEL_TECH_REQUIREMENTS.length) {
            const nextLevelReq = WeaponDropStrategy.WEAPON_LEVEL_TECH_REQUIREMENTS[nextLevelIndex].requiredTech;
            const threshold = nextLevelReq * 0.8;
            if (playerTech >= threshold) {
                canDropHigher = true;
            }
        }
        
        // 25% chance to drop 1 level lower
        const lowerRoll = Math.random();
        if (lowerRoll < 0.25 && baseLevel > 1) {
            return baseLevel - 1;
        }
        
        // 25% chance to drop 1 level higher (if eligible)
        const higherRoll = Math.random();
        if (canDropHigher && higherRoll < 0.25) {
            return baseLevel + 1;
        }
        
        // Default: drop at base level
        return baseLevel;
    }

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: WeaponDrop, player: Player): void {
        const weaponItem = WeaponRepository.Instance.getWeaponByTypeAndLevel(drop.weaponType, drop.level);
        const model = weaponItem ? weaponItem.model : 'models/sword.glb';

        const newItem = new WeaponItem(
            crypto.randomUUID(),
            drop.weaponName,
            drop.buyPrice,
            drop.sellPrice,
            drop.weaponType,
            drop.damage,
            model,
            drop.level
        );

        player.inventory.push(newItem);
        console.log(`Picked up ${drop.weaponName} (Damage: ${drop.damage})`);
    }

}

import { ItemDropStrategy } from '../ItemDropManager';
import { WeaponDrop } from './WeaponDrop';
import { WeaponRepository } from './WeaponRepository';
import { WeaponType } from './WeaponType';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../player/Player';
import { WeaponItem } from './WeaponItem';
import { ItemDropType } from '../ItemDropType';
import { WeaponBonusCalculator } from './WeaponBonusCalculator';
import { ItemDropFactory } from '../ItemDropFactory';

export class WeaponDropStrategy implements ItemDropStrategy {
    readonly key = ItemDropType.WEAPON;
    // Threshold for becoming eligible for higher level drops (80% of next level requirement)
    private static readonly HIGHER_LEVEL_THRESHOLD = 0.8;
    public getDistributionWeight(_enemy: Enemy, _player: Player): number {
        return 2.5;
    }

    constructor(
        private readonly weaponRepository: WeaponRepository,
        private readonly itemDropFactory: ItemDropFactory,
        private readonly weaponBonusCalculator: WeaponBonusCalculator
    ) { }

    drop(enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        const weaponLevel = this.determineWeaponLevel(player.getTechForWeapon(weaponType));
        const weaponItem = this.weaponRepository.getWeaponByTypeAndLevel(weaponType, weaponLevel);

        const random = Math.random();
        // avoid NaN when base is negative and exponent is non-integer
        const raw = 1.16 * random - 0.55;

        // Scale the bonus spread by the player's level factor (1.0 at level 1, 1.5 at max level)
        // plus any collection bonus from completed B.002/B.003 albums
        const effectiveDropFactor = player.weaponDropBonusFactor + player.collectionBonusWeaponDropFactor;
        // Use a curve to keep values close to 1 more common, but allow up to ~1.5x for high rolls with high effective drop factors
        const baseBonus = Math.sign(raw) * Math.pow(Math.abs(raw), 3.4);
        let bonusValue = Math.min(baseBonus * effectiveDropFactor, 1.5);
        const bonusMultiplier = 1 + bonusValue;
        console.log(`Dropping weapon with raw bonus: ${baseBonus.toFixed(3)}, effective drop bonus factor: ${effectiveDropFactor.toFixed(2)}, final bonus multiplier: ${bonusMultiplier.toFixed(3)}`);

        const finalDamage = Math.floor(weaponItem.damage * bonusMultiplier);
        const damageFactor = finalDamage / weaponItem.damage;
        const finalBuyPrice = Math.floor(weaponItem.buyPrice * damageFactor);
        const finalSellPrice = Math.floor(weaponItem.sellPrice * damageFactor);

        const dropPosition = enemy.getDeathPosition();
        dropPosition.y += 0.5;

        const wd = this.itemDropFactory.createWeaponDrop(
            weaponItem.id,
            dropPosition,
            weaponType,
            weaponItem.name,
            finalDamage,
            finalBuyPrice,
            finalSellPrice,
            weaponLevel,
            damageFactor
        );
        console.log(`Enemy dropped ${weaponItem.name} (${weaponType}) Level ${weaponLevel} - Damage: ${finalDamage}, damage factor: ${damageFactor.toFixed(6)}`);
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
        const baseWeapon = this.weaponRepository.getWeaponById(drop.weaponId);
        if (!baseWeapon) {
            console.warn(`Weapon not found for ${drop.weaponId}`);
            return;
        }

        // Re-apply the bonus from the drop using the shared calculator so that
        // tier assignment follows the same "only when damage changes" rule.
        const bonusMultiplier = drop.damage / baseWeapon.damage;
        const weaponItem = this.weaponBonusCalculator.applyWeaponBonus(baseWeapon, bonusMultiplier);

        player.inventory.push(weaponItem);
        console.log(`Picked up ${weaponItem.name} with ${weaponItem.damage} damage`);
    }
}

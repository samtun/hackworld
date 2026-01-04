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
    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        const weaponItem = WeaponRepository.Instance.getRandomWeaponOfType(weaponType);
        if (!weaponItem) return null;

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
            1
        );
        console.log(`Enemy dropped ${weaponItem.name} (${weaponType}) - Damage: ${finalDamage}`);
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

    pickup(_scene: THREE.Scene, _physicsWorld: CANNON.World, drop: WeaponDrop, player: Player): void {
        const weaponItem = WeaponRepository.Instance.getWeaponByType(drop.weaponType);
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

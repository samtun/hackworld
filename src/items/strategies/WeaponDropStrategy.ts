import * as THREE from 'three';
import * as CANNON from 'cannon-es';
import { ItemDropStrategy } from '../ItemDropManager';
import { WeaponDrop } from '../weapons/WeaponDrop';
import { WeaponRegistry } from '../weapons/WeaponRegistry';
import { WeaponType } from '../weapons/WeaponType';
import { Enemy } from '../../enemies/Enemy';
import { Player } from '../../Player';
import { WeaponItem } from '../weapons/WeaponItem';

export class WeaponDropStrategy implements ItemDropStrategy {
    tryDrop(scene: THREE.Scene, _physicsWorld: CANNON.World, enemy: Enemy, player: Player): import("../ItemDrop").ItemDrop | null {
        if (Math.random() > enemy.itemDropChance) return null;

        const weaponType = this.selectRandomWeaponType(player.currentWeaponType);
        const weaponDef = WeaponRegistry.Instance.getRandomWeaponOfType(weaponType);
        if (!weaponDef) return null;

        const random = Math.random();
        const bonusValue = Math.pow(1.16 * random - 0.5, 5) * 10;
        const bonusMultiplier = 1 + bonusValue * 20 / 100;
        const finalDamage = Math.round(weaponDef.baseDamage * bonusMultiplier);
        const damageFactor = finalDamage / weaponDef.baseDamage;
        const finalBuyPrice = Math.round(weaponDef.baseBuyPrice * damageFactor);
        const finalSellPrice = Math.round(weaponDef.baseSellPrice * damageFactor);

        const dropPosition = enemy.body.position.clone();
        dropPosition.y = 0.5;

        const wd = new WeaponDrop(
            scene,
            dropPosition,
            weaponType,
            weaponDef.name,
            finalDamage,
            finalBuyPrice,
            finalSellPrice,
            1
        );
        console.log(`Enemy dropped ${weaponDef.name} (${weaponType}) - Damage: ${finalDamage}`);
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
        const weaponDef = WeaponRegistry.Instance.getWeaponByType(drop.weaponType);
        const model = weaponDef ? weaponDef.model : 'models/sword.glb';

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

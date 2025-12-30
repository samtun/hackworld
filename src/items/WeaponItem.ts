import { EquippableItem } from './EquippableItem';
import { Player } from '../Player';
import { WeaponType, Weapon } from './Weapon';

export class WeaponItem extends EquippableItem {
    weaponType: WeaponType;
    damage: number;
    model: string;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, weaponType: WeaponType, damage: number, model: string) {
        super(id, name, buyPrice, sellPrice);
        this.weaponType = weaponType;
        this.damage = damage;
        this.model = model;
    }

    getType(): string {
        return 'weapon';
    }

    equip(player: Player): void {
        // Unequip other weapons
        player.inventory.forEach(item => {
            if (item instanceof WeaponItem && item !== this && item.isEquipped) {
                item.unequip(player);
            }
        });

        // Logic to equip weapon on player
        // This requires Player to expose scene and world, or a method to set weapon
        player.setWeapon(this);
        this.isEquipped = true;
    }

    unequip(player: Player): void {
        this.isEquipped = false;
        // Logic to unequip is handled by equipping another weapon or explicitly removing
    }

    clone(newId?: string): WeaponItem {
        return new WeaponItem(
            newId || this.id,
            this.name,
            this.buyPrice,
            this.sellPrice,
            this.weaponType,
            this.damage,
            this.model
        );
    }
}

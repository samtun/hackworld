import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
import { WeaponType, Weapon } from './Weapon';

export class WeaponItem extends EquippableItem {
    weaponType: WeaponType;
    damage: number;
    model: string;
    // fixed numeric level for this weapon instance (1 = α, 2 = β, ...)
    level: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, weaponType: WeaponType, damage: number, model: string, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.weaponType = weaponType;
        this.damage = damage;
        this.model = model;
        this.level = level;
    }

    getType(): string {
        return 'weapon';
    }

    equip(player: Player): void {
        // Check player's tech for this weapon type against required tech for this weapon's level
        const lvlDef = Weapon.getLevelByNumber(this.level);
        const playerTech = player.getTechForWeapon(this.weaponType);
        if (lvlDef && playerTech < lvlDef.requiredTech) {
            console.log(`Cannot equip ${this.name} ${this.level}: requires ${lvlDef.requiredTech} tech, player has ${playerTech}`);
            return; // Do not equip
        }

        // Unequip other weapons
        player.inventory.forEach(item => {
            if (item instanceof WeaponItem && item !== this && item.isEquipped) {
                item.unequip(player);
            }
        });

        // Logic to equip weapon on player
        player.setWeapon(this);
        this.isEquipped = true;
    }

    unequip(_: Player): void {
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
            this.model,
            this.level
        );
    }
}

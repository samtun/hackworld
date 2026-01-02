import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
import { WeaponType } from './WeaponType';

export class WeaponItem extends EquippableItem {
    weaponType: WeaponType;
    damage: number;
    model: string;
    // fixed numeric level for this weapon instance (1 = α, 2 = β, ...)
    level: number;

    // Level metadata owned by the WeaponItem instance
    private static WEAPON_LEVELS = [
        { requiredTech: 0, damagePercent: 1 }, // α
        { requiredTech: 120, damagePercent: 1.80 }, // β
        { requiredTech: 460, damagePercent: 3.20 }, // γ
        { requiredTech: 720, damagePercent: 6.20 }, // δ
        { requiredTech: 1280, damagePercent: 9.80 }, // ε
        { requiredTech: 2500, damagePercent: 14.00 } // ω
    ];

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, weaponType: WeaponType, damage: number, model: string, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.weaponType = weaponType;
        this.damage = damage;
        this.model = model;
        this.level = level;
    }

    // Return level definition by numeric level (1-based). Throws if level <= 0.
    public getLevelByNumber(): { requiredTech: number; damagePercent: number } {
        const lvl = this.level;
        if (lvl <= 0) throw new Error('Weapon level must be >= 1');
        if (lvl > WeaponItem.WEAPON_LEVELS.length) return WeaponItem.WEAPON_LEVELS[WeaponItem.WEAPON_LEVELS.length - 1];
        return WeaponItem.WEAPON_LEVELS[lvl - 1];
    }

    // Return multiplier for numeric level
    public getDamageMultiplierFromLevelNumber(): number {
        return this.getLevelByNumber().damagePercent;
    }

    getType(): string {
        return 'weapon';
    }

    equip(player: Player): void {
        // Check player's tech for this weapon type against required tech for this weapon's level
        const lvlDef = this.getLevelByNumber();
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

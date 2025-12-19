import { WeaponType } from './Weapon';

/**
 * Weapon definition interface
 */
export interface WeaponDefinition {
    id: string;
    name: string;
    type: WeaponType;
    baseDamage: number;
    baseBuyPrice: number;
    baseSellPrice: number;
}

/**
 * Centralized weapon registry - single source of truth for all weapons in the game
 */
export class WeaponRegistry {
    private static weapons: WeaponDefinition[] = [
        {
            id: 'aegis_sword',
            name: 'Aegis Sword',
            type: WeaponType.SWORD,
            baseDamage: 10,
            baseBuyPrice: 100,
            baseSellPrice: 50
        },
        {
            id: 'rune_blade',
            name: 'Rune Blade',
            type: WeaponType.DUAL_BLADE,
            baseDamage: 7,
            baseBuyPrice: 150,
            baseSellPrice: 75
        },
        {
            id: 'fierce',
            name: 'Fierce',
            type: WeaponType.LANCE,
            baseDamage: 12,
            baseBuyPrice: 120,
            baseSellPrice: 60
        },
        {
            id: 'battle_hawk',
            name: 'Battle Hawk',
            type: WeaponType.HAMMER,
            baseDamage: 18,
            baseBuyPrice: 180,
            baseSellPrice: 90
        }
    ];

    /**
     * Get all weapons
     */
    static getAllWeapons(): WeaponDefinition[] {
        return [...this.weapons];
    }

    /**
     * Get weapon by ID
     */
    static getWeaponById(id: string): WeaponDefinition | undefined {
        return this.weapons.find(w => w.id === id);
    }

    /**
     * Get weapon by type (returns first weapon of that type)
     */
    static getWeaponByType(type: WeaponType): WeaponDefinition | undefined {
        return this.weapons.find(w => w.type === type);
    }

    /**
     * Get all weapons of a specific type
     */
    static getWeaponsByType(type: WeaponType): WeaponDefinition[] {
        return this.weapons.filter(w => w.type === type);
    }

    /**
     * Get a random weapon of a specific type
     */
    static getRandomWeaponOfType(type: WeaponType): WeaponDefinition | undefined {
        const weaponsOfType = this.getWeaponsByType(type);
        if (weaponsOfType.length === 0) return undefined;
        return weaponsOfType[Math.floor(Math.random() * weaponsOfType.length)];
    }

    /**
     * Register a new weapon (for extensibility)
     */
    static registerWeapon(weapon: WeaponDefinition): void {
        // Check if weapon with same ID already exists
        const existingIndex = this.weapons.findIndex(w => w.id === weapon.id);
        if (existingIndex >= 0) {
            console.warn(`Weapon with ID ${weapon.id} already exists. Replacing...`);
            this.weapons[existingIndex] = weapon;
        } else {
            this.weapons.push(weapon);
        }
    }
}

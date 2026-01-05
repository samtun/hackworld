import { WeaponType } from './WeaponType';
import { WeaponItem } from './WeaponItem';
import weaponsData from './weapons.json';

/**
 * Centralized weapon repository - single source of truth for all weapons in the game
 * Uses a tree structure: level -> weaponType -> WeaponItem[]
 */
export class WeaponRepository {
    private static instance: WeaponRepository; // Singleton

    // List structure: index corresponds to level - 1 (e.g. index 0 is level 1)
    // Each element is a Map: weaponType -> WeaponItem[]
    private weaponsByLevel: Map<WeaponType, WeaponItem[]>[] = [];

    private constructor() {
        this.loadWeapons();
    }

    private loadWeapons() {
        for (const data of weaponsData) {
            const levelIndex = data.level - 1;
            if (levelIndex < 0) continue;

            // Ensure the level map exists
            if (!this.weaponsByLevel[levelIndex]) {
                this.weaponsByLevel[levelIndex] = new Map<WeaponType, WeaponItem[]>();
            }

            const levelMap = this.weaponsByLevel[levelIndex];

            // Validate weapon type
            const type = data.weaponType as WeaponType;
            if (!Object.values(WeaponType).includes(type)) {
                console.warn(`Invalid weapon type '${data.weaponType}' for weapon '${data.id}'`);
                continue;
            }

            if (!levelMap.has(type)) {
                levelMap.set(type, []);
            }

            const weapon = new WeaponItem(
                data.id,
                data.name,
                data.buyPrice,
                data.sellPrice,
                type,
                data.damage,
                data.model,
                data.level
            );

            levelMap.get(type)!.push(weapon);
        }
    }

    public static get Instance(): WeaponRepository {
        return this.instance || (this.instance = new this());
    }

    /**
     * Get all weapons from all types and levels as a list
     */
    getAllWeapons(): WeaponItem[] {
        const allWeapons: WeaponItem[] = [];

        for (const levelMap of this.weaponsByLevel) {
            if (!levelMap) continue;
            for (const weapons of levelMap.values()) {
                for (const weapon of weapons) {
                    // Return clones with the original ID so they can be looked up later
                    // (e.g. by the trader or debug tools)
                    allWeapons.push(weapon.clone());
                }
            }
        }

        return allWeapons;
    }

    /**
     * Get a random weapon by type and level
     * Returns a cloned instance with the original ID
     */
    getWeaponByTypeAndLevel(type: WeaponType, level: number): WeaponItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.weaponsByLevel.length) return undefined;

        const levelMap = this.weaponsByLevel[levelIndex];
        if (!levelMap) return undefined;

        const weapons = levelMap.get(type);
        if (!weapons || weapons.length === 0) return undefined;

        const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        return randomWeapon.clone();
    }

    /**
     * Get a random weapon of a specific level
     * Returns a cloned instance with the original ID
     */
    getRandomWeaponOfLevel(level: number): WeaponItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.weaponsByLevel.length) return undefined;

        const levelMap = this.weaponsByLevel[levelIndex];
        if (!levelMap) return undefined;

        const allWeaponsAtLevel: WeaponItem[] = [];
        for (const weapons of levelMap.values()) {
            allWeaponsAtLevel.push(...weapons);
        }

        if (allWeaponsAtLevel.length === 0) return undefined;

        const randomWeapon = allWeaponsAtLevel[Math.floor(Math.random() * allWeaponsAtLevel.length)];
        return randomWeapon.clone();
    }

    /**
     * Get weapon by ID
     * Returns a cloned instance with the original ID
     */
    getWeaponById(id: string): WeaponItem | undefined {
        for (const levelMap of this.weaponsByLevel) {
            if (!levelMap) continue;
            for (const weapons of levelMap.values()) {
                const weapon = weapons.find(w => w.id === id);
                if (weapon) {
                    return weapon.clone();
                }
            }
        }
        return undefined;
    }

    /**
     * Get all weapons of a specific type (from all levels)
     * Returns cloned instances with the original ID
     */
    getWeaponsByType(type: WeaponType): WeaponItem[] {
        const weaponsOfType: WeaponItem[] = [];

        for (const levelMap of this.weaponsByLevel) {
            if (!levelMap) continue;
            const weapons = levelMap.get(type);
            if (weapons) {
                for (const weapon of weapons) {
                    weaponsOfType.push(weapon.clone());
                }
            }
        }

        return weaponsOfType;
    }
}

import { WeaponType } from './WeaponType';
import { WeaponItem } from './WeaponItem';

/**
 * Centralized weapon repository - single source of truth for all weapons in the game
 * Uses a tree structure: level -> weaponType -> WeaponItem[]
 */
export class WeaponRepository {
    private static instance: WeaponRepository; // Singleton
    
    // Tree structure: level (numeric) -> weaponType -> WeaponItem[]
    private weaponsByLevel: Map<number, Map<WeaponType, WeaponItem[]>> = new Map();

    private constructor() {
        this.initializeWeapons();
    }

    public static get Instance(): WeaponRepository {
        return this.instance || (this.instance = new this());
    }

    /**
     * Initialize all predefined weapons in the repository
     */
    private initializeWeapons(): void {
        // Level 1 (α) weapons
        this.addWeapon(1, new WeaponItem(
            'aegis_sword_alpha',
            'Aegis Sword',
            100,
            50,
            WeaponType.SWORD,
            10,
            'models/sword.glb',
            1
        ));

        this.addWeapon(1, new WeaponItem(
            'rune_blade_alpha',
            'Rune Blade',
            150,
            75,
            WeaponType.DUAL_BLADE,
            7,
            'models/double_sword.glb',
            1
        ));

        this.addWeapon(1, new WeaponItem(
            'fierce_lance_alpha',
            'Fierce Lance',
            120,
            60,
            WeaponType.LANCE,
            12,
            'models/lance.glb',
            1
        ));

        this.addWeapon(1, new WeaponItem(
            'battle_hawk_alpha',
            'Battle Hawk',
            180,
            90,
            WeaponType.HAMMER,
            18,
            'models/hammer.glb',
            1
        ));

        // Level 2 (β) weapons - Add test weapon for beta
        this.addWeapon(2, new WeaponItem(
            'aegis_sword_beta',
            'Aegis Sword',
            200,
            100,
            WeaponType.SWORD,
            18,
            'models/sword.glb',
            2
        ));
    }

    /**
     * Add a weapon to the repository at a specific level
     */
    private addWeapon(level: number, weapon: WeaponItem): void {
        if (!this.weaponsByLevel.has(level)) {
            this.weaponsByLevel.set(level, new Map());
        }

        const levelMap = this.weaponsByLevel.get(level)!;
        if (!levelMap.has(weapon.weaponType)) {
            levelMap.set(weapon.weaponType, []);
        }

        levelMap.get(weapon.weaponType)!.push(weapon);
    }

    /**
     * Get all weapons from all types and levels as a list
     */
    getAllWeapons(): WeaponItem[] {
        const allWeapons: WeaponItem[] = [];
        
        for (const levelMap of this.weaponsByLevel.values()) {
            for (const weapons of levelMap.values()) {
                for (const weapon of weapons) {
                    allWeapons.push(weapon.clone(crypto.randomUUID()));
                }
            }
        }
        
        return allWeapons;
    }

    /**
     * Get a random weapon by type and level
     * Returns a cloned instance with a new UUID
     */
    getWeaponByTypeAndLevel(type: WeaponType, level: number): WeaponItem | undefined {
        const levelMap = this.weaponsByLevel.get(level);
        if (!levelMap) return undefined;

        const weapons = levelMap.get(type);
        if (!weapons || weapons.length === 0) return undefined;

        const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        return randomWeapon.clone(crypto.randomUUID());
    }

    /**
     * Get a random weapon of a specific level
     * Returns a cloned instance with a new UUID
     */
    getRandomWeaponOfLevel(level: number): WeaponItem | undefined {
        const levelMap = this.weaponsByLevel.get(level);
        if (!levelMap) return undefined;

        const allWeaponsAtLevel: WeaponItem[] = [];
        for (const weapons of levelMap.values()) {
            allWeaponsAtLevel.push(...weapons);
        }

        if (allWeaponsAtLevel.length === 0) return undefined;

        const randomWeapon = allWeaponsAtLevel[Math.floor(Math.random() * allWeaponsAtLevel.length)];
        return randomWeapon.clone(crypto.randomUUID());
    }

    /**
     * Get weapon by ID
     * Returns a cloned instance with a new UUID
     */
    getWeaponById(id: string): WeaponItem | undefined {
        for (const levelMap of this.weaponsByLevel.values()) {
            for (const weapons of levelMap.values()) {
                const weapon = weapons.find(w => w.id === id);
                if (weapon) {
                    return weapon.clone(crypto.randomUUID());
                }
            }
        }
        return undefined;
    }

    /**
     * Get all weapons of a specific type (from all levels)
     * Returns cloned instances with new UUIDs
     */
    getWeaponsByType(type: WeaponType): WeaponItem[] {
        const weaponsOfType: WeaponItem[] = [];

        for (const levelMap of this.weaponsByLevel.values()) {
            const weapons = levelMap.get(type);
            if (weapons) {
                for (const weapon of weapons) {
                    weaponsOfType.push(weapon.clone(crypto.randomUUID()));
                }
            }
        }

        return weaponsOfType;
    }
}

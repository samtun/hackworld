import { WeaponType } from './WeaponType';
import { WeaponItem } from './WeaponItem';
import weaponsData from './weapons.json';
import { Tier, TierManager } from '../TierManager';
import { singleton } from 'tsyringe';

/**
 * Centralized weapon repository - single source of truth for all weapons in the game
 * Uses a tree structure: level -> weaponType -> WeaponItem[]
 */
@singleton()
export class WeaponRepository {
    private static readonly WEAPON_LEVELS = [
        { suffix: 'alpha', priceKey: 'alpha_price', damageKey: 'alpha_damage' },
        { suffix: 'beta', priceKey: 'beta_price', damageKey: 'beta_damage' },
        { suffix: 'gamma', priceKey: 'gamma_price', damageKey: 'gamma_damage' },
        { suffix: 'delta', priceKey: 'delta_price', damageKey: 'delta_damage' },
        { suffix: 'epsilon', priceKey: 'epsilon_price', damageKey: 'epsilon_damage' },
        { suffix: 'omega', priceKey: 'omega_price', damageKey: 'omega_damage' },
    ] as const;

    private readonly tierManager: TierManager;

    // List structure: index corresponds to level - 1 (e.g. index 0 is level 1)
    // Each element is a Map: weaponType -> WeaponItem[]
    private weaponsByLevel: Map<WeaponType, WeaponItem[]>[] = [];
    private traderWeaponsByLevel: Map<WeaponType, WeaponItem[]>[] = [];

    constructor(tierManager: TierManager) {
        this.tierManager = tierManager;
        this.loadWeapons();
    }

    private loadWeapons() {
        for (const data of weaponsData) {
            // Validate weapon type
            const type = data.weaponType as WeaponType;
            if (!Object.values(WeaponType).includes(type)) {
                console.warn(`Invalid weapon type '${data.weaponType}' for weapon '${data.id}'`);
                continue;
            }

            WeaponRepository.WEAPON_LEVELS.forEach((levelData, levelIndex) => {
                if (!this.weaponsByLevel[levelIndex]) {
                    this.weaponsByLevel[levelIndex] = new Map<WeaponType, WeaponItem[]>();
                    this.traderWeaponsByLevel[levelIndex] = new Map<WeaponType, WeaponItem[]>();
                }

                const levelMap = this.weaponsByLevel[levelIndex];
                const traderLevelMap = this.traderWeaponsByLevel[levelIndex];
                if (!levelMap.has(type)) {
                    levelMap.set(type, []);
                    traderLevelMap.set(type, []);
                }

                const price = data[levelData.priceKey];
                const weapon = new WeaponItem(
                    `${data.id}_${levelData.suffix}`,
                    data.name,
                    price,
                    Math.floor(price / 3),
                    type,
                    data[levelData.damageKey],
                    data.model,
                    this.tierManager.tiers.get(Tier.STABLE)!,
                    levelIndex + 1,
                );

                levelMap.get(type)!.push(weapon);
                if (data.traderEligible) {
                    traderLevelMap.get(type)!.push(weapon);
                }
            });
        }
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
    getWeaponByTypeAndLevel(type: WeaponType, level: number): WeaponItem {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.weaponsByLevel.length) throw new Error(`Invalid weapon level ${level} for type ${type}`);

        const levelMap = this.weaponsByLevel[levelIndex];
        if (!levelMap) throw new Error(`No weapons found for level ${level}`);

        const weapons = levelMap.get(type);
        if (!weapons || weapons.length === 0) throw new Error(`No weapons found for type ${type} at level ${level}`);

        const randomWeapon = weapons[Math.floor(Math.random() * weapons.length)];
        return randomWeapon.clone();
    }

    /**
     * Get all trader-eligible weapons for a type and level.
     * Returns cloned instances, or an empty list when no candidates exist.
     */
    getTraderEligibleWeaponsByTypeAndLevel(type: WeaponType, level: number): WeaponItem[] {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.traderWeaponsByLevel.length) return [];

        const levelMap = this.traderWeaponsByLevel[levelIndex];
        return levelMap?.get(type)?.map(weapon => weapon.clone()) ?? [];
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

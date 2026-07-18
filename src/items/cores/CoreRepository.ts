import { singleton } from 'tsyringe';
import { CoreItem } from './CoreItem';
import coresData from './cores.json';

/**
 * Centralized core repository - single source of truth for all cores in the game
 * Uses a tree structure: level -> core name -> CoreItem[]
 */
@singleton()
export class CoreRepository {
    // List structure: index corresponds to level - 1 (e.g. index 0 is level 1)
    // Each element is a Map: coreName -> CoreItem[]
    private coresByLevel: Map<string, CoreItem[]>[] = [];

    constructor() {
        this.loadCores();
    }

    private loadCores() {
        for (const data of coresData) {
            const levelIndex = data.level - 1;
            if (levelIndex < 0) continue;

            // Ensure the level map exists
            if (!this.coresByLevel[levelIndex]) {
                this.coresByLevel[levelIndex] = new Map<string, CoreItem[]>();
            }

            const levelMap = this.coresByLevel[levelIndex];

            if (!levelMap.has(data.name)) {
                levelMap.set(data.name, []);
            }

            const core = new CoreItem(
                data.id,
                data.name,
                data.buyPrice,
                data.sellPrice,
                data.stats,
                data.level
            );

            levelMap.get(data.name)!.push(core);
        }
    }

    /**
     * Get all cores from all levels as a list
     */
    getAllCores(): CoreItem[] {
        const allCores: CoreItem[] = [];

        for (const levelMap of this.coresByLevel) {
            if (!levelMap) continue;
            for (const cores of levelMap.values()) {
                for (const core of cores) {
                    // Return clones with the original ID so they can be looked up later
                    // (e.g. by the trader or debug tools)
                    allCores.push(core.clone());
                }
            }
        }

        return allCores;
    }

    /**
     * Get a core by name and level
     * Returns a cloned instance with the original ID
     */
    getCoreByNameAndLevel(name: string, level: number): CoreItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.coresByLevel.length) return undefined;

        const levelMap = this.coresByLevel[levelIndex];
        if (!levelMap) return undefined;

        const cores = levelMap.get(name);
        if (!cores || cores.length === 0) return undefined;

        const core = cores[Math.floor(Math.random() * cores.length)];
        return core.clone();
    }

    /**
     * Get a random core of a specific level
     * Returns a cloned instance with the original ID
     */
    getRandomCoreOfLevel(level: number): CoreItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.coresByLevel.length) return undefined;

        const levelMap = this.coresByLevel[levelIndex];
        if (!levelMap) return undefined;

        const allCoresAtLevel: CoreItem[] = [];
        for (const cores of levelMap.values()) {
            allCoresAtLevel.push(...cores);
        }

        if (allCoresAtLevel.length === 0) return undefined;

        const randomCore = allCoresAtLevel[Math.floor(Math.random() * allCoresAtLevel.length)];
        return randomCore.clone();
    }

    /**
     * Get core by ID
     * Returns a cloned instance with the original ID
     */
    getCoreById(id: string): CoreItem | undefined {
        for (const levelMap of this.coresByLevel) {
            if (!levelMap) continue;
            for (const cores of levelMap.values()) {
                const core = cores.find(c => c.id === id);
                if (core) {
                    return core.clone();
                }
            }
        }
        return undefined;
    }

    /**
     * Get all cores with a specific name (from all levels)
     * Returns cloned instances with the original ID
     */
    getCoresByName(name: string): CoreItem[] {
        const coresWithName: CoreItem[] = [];

        for (const levelMap of this.coresByLevel) {
            if (!levelMap) continue;
            const cores = levelMap.get(name);
            if (cores) {
                for (const core of cores) {
                    coresWithName.push(core.clone());
                }
            }
        }

        return coresWithName;
    }
}

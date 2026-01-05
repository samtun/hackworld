import { ChipType } from './Chip';
import { ChipItem } from './ChipItem';
import chipsData from './chips.json';

/**
 * Centralized chip repository - single source of truth for all chips in the game
 * Uses a tree structure: level -> chipType -> ChipItem[]
 */
export class ChipRepository {
    private static instance: ChipRepository; // Singleton

    // List structure: index corresponds to level - 1 (e.g. index 0 is level 1)
    // Each element is a Map: chipType -> ChipItem[]
    private chipsByLevel: Map<ChipType, ChipItem[]>[] = [];

    private constructor() {
        this.loadChips();
    }

    private loadChips() {
        for (const data of chipsData) {
            const levelIndex = data.level - 1;
            if (levelIndex < 0) continue;

            // Ensure the level map exists
            if (!this.chipsByLevel[levelIndex]) {
                this.chipsByLevel[levelIndex] = new Map<ChipType, ChipItem[]>();
            }

            const levelMap = this.chipsByLevel[levelIndex];

            // Validate chip type
            const type = data.chipType as ChipType;
            if (!Object.values(ChipType).includes(type)) {
                console.warn(`Invalid chip type '${data.chipType}' for chip '${data.id}'`);
                continue;
            }

            if (!levelMap.has(type)) {
                levelMap.set(type, []);
            }

            const chip = new ChipItem(
                data.id,
                data.name,
                data.buyPrice,
                data.sellPrice,
                type,
                data.stats,
                data.level
            );

            levelMap.get(type)!.push(chip);
        }
    }

    public static get Instance(): ChipRepository {
        return this.instance || (this.instance = new this());
    }

    /**
     * Get all chips from all types and levels as a list
     */
    getAllChips(): ChipItem[] {
        const allChips: ChipItem[] = [];

        for (const levelMap of this.chipsByLevel) {
            if (!levelMap) continue;
            for (const chips of levelMap.values()) {
                for (const chip of chips) {
                    // Return clones with the original ID so they can be looked up later
                    // (e.g. by the trader or debug tools)
                    allChips.push(chip.clone());
                }
            }
        }

        return allChips;
    }

    /**
     * Get a chip by type and level
     * Returns a cloned instance with the original ID
     */
    getChipByTypeAndLevel(type: ChipType, level: number): ChipItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.chipsByLevel.length) return undefined;

        const levelMap = this.chipsByLevel[levelIndex];
        if (!levelMap) return undefined;

        const chips = levelMap.get(type);
        if (!chips || chips.length === 0) return undefined;

        const chip = chips[Math.floor(Math.random() * chips.length)];
        return chip.clone();
    }

    /**
     * Get a random chip of a specific level
     * Returns a cloned instance with the original ID
     */
    getRandomChipOfLevel(level: number): ChipItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.chipsByLevel.length) return undefined;

        const levelMap = this.chipsByLevel[levelIndex];
        if (!levelMap) return undefined;

        const allChipsAtLevel: ChipItem[] = [];
        for (const chips of levelMap.values()) {
            allChipsAtLevel.push(...chips);
        }

        if (allChipsAtLevel.length === 0) return undefined;

        const randomChip = allChipsAtLevel[Math.floor(Math.random() * allChipsAtLevel.length)];
        return randomChip.clone();
    }

    /**
     * Get chip by ID
     * Returns a cloned instance with the original ID
     */
    getChipById(id: string): ChipItem | undefined {
        for (const levelMap of this.chipsByLevel) {
            if (!levelMap) continue;
            for (const chips of levelMap.values()) {
                const chip = chips.find(c => c.id === id);
                if (chip) {
                    return chip.clone();
                }
            }
        }
        return undefined;
    }

    /**
     * Get chip by name and level (used for save loading)
     * Returns a cloned instance with a new UUID
     */
    getChipByNameAndLevel(name: string, level: number): ChipItem | undefined {
        const levelIndex = level - 1;
        if (levelIndex < 0 || levelIndex >= this.chipsByLevel.length) return undefined;

        const levelMap = this.chipsByLevel[levelIndex];
        if (!levelMap) return undefined;

        for (const chips of levelMap.values()) {
            const chip = chips.find(c => c.name === name);
            if (chip) {
                return chip.clone(crypto.randomUUID());
            }
        }
        return undefined;
    }

    /**
     * Get all chips of a specific type (from all levels)
     * Returns cloned instances with the original ID
     */
    getChipsByType(type: ChipType): ChipItem[] {
        const chipsOfType: ChipItem[] = [];

        for (const levelMap of this.chipsByLevel) {
            if (!levelMap) continue;
            const chips = levelMap.get(type);
            if (chips) {
                for (const chip of chips) {
                    chipsOfType.push(chip.clone());
                }
            }
        }

        return chipsOfType;
    }
}

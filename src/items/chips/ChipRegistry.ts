import { ChipType, ChipStats } from './Chip';

/**
 * Chip definition interface
 */
export interface ChipDefinition {
    id: string;
    name: string;
    type: ChipType;
    stats: ChipStats;
    buyPrice: number;
    sellPrice: number;
}

/**
 * Centralized chip registry - single source of truth for all chips in the game
 */
export class ChipRegistry {
    private static instance: ChipRegistry;
    private chips: ChipDefinition[] = [
        {
            id: 'firewire',
            name: 'Firewire',
            type: ChipType.FIREWIRE,
            stats: { weaponRangeMultiplier: 1.1 }, // 10% increase
            buyPrice: 150,
            sellPrice: 75
        },
        {
            id: 'overclock',
            name: 'Overclock',
            type: ChipType.OVERCLOCK,
            stats: { walkSpeedMultiplier: 1.1 }, // 10% increase
            buyPrice: 150,
            sellPrice: 75
        }
    ];

    public static get Instance(): ChipRegistry {
        return this.instance || (this.instance = new this());
    }

    /**
     * Get all chips
     */
    getAllChips(): ChipDefinition[] {
        return [...this.chips];
    }

    /**
     * Get chip by ID
     */
    getChipById(id: string): ChipDefinition | undefined {
        return this.chips.find(c => c.id === id);
    }

    /**
     * Get chip by type
     */
    getChipByType(type: ChipType): ChipDefinition | undefined {
        return this.chips.find(c => c.type === type);
    }

    /**
     * Get a random chip
     */
    getRandomChip(): ChipDefinition | undefined {
        if (this.chips.length === 0) return undefined;
        return this.chips[Math.floor(Math.random() * this.chips.length)];
    }

    /**
     * Register a new chip (for extensibility)
     */
    registerChip(chip: ChipDefinition): void {
        // Check if chip with same ID already exists
        const existingIndex = this.chips.findIndex(c => c.id === chip.id);
        if (existingIndex >= 0) {
            console.warn(`Chip with ID ${chip.id} already exists. Replacing...`);
            this.chips[existingIndex] = chip;
        } else {
            this.chips.push(chip);
        }
    }
}

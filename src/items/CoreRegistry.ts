import { CoreStats } from './Core';

/**
 * Core definition interface
 */
export interface CoreDefinition {
    id: string;
    name: string;
    stats: CoreStats;
    buyPrice: number;
    sellPrice: number;
}

/**
 * Centralized core registry - single source of truth for all cores in the game
 * Unlike weapons, core stats are fixed and don't have random bonuses
 */
export class CoreRegistry {
    private static instance: CoreRegistry;
    private cores: CoreDefinition[] = [
        {
            id: 'herald_core',
            name: 'Herald Core',
            stats: { strength: 3, defense: 2 },
            buyPrice: 200,
            sellPrice: 100
        },
        {
            id: 'swift_core',
            name: 'Swift Core',
            stats: { speed: 4, defense: -2 },
            buyPrice: 150,
            sellPrice: 75
        },
        {
            id: 'defender_core',
            name: 'Defender Core',
            stats: { strength: -1, defense: 4 },
            buyPrice: 180,
            sellPrice: 90
        }
    ];

    private constructor() {
    }

    public static get Instance(): CoreRegistry {
        return this.instance || (this.instance = new this());
    }

    /**
     * Get all cores
     */
    getAllCores(): CoreDefinition[] {
        return [...this.cores];
    }

    /**
     * Get core by ID
     */
    getCoreById(id: string): CoreDefinition | undefined {
        return this.cores.find(c => c.id === id);
    }

    /**
     * Get a random core
     */
    getRandomCore(): CoreDefinition | undefined {
        if (this.cores.length === 0) return undefined;
        return this.cores[Math.floor(Math.random() * this.cores.length)];
    }

    /**
     * Register a new core (for extensibility)
     */
    registerCore(core: CoreDefinition): void {
        // Check if core with same ID already exists
        const existingIndex = this.cores.findIndex(c => c.id === core.id);
        if (existingIndex >= 0) {
            console.warn(`Core with ID ${core.id} already exists. Replacing...`);
            this.cores[existingIndex] = core;
        } else {
            this.cores.push(core);
        }
    }
}

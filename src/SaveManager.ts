import { Player } from './Player';
import { Item } from './InventoryManager';
import { SaveManagerUI } from './SaveManagerUI';
import { PlayerRegistry } from './PlayerRegistry';
import { InputManager } from './InputManager';

/**
 * Interface representing the complete save data structure
 */
export interface SaveData {
    version: string;
    timestamp: string;
    playtime: number; // in seconds
    player: {
        // Stats
        level: number;
        exp: number;
        expRequired: number;
        hp: number;
        maxHp: number;
        tp: number;
        maxTp: number;
        strength: number;
        defense: number;
        speed: number;
        money: number;
        xData: number;

        // Upgrades
        strengthUpgrades: number;
        defenseUpgrades: number;
        hpUpgrades: number;
        tpUpgrades: number;

        // Position
        position: {
            x: number;
            y: number;
            z: number;
        };

        // Inventory
        inventory: Item[];
    };
}

/**
 * Manager class for handling game save operations
 */
export class SaveManager {
    private static instance: SaveManager; // Singleton

    private saveManagerUi: SaveManagerUI

    private static readonly SAVE_VERSION = '1.0.0';
    private playTimeSeconds: number = 0;
    private playerRegistry: PlayerRegistry;

    private constructor() {
        this.saveManagerUi = SaveManagerUI.Instance;
        this.playerRegistry = PlayerRegistry.Instance;
    }

    public static get Instance(): SaveManager {
        return this.instance || (this.instance = new this());
    }

    get isVisible(): boolean {
        return this.saveManagerUi.isVisible;
    }

    /*
     * Show the save manager UI
     */
    show() {
        this.saveManagerUi.show(
            this.getFormattedPlaytime(),
            () => this.save(),
        );
    }

    /*
     * Update method of the save manager UI
     */
    update(input: InputManager): void {
        this.saveManagerUi.update(input);
    }

    /**
     * Update the playtime counter
     * @param deltaTime - Time elapsed since last update in seconds
     */
    updatePlaytime(deltaTime: number): void {
        this.playTimeSeconds += deltaTime;
    }

    /**
     * Get current playtime in seconds
     */
    getPlaytime(): number {
        return this.playTimeSeconds;
    }

    /**
     * Format playtime as HH:MM:SS string
     */
    getFormattedPlaytime(): string {
        const hours = Math.floor(this.playTimeSeconds / 3600);
        const minutes = Math.floor((this.playTimeSeconds % 3600) / 60);
        const seconds = Math.floor(this.playTimeSeconds % 60);

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    /**
     * Save the current game state to a JSON file
     * @param player - The player object containing all player data
     * @returns The save data object
     */
    save(): SaveData {
        const player = this.playerRegistry.activePlayers[0];
        const saveData: SaveData = {
            version: SaveManager.SAVE_VERSION,
            timestamp: new Date().toISOString(),
            playtime: this.playTimeSeconds,
            player: {
                level: player.level,
                exp: player.exp,
                expRequired: player.expRequired,
                hp: player.hp,
                maxHp: player.maxHp,
                tp: player.tp,
                maxTp: player.maxTp,
                strength: player.strength,
                defense: player.defense,
                speed: player.speed,
                money: player.money,
                xData: player.xData,
                strengthUpgrades: player.strengthUpgrades,
                defenseUpgrades: player.defenseUpgrades,
                hpUpgrades: player.hpUpgrades,
                tpUpgrades: player.tpUpgrades,
                position: {
                    x: player.body.position.x,
                    y: player.body.position.y,
                    z: player.body.position.z
                },
                inventory: structuredClone(player.inventory)
            },
        };

        // Convert to JSON and download
        this.downloadSaveFile(saveData);

        return saveData;
    }

    /**
     * Download the save data as a JSON file
     * @param saveData - The save data to download
     */
    private downloadSaveFile(saveData: SaveData): void {
        const json = JSON.stringify(saveData, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create download link
        const link = document.createElement('a');
        link.href = url;
        link.download = `hackworld_save_${this.formatTimestampForFilename(saveData.timestamp)}.json`;

        // Trigger download
        document.body.appendChild(link);
        link.click();

        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        console.log('Save file downloaded successfully');
    }

    /**
     * Format timestamp for use in filename
     * @param timestamp - ISO timestamp string
     * @returns Formatted string safe for filename
     */
    private formatTimestampForFilename(timestamp: string): string {
        return timestamp.replace(/[:.]/g, '-').replace('T', '_').split('Z')[0];
    }
}

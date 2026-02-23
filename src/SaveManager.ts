import { WeaponItem } from './items/weapons/WeaponItem';
import { SaveManagerUI } from './SaveManagerUI';
import { PlayerRegistry } from './PlayerRegistry';
import { InputManager } from './InputManager';
import { CardCollection } from './items/cards/CardCollection';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { CoreRepository } from './items/cores/CoreRepository';
import { CoreItem } from './items/cores/CoreItem';
import { ChipRepository } from './items/chips/ChipRepository';
import { ChipItem } from './items/chips/ChipItem';
import { NpcRegistry } from './npcs/NpcRegistry';
import { GameProgressManager } from './GameProgressManager';
import { Player } from './Player';

/**
 * Interface representing the complete save data structure
 */
export interface SaveData {
    version: string;
    timestamp: string;
    playtime: number; // in seconds
    gameProgress: number; // Quest progression state
    player: {
        // Stats
        level: number;
        exp: number;
        expRequired: number;
        maxHp: number;
        maxTp: number;
        money: number;
        xData: number;
        boosterPacks: number;
        statPointsAvailable: number;
        // Do not track attributes (strength, defense, ...) since they are dynamically calculated based on the upgrades

        // Weapon tech (per-type)
        tech: Record<string, number>;

        // Upgrades (from X-Data)
        strengthUpgrades: number;
        defenseUpgrades: number;
        hpUpgrades: number;
        tpUpgrades: number;
        agilityUpgrades: number;
        luckUpgrades: number;

        // Stat points (from leveling up)
        strengthPoints: number;
        defensePoints: number;
        agilityPoints: number;
        luckPoints: number;

        // Position
        position: {
            x: number;
            y: number;
            z: number;
        };

        // Inventory
        inventory: any[];
    };
    // Card Collection
    cardCollection: string[];
    // NPC dialogue state
    npcDialogueShown: string[];
}

/**
 * Manager class for handling game save operations
 */
export class SaveManager {
    private static instance: SaveManager; // Singleton

    private saveManagerUi: SaveManagerUI

    private static readonly SAVE_VERSION = __APP_VERSION__;
    private static readonly LOCAL_STORAGE_KEY = 'hackworld_autosave';
    private static readonly RESET_FLAG_KEY = 'hackworld_resetting';
    private playTimeSeconds: number = 0;
    private playerRegistry: PlayerRegistry;

    private constructor() {
        this.saveManagerUi = SaveManagerUI.Instance;
        this.playerRegistry = PlayerRegistry.Instance;

        // Clear reset flag if it exists (from a previous reset operation)
        sessionStorage.removeItem(SaveManager.RESET_FLAG_KEY);
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
            (file: File) => this.load(file),
            () => this.resetGame(),
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
     * Includes player stats, inventory, playtime, and card collection
     * @param player - The player object containing all player data
     * @returns The save data object
     * @note Load functionality is not yet implemented. When implemented, use CardCollection.loadSaveData()
     */
    save(): SaveData {
        const player = this.playerRegistry.activePlayers[0];
        if (!player) {
            throw new Error('Cannot save: No active player found');
        }

        const cardCollection = CardCollection.Instance;
        const progressManager = GameProgressManager.Instance;

        const saveData: SaveData = this.createSaveData(progressManager, player, cardCollection);

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

    /**
     * Save current game state to localStorage for auto-save functionality
     */
    saveToLocalStorage(): void {
        try {
            // Skip auto-save if we're in the middle of a reset operation
            if (sessionStorage.getItem(SaveManager.RESET_FLAG_KEY)) {
                console.log('Skipping auto-save during reset operation');
                return;
            }

            const player = this.playerRegistry.activePlayers[0];
            if (!player) {
                console.warn('Cannot auto-save: No active player found');
                return;
            }

            const cardCollection = CardCollection.Instance;
            const progressManager = GameProgressManager.Instance;

            const saveData: SaveData = this.createSaveData(progressManager, player, cardCollection);
            
            // Save to localStorage
            localStorage.setItem(SaveManager.LOCAL_STORAGE_KEY, JSON.stringify(saveData));
            console.log('Game auto-saved to localStorage');
        } catch (error) {
            console.error('Failed to save to localStorage:', error);
        }
    }

    private createSaveData(progressManager: GameProgressManager, player: Player, cardCollection: CardCollection): SaveData {
        return {
            version: SaveManager.SAVE_VERSION,
            timestamp: new Date().toISOString(),
            playtime: this.playTimeSeconds,
            gameProgress: progressManager.progress,
            player: {
                level: player.level,
                exp: player.exp,
                expRequired: player.expRequired,
                maxHp: player.maxHp,
                maxTp: player.maxTp,
                money: player.money,
                xData: player.xData,
                boosterPacks: player.boosterPacks,
                statPointsAvailable: player.statPointsAvailable,
                strengthUpgrades: player.strengthUpgrades,
                defenseUpgrades: player.defenseUpgrades,
                hpUpgrades: player.hpUpgrades,
                tpUpgrades: player.tpUpgrades,
                agilityUpgrades: player.agilityUpgrades,
                luckUpgrades: player.luckUpgrades,
                strengthPoints: player.strengthPoints,
                defensePoints: player.defensePoints,
                agilityPoints: player.agilityPoints,
                luckPoints: player.luckPoints,
                position: {
                    x: player.body.position.x,
                    y: player.body.position.y,
                    z: player.body.position.z
                },
                inventory: player.inventory.map(i => {
                    if (i instanceof WeaponItem) {
                        const wi = i as any;
                        return {
                            kind: WeaponItem.name,
                            id: wi.id,
                            name: wi.name,
                            buyPrice: wi.buyPrice ?? wi.baseBuyPrice,
                            sellPrice: wi.sellPrice ?? wi.baseSellPrice,
                            weaponType: wi.weaponType,
                            damage: wi.damage ?? wi.baseDamage,
                            model: wi.model,
                            level: wi.level,
                            isEquipped: !!wi.isEquipped,
                            rimColor: wi.rimColor ?? null,
                        };
                    } else if (i instanceof CoreItem) {
                        const ci = i as any;
                        return {
                            kind: CoreItem.name,
                            id: ci.id,
                            name: ci.name,
                            level: ci.level,
                            isEquipped: !!ci.isEquipped,
                        };
                    } else if (i instanceof ChipItem) {
                        const chi = i as any;
                        return {
                            kind: ChipItem.name,
                            id: chi.id,
                            name: chi.name,
                            level: chi.level,
                            isEquipped: !!chi.isEquipped,
                        };
                    }
                    return structuredClone(i);
                }),
                tech: structuredClone((player as any).tech || {})
            },
            cardCollection: cardCollection.getSaveData(),
            npcDialogueShown: NpcRegistry.Instance.getShownDialogueList()
        };
    }

    /**
     * Load game state from localStorage if available
     * @returns true if save was loaded, false if no save found
     */
    loadFromLocalStorage(): boolean {
        try {
            if (__FRESH_START__) {
                console.log('Fresh start requested, skipping auto-load');
                return false;
            }

            const savedData = localStorage.getItem(SaveManager.LOCAL_STORAGE_KEY);
            if (!savedData) {
                return false;
            }

            const saveData: SaveData = JSON.parse(savedData);
            this.loadSaveData(saveData);
            console.log('Game loaded from localStorage');
            return true;
        } catch (error) {
            console.error('Failed to load from localStorage:', error);
            return false;
        }
    }

    /**
     * Clear the auto-save data from localStorage
     */
    clearLocalStorage(): void {
        try {
            localStorage.removeItem(SaveManager.LOCAL_STORAGE_KEY);
            console.log('Auto-save cleared from localStorage');
        } catch (error) {
            console.error('Failed to clear localStorage:', error);
        }
    }

    /**
     * Check if there is an auto-save available in localStorage
     */
    hasLocalStorageSave(): boolean {
        try {
            return localStorage.getItem(SaveManager.LOCAL_STORAGE_KEY) !== null;
        } catch (error) {
            return false;
        }
    }

    /**
     * Reset the game by clearing localStorage and reloading the page
     */
    resetGame(): void {
        if (confirm('Are you sure you want to reset the game? This will delete all progress and cannot be undone.')) {
            // Set a flag in sessionStorage to prevent auto-save during reload
            sessionStorage.setItem(SaveManager.RESET_FLAG_KEY, 'true');
            this.clearLocalStorage();
            // Reload the page to restart the game
            window.location.reload();
        }
    }

    /**
     * Load game state from a save file
     * @param file - The save file to load
     */
    async load(file: File): Promise<void> {
        try {
            // Read file content
            const text = await file.text();
            const saveData: SaveData = JSON.parse(text);

            // Validate save data version
            if (!saveData.version) {
                throw new Error('Invalid save file: missing version');
            }

            this.loadSaveData(saveData);
            console.log('Save file loaded successfully');
        } catch (error) {
            console.error('Failed to load save file:', error);
            throw error;
        }
    }

    /**
     * Internal method to load save data (used by both file and localStorage loading)
     * @param saveData - The save data to load
     */
    private loadSaveData(saveData: SaveData): void {
        // Get the player instance
        const player = this.playerRegistry.activePlayers[0];
        if (!player) {
            throw new Error('No active player found');
        }

        // Load game progress
        const progressManager = GameProgressManager.Instance;
        progressManager.load(saveData.gameProgress || 0);

        // Load playtime
        this.playTimeSeconds = saveData.playtime || 0;

        // Restore player stats
        player.level = saveData.player.level;
        player.exp = saveData.player.exp;
        player.expRequired = saveData.player.expRequired;
        player.hp = saveData.player.maxHp;
        player.maxHp = saveData.player.maxHp;
        player.tp = saveData.player.maxTp;
        player.maxTp = saveData.player.maxTp;
        player.money = saveData.player.money;
        player.xData = saveData.player.xData;
        player.boosterPacks = saveData.player.boosterPacks;
        player.statPointsAvailable = saveData.player.statPointsAvailable;

        // Restore upgrades (from X-Data)
        player.strengthUpgrades = saveData.player.strengthUpgrades;
        player.defenseUpgrades = saveData.player.defenseUpgrades;
        player.hpUpgrades = saveData.player.hpUpgrades;
        player.tpUpgrades = saveData.player.tpUpgrades;
        player.agilityUpgrades = saveData.player.agilityUpgrades;
        player.luckUpgrades = saveData.player.luckUpgrades;

        // Restore stat points (from leveling up)
        player.strengthPoints = saveData.player.strengthPoints;
        player.defensePoints = saveData.player.defensePoints;
        player.agilityPoints = saveData.player.agilityPoints;
        player.luckPoints = saveData.player.luckPoints;

        // Restore weapon tech
        if (saveData.player.tech) {
            (player as any).tech = structuredClone(saveData.player.tech);
        }

        // Restore inventory
        player.inventory = [];
        const weaponRepo = WeaponRepository.Instance;
        const coreRepository = CoreRepository.Instance;
        const chipRepository = ChipRepository.Instance;

        for (const itemData of saveData.player.inventory) {
            if (itemData.kind === WeaponItem.name) {
                // Restore weapon by finding a weapon with matching properties
                // We use weaponType and level to find the right weapon from the repository
                if (itemData.weaponType && itemData.level) {
                    const baseWeapon = weaponRepo.getWeaponByTypeAndLevel(itemData.weaponType, itemData.level);
                    if (baseWeapon) {
                        const weaponItem = baseWeapon.cloneWith(itemData.damage, itemData.buyPrice, itemData.sellPrice, itemData.id);
                        // Set the saved properties if needed
                        weaponItem.rimColor = itemData.rimColor ?? null;
                        if (itemData.isEquipped) {
                            weaponItem.isEquipped = true;
                            player.setWeapon(weaponItem);
                        }
                        player.inventory.push(weaponItem);
                    }
                } else {
                    console.warn('Invalid weapon data in save file:', itemData);
                }
            } else if (itemData.kind === CoreItem.name) {
                // Restore core by name and level from repository
                if (itemData.name && itemData.level) {
                    const coreItem = coreRepository.getCoreByNameAndLevel(itemData.name, itemData.level);
                    if (coreItem) {
                        if (itemData.isEquipped) {
                            coreItem.isEquipped = true;
                        }
                        player.inventory.push(coreItem);
                    }
                }
            } else if (itemData.kind === ChipItem.name) {
                // Restore chip by name and level from repository
                if (itemData.name && itemData.level) {
                    const chipItem = chipRepository.getChipByNameAndLevel(itemData.name, itemData.level);
                    if (chipItem) {
                        if (itemData.isEquipped) {
                            chipItem.isEquipped = true;
                        }
                        player.inventory.push(chipItem);
                    }
                }
            }
        }

        // Recalculate stats based on equipped items
        player.recalculateStats();

        // Restore playtime
        this.playTimeSeconds = saveData.playtime;

        // Restore card collection
        const cardCollection = CardCollection.Instance;
        cardCollection.loadSaveData(saveData.cardCollection);

        // Restore NPC dialogue state (with fallback for old saves)
        const npcRegistry = NpcRegistry.Instance;
        if (saveData.npcDialogueShown) {
            npcRegistry.loadDialogueState(saveData.npcDialogueShown);
        } else {
            // Old save file - reset to show all dialogues
            npcRegistry.reset();
        }
    }
}

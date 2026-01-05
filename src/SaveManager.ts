import { WeaponItem } from './items/weapons/WeaponItem';
import { SaveManagerUI } from './SaveManagerUI';
import { PlayerRegistry } from './PlayerRegistry';
import { InputManager } from './InputManager';
import { CardCollection } from './items/cards/CardCollection';
import { WeaponRepository } from './items/weapons/WeaponRepository';
import { CoreRegistry } from './items/cores/CoreRegistry';
import { CoreItem } from './items/cores/CoreItem';
import { ChipRegistry } from './items/chips/ChipRegistry';
import { ChipItem } from './items/chips/ChipItem';

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
        boosterPacks: number;

        // Weapon tech (per-type)
        tech: Record<string, number>;

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
        inventory: any[];
    };
    // Card Collection
    cardCollection: string[];
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
            (file: File) => this.load(file),
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
        const cardCollection = CardCollection.Instance;
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
                boosterPacks: player.boosterPacks,
                strengthUpgrades: player.strengthUpgrades,
                defenseUpgrades: player.defenseUpgrades,
                hpUpgrades: player.hpUpgrades,
                tpUpgrades: player.tpUpgrades,
                position: {
                    x: player.body.position.x,
                    y: player.body.position.y,
                    z: player.body.position.z
                },
                // Serialize inventory and include weapon levels
                inventory: player.inventory.map(i => {
                    if (i instanceof WeaponItem) {
                        const wi = i as any;
                        return {
                            kind: 'weapon',
                            id: wi.id,
                            name: wi.name,
                            buyPrice: wi.buyPrice ?? wi.baseBuyPrice,
                            sellPrice: wi.sellPrice ?? wi.baseSellPrice,
                            weaponType: wi.weaponType,
                            damage: wi.damage ?? wi.baseDamage,
                            model: wi.model,
                            level: wi.level,
                            isEquipped: !!wi.isEquipped,
                        };
                    } else if (i instanceof CoreItem) {
                        const ci = i as any;
                        return {
                            kind: 'core',
                            id: ci.id,
                            name: ci.name,
                            level: ci.level,
                            isEquipped: !!ci.isEquipped,
                        };
                    } else if (i instanceof ChipItem) {
                        const chi = i as any;
                        return {
                            kind: 'chip',
                            id: chi.id,
                            name: chi.name,
                            level: chi.level,
                            isEquipped: !!chi.isEquipped,
                        };
                    }
                    // Fallback: deep-clone other items
                    return structuredClone(i);
                }),
                tech: structuredClone((player as any).tech || {})
            },
            cardCollection: cardCollection.getSaveData()
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

            // Get the player instance
            const player = this.playerRegistry.activePlayers[0];
            if (!player) {
                throw new Error('No active player found');
            }

            // Restore player stats
            player.level = saveData.player.level;
            player.exp = saveData.player.exp;
            player.expRequired = saveData.player.expRequired;
            player.hp = saveData.player.hp;
            player.maxHp = saveData.player.maxHp;
            player.tp = saveData.player.tp;
            player.maxTp = saveData.player.maxTp;
            player.strength = saveData.player.strength;
            player.defense = saveData.player.defense;
            player.speed = saveData.player.speed;
            player.money = saveData.player.money;
            player.xData = saveData.player.xData;
            player.boosterPacks = saveData.player.boosterPacks;

            // Restore upgrades
            player.strengthUpgrades = saveData.player.strengthUpgrades;
            player.defenseUpgrades = saveData.player.defenseUpgrades;
            player.hpUpgrades = saveData.player.hpUpgrades;
            player.tpUpgrades = saveData.player.tpUpgrades;

            // Restore weapon tech
            if (saveData.player.tech) {
                (player as any).tech = structuredClone(saveData.player.tech);
            }

            // Restore position
            player.body.position.set(
                saveData.player.position.x,
                saveData.player.position.y,
                saveData.player.position.z
            );

            // Restore inventory
            player.inventory = [];
            const weaponRepo = WeaponRepository.Instance;
            const coreRegistry = CoreRegistry.Instance;
            const chipRegistry = ChipRegistry.Instance;

            for (const itemData of saveData.player.inventory) {
                if (itemData.kind === 'weapon') {
                    // Restore weapon by finding a weapon with matching properties
                    // We use weaponType and level to find the right weapon from the repository
                    const baseWeapon = weaponRepo.getWeaponByTypeAndLevel(itemData.weaponType, itemData.level);
                    if (baseWeapon) {
                        // Set the saved properties if needed
                        if (itemData.isEquipped) {
                            baseWeapon.isEquipped = true;
                            player.setWeapon(baseWeapon);
                        }
                        player.inventory.push(baseWeapon);
                    }
                } else if (itemData.kind === 'core') {
                    // Restore core by name since the ID is a UUID
                    const allCores = coreRegistry.getAllCores();
                    const coreDef = allCores.find(c => c.name === itemData.name);
                    if (coreDef) {
                        const coreItem = new CoreItem(
                            crypto.randomUUID(),
                            coreDef.name,
                            coreDef.buyPrice,
                            coreDef.sellPrice,
                            coreDef.stats,
                            itemData.level
                        );
                        if (itemData.isEquipped) {
                            coreItem.isEquipped = true;
                        }
                        player.inventory.push(coreItem);
                    }
                } else if (itemData.kind === 'chip') {
                    // Restore chip by name since the ID is a UUID
                    const allChips = chipRegistry.getAllChips();
                    const chipDef = allChips.find(c => c.name === itemData.name);
                    if (chipDef) {
                        const chipItem = new ChipItem(
                            crypto.randomUUID(),
                            chipDef.name,
                            chipDef.buyPrice,
                            chipDef.sellPrice,
                            chipDef.type,
                            chipDef.stats,
                            itemData.level
                        );
                        if (itemData.isEquipped) {
                            chipItem.isEquipped = true;
                        }
                        player.inventory.push(chipItem);
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

            console.log('Save file loaded successfully');
        } catch (error) {
            console.error('Failed to load save file:', error);
            throw error;
        }
    }
}

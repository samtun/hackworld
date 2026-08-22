import { EquippableItem } from '../EquippableItem';
import { Player } from '../../player/Player';
import { CoreStats } from './Core';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class CoreItem extends EquippableItem {
    stats: CoreStats;
    // fixed numeric level for this core instance (1 = α, 2 = β, ...)
    level: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, stats: CoreStats, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.stats = stats;
        this.level = level;
    }


    // Return level definition by numeric level (1-based). Throws if level <= 0.
    public getLevelByNumber(): { requiredLevel: number; statPercent: number } {
        return ItemLevelHelper.getChipCoreLevelByNumber(this.level);
    }

    // Return multiplier for numeric level
    public getStatMultiplierFromLevelNumber(): number {
        return ItemLevelHelper.getStatMultiplierForLevel(this.level);
    }

    // Get stats with level multiplier applied
    public getEffectiveStats(): CoreStats {
        // Stats are now stored directly in JSON with level scaling applied
        // No need for additional multiplier
        return { ...this.stats };
    }

    getType(): string {
        return 'core';
    }

    canEquip(player: Player): boolean {
        // Check player level against required level for this core's level
        const lvlDef = this.getLevelByNumber();
        return player.level >= lvlDef.requiredLevel;
    }

    equip(player: Player): void {
        // Check if player can equip this core
        if (!this.canEquip(player)) {
            const lvlDef = this.getLevelByNumber();
            console.log(`Cannot equip ${this.name} (level ${this.level}): requires player level ${lvlDef.requiredLevel}, player is level ${player.level}`);
            return; // Do not equip
        }

        // Unequip other cores
        player.inventory.forEach(item => {
            if (item instanceof CoreItem && item !== this && item.isEquipped) {
                item.unequip(player);
            }
        });

        this.isEquipped = true;
        player.recalculateStats();
    }

    unequip(player: Player): void {
        this.isEquipped = false;
        player.recalculateStats();
    }

    clone(newId?: string): CoreItem {
        return new CoreItem(
            newId || this.id,
            this.name,
            this.baseBuyPrice,
            this.baseSellPrice,
            { ...this.stats }, // Deep copy stats
            this.level
        );
    }
}

import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
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

    // Override to apply level-based price multiplier
    get buyPrice(): number {
        const multiplier = this.getPriceMultiplierForLevel();
        return Math.round(this.baseBuyPrice * multiplier);
    }

    // Sell price remains at base level
    get sellPrice(): number {
        return this.baseSellPrice;
    }

    private getPriceMultiplierForLevel(): number {
        const index = this.level - 1;
        if (index < 0 || index >= ItemLevelHelper.PRICE_MULTIPLIERS.length) {
            return ItemLevelHelper.PRICE_MULTIPLIERS[ItemLevelHelper.PRICE_MULTIPLIERS.length - 1];
        }
        return ItemLevelHelper.PRICE_MULTIPLIERS[index];
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
        const multiplier = this.getStatMultiplierFromLevelNumber();
        const effectiveStats: CoreStats = {};

        // Apply multiplier to all stat types
        const statKeys = ['strength', 'defense', 'speed'] as const;
        for (const key of statKeys) {
            if (this.stats[key] !== undefined) {
                effectiveStats[key] = Math.round(this.stats[key]! * multiplier);
            }
        }

        return effectiveStats;
    }

    getType(): string {
        return 'core';
    }

    equip(player: Player): void {
        // Check player level against required level for this core's level
        const lvlDef = this.getLevelByNumber();
        if (player.level < lvlDef.requiredLevel) {
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
            this.buyPrice,
            this.sellPrice,
            this.stats,
            this.level
        );
    }
}

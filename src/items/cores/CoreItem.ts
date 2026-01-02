import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
import { CoreStats } from './Core';

export class CoreItem extends EquippableItem {
    stats: CoreStats;
    // fixed numeric level for this core instance (1 = α, 2 = β, ...)
    level: number;

    // Level metadata for cores (based on player level, not tech)
    private static CORE_LEVELS = [
        { requiredLevel: 1, statPercent: 1.00 },   // α - Lvl 1 +0%
        { requiredLevel: 10, statPercent: 1.10 },  // β - Lvl 10 +10%
        { requiredLevel: 24, statPercent: 1.25 },  // γ - Lvl 24 +25%
        { requiredLevel: 40, statPercent: 1.40 },  // δ - Lvl 40 +40%
        { requiredLevel: 72, statPercent: 1.60 },  // ε - Lvl 72 +60%
        { requiredLevel: 124, statPercent: 1.90 }  // ω - Lvl 124 +90%
    ];

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, stats: CoreStats, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.stats = stats;
        this.level = level;
    }

    // Return level definition by numeric level (1-based). Throws if level <= 0.
    public getLevelByNumber(): { requiredLevel: number; statPercent: number } {
        const lvl = this.level;
        if (lvl <= 0) throw new Error('Core level must be >= 1');
        if (lvl > CoreItem.CORE_LEVELS.length) return CoreItem.CORE_LEVELS[CoreItem.CORE_LEVELS.length - 1];
        return CoreItem.CORE_LEVELS[lvl - 1];
    }

    // Return multiplier for numeric level
    public getStatMultiplierFromLevelNumber(): number {
        return this.getLevelByNumber().statPercent;
    }

    // Get stats with level multiplier applied
    public getEffectiveStats(): CoreStats {
        const multiplier = this.getStatMultiplierFromLevelNumber();
        const effectiveStats: CoreStats = {};

        if (this.stats.strength !== undefined) {
            effectiveStats.strength = Math.round(this.stats.strength * multiplier);
        }

        if (this.stats.defense !== undefined) {
            effectiveStats.defense = Math.round(this.stats.defense * multiplier);
        }

        if (this.stats.speed !== undefined) {
            effectiveStats.speed = Math.round(this.stats.speed * multiplier);
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

import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
import { ChipType, ChipStats } from './Chip';

export class ChipItem extends EquippableItem {
    chipType: ChipType;
    stats: ChipStats;
    // fixed numeric level for this chip instance (1 = α, 2 = β, ...)
    level: number;

    // Level metadata for chips (based on player level, not tech)
    private static CHIP_LEVELS = [
        { requiredLevel: 1, statPercent: 1.00 },   // α - Lvl 1 +0%
        { requiredLevel: 10, statPercent: 1.10 },  // β - Lvl 10 +10%
        { requiredLevel: 24, statPercent: 1.25 },  // γ - Lvl 24 +25%
        { requiredLevel: 40, statPercent: 1.40 },  // δ - Lvl 40 +40%
        { requiredLevel: 72, statPercent: 1.60 },  // ε - Lvl 72 +60%
        { requiredLevel: 124, statPercent: 1.90 }  // ω - Lvl 124 +90%
    ];

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, chipType: ChipType, stats: ChipStats, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.chipType = chipType;
        this.stats = stats;
        this.level = level;
    }

    // Return level definition by numeric level (1-based). Throws if level <= 0.
    public getLevelByNumber(): { requiredLevel: number; statPercent: number } {
        const lvl = this.level;
        if (lvl <= 0) throw new Error('Chip level must be >= 1');
        if (lvl > ChipItem.CHIP_LEVELS.length) return ChipItem.CHIP_LEVELS[ChipItem.CHIP_LEVELS.length - 1];
        return ChipItem.CHIP_LEVELS[lvl - 1];
    }

    // Return multiplier for numeric level
    public getStatMultiplierFromLevelNumber(): number {
        return this.getLevelByNumber().statPercent;
    }

    // Get stats with level multiplier applied
    public getEffectiveStats(): ChipStats {
        const multiplier = this.getStatMultiplierFromLevelNumber();
        const effectiveStats: ChipStats = {};

        if (this.stats.weaponRangeMultiplier !== undefined) {
            // Apply multiplier to the bonus part: e.g., 1.1 becomes 1 + (0.1 * multiplier)
            const bonus = this.stats.weaponRangeMultiplier - 1;
            effectiveStats.weaponRangeMultiplier = 1 + (bonus * multiplier);
        }

        if (this.stats.walkSpeedMultiplier !== undefined) {
            const bonus = this.stats.walkSpeedMultiplier - 1;
            effectiveStats.walkSpeedMultiplier = 1 + (bonus * multiplier);
        }

        return effectiveStats;
    }

    getType(): string {
        return 'chip';
    }

    equip(player: Player): void {
        // Check player level against required level for this chip's level
        const lvlDef = this.getLevelByNumber();
        if (player.level < lvlDef.requiredLevel) {
            console.log(`Cannot equip ${this.name} (level ${this.level}): requires player level ${lvlDef.requiredLevel}, player is level ${player.level}`);
            return; // Do not equip
        }

        // Unequip other chips
        player.inventory.forEach(item => {
            if (item instanceof ChipItem && item !== this && item.isEquipped) {
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

    clone(newId?: string): ChipItem {
        return new ChipItem(
            newId || this.id,
            this.name,
            this.buyPrice,
            this.sellPrice,
            this.chipType,
            this.stats,
            this.level
        );
    }
}

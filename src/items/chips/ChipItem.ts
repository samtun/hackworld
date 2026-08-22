import { EquippableItem } from '../EquippableItem';
import { Player } from '../../player/Player';
import { ChipType, ChipStats } from './Chip';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipItem extends EquippableItem {
    chipType: ChipType;
    stats: ChipStats;
    // fixed numeric level for this chip instance (1 = α, 2 = β, ...)
    level: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, chipType: ChipType, stats: ChipStats, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this.chipType = chipType;
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

    getType(): string {
        return 'chip';
    }

    canEquip(player: Player): boolean {
        // Check player level against required level for this chip's level
        const lvlDef = this.getLevelByNumber();
        return player.level >= lvlDef.requiredLevel;
    }

    equip(player: Player): void {
        // Check if player can equip this chip
        if (!this.canEquip(player)) {
            const lvlDef = this.getLevelByNumber();
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
            this.baseBuyPrice,
            this.baseSellPrice,
            this.chipType,
            { ...this.stats }, // Deep copy stats
            this.level
        );
    }
}

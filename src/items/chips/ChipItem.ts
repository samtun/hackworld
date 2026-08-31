import { EquippableItem } from '../EquippableItem';
import { Player } from '../../player/Player';
import { ChipType, ChipStats, IChip } from './Chip';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class ChipItem extends EquippableItem implements IChip {
    private _type: ChipType;
    stats: ChipStats;
    // fixed numeric level for this chip instance (1 = α, 2 = β, ...)
    level: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, chipType: ChipType, stats: ChipStats, level: number = 1) {
        super(id, name, buyPrice, sellPrice);
        this._type = chipType;
        this.stats = stats;
        this.level = level;
    }

    get type(): ChipType {
        return this._type;
    }

    set type(value: ChipType) {
        this._type = value;
    }

    get chipType(): ChipType {
        return this._type;
    }

    set chipType(value: ChipType) {
        this._type = value;
    }

    get effect(): number {
        return this.getEffectValue();
    }

    getEffectValue(): number {
        switch (this._type) {
            case ChipType.FIREWIRE:
                return this.stats.weaponRangeMultiplier ?? 1.0;
            case ChipType.OVERCLOCK:
                return this.stats.walkSpeedMultiplier ?? 1.0;
            case ChipType.DATAMINE:
                return this.stats.luckMultiplier ?? 1.0;
            case ChipType.RAZORWIRE:
                return this.stats.criticalDamageMultiplier ?? 1.0;
            case ChipType.PATCHWORK:
                return this.stats.healingMultiplier ?? 1.0;
            case ChipType.FOCUS:
                return this.stats.critChanceBonus ?? 1.0;
            case ChipType.AMPLIFIER:
                return this.stats.skillDamageBonus ?? 1.0;
            default:
                return 1.0;
        }
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
            this._type,
            { ...this.stats }, // Deep copy stats
            this.level
        );
    }
}

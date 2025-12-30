import { EquippableItem } from './EquippableItem';
import { Player } from '../Player';
import { ChipType, ChipStats } from './Chip';

export class ChipItem extends EquippableItem {
    chipType: ChipType;
    stats: ChipStats;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, chipType: ChipType, stats: ChipStats) {
        super(id, name, buyPrice, sellPrice);
        this.chipType = chipType;
        this.stats = stats;
    }

    getType(): string {
        return 'chip';
    }

    equip(player: Player): void {
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
            this.stats
        );
    }
}

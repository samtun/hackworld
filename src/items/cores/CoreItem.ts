import { EquippableItem } from '../EquippableItem';
import { Player } from '../../Player';
import { CoreStats } from './Core';

export class CoreItem extends EquippableItem {
    stats: CoreStats;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, stats: CoreStats) {
        super(id, name, buyPrice, sellPrice);
        this.stats = stats;
    }

    getType(): string {
        return 'core';
    }

    equip(player: Player): void {
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
            this.stats
        );
    }
}

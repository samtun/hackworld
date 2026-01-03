import { Item } from '../Item';

/**
 * BoosterPackItem - represents a booster pack in the player's inventory
 * Each pack can be opened to receive 5 random cards
 */
export class BoosterPackItem extends Item {
    constructor(id: string) {
        super(id, 'Booster Pack', 0, 0); // Not sellable
    }

    // Booster packs cannot be equipped
    canBeEquipped(): boolean {
        return false;
    }

    getType(): string {
        return 'BoosterPack';
    }

    clone(newId?: string): Item {
        return new BoosterPackItem(newId || crypto.randomUUID());
    }
}

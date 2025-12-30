import { Item } from './Item';
import { Player } from '../Player';

export abstract class EquippableItem extends Item {
    isEquipped: boolean = false;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number) {
        super(id, name, buyPrice, sellPrice);
    }

    abstract equip(player: Player): void;
    abstract unequip(player: Player): void;
}

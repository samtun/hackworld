
export abstract class Item {
    id: string;
    name: string;
    buyPrice: number;
    sellPrice: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number) {
        this.id = id;
        this.name = name;
        this.buyPrice = buyPrice;
        this.sellPrice = sellPrice;
    }

    abstract getType(): string;
    abstract clone(newId?: string): Item;
}

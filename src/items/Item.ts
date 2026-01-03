
export abstract class Item {
    id: string;
    name: string;
    protected baseBuyPrice: number;
    protected baseSellPrice: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number) {
        this.id = id;
        this.name = name;
        this.baseBuyPrice = buyPrice;
        this.baseSellPrice = sellPrice;
    }

    // Default implementation returns base prices
    // Subclasses can override to apply level-based multipliers
    get buyPrice(): number {
        return this.baseBuyPrice;
    }

    get sellPrice(): number {
        return this.baseSellPrice;
    }

    abstract getType(): string;
    abstract clone(newId?: string): Item;
}

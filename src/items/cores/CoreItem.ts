import { EquippableItem } from '../EquippableItem';
import { Player } from '../../player/Player';
import { CoreStats, CoreStealEffect, CoreType, ICore } from './Core';
import { ItemLevelHelper } from '../ItemLevelHelper';

export class CoreItem extends EquippableItem implements ICore {
    private _type: CoreType;
    stats: CoreStats;
    // fixed numeric level for this core instance (1 = α, 2 = β, ...)
    level: number;

    constructor(id: string, name: string, buyPrice: number, sellPrice: number, stats: CoreStats, level: number = 1, coreType: CoreType) {
        super(id, name, buyPrice, sellPrice);
        this._type = coreType;
        this.stats = stats;
        this.level = level;
    }

    static inferCoreTypeFromName(name: string): CoreType {
        const normalized = name.toLowerCase();
        if (normalized.includes('phishing')) return CoreType.PHISHING;
        if (normalized.includes('backdoor')) return CoreType.BACKDOOR;
        if (normalized.includes('swift')) return CoreType.SWIFT;
        if (normalized.includes('defender')) return CoreType.DEFENDER;
        return CoreType.HERALD;
    }

    get type(): CoreType {
        return this._type;
    }

    set type(value: CoreType) {
        this._type = value;
    }

    get coreType(): CoreType {
        return this._type;
    }

    set coreType(value: CoreType) {
        this._type = value;
    }

    // Return level definition by numeric level (1-based). Throws if level <= 0.
    public getLevelByNumber(): { requiredLevel: number; statPercent: number } {
        return ItemLevelHelper.getChipCoreLevelByNumber(this.level);
    }

    // Return multiplier for numeric level
    public getStatMultiplierFromLevelNumber(): number {
        return ItemLevelHelper.getStatMultiplierForLevel(this.level);
    }

    // Get stats with level multiplier applied
    public getEffectiveStats(): CoreStats {
        // Stats are now stored directly in JSON with level scaling applied
        // No need for additional multiplier
        return { ...this.stats };
    }

    getType(): string {
        return 'core';
    }

    public getStealEffect(): CoreStealEffect | undefined {
        switch (this._type) {
            case CoreType.PHISHING:
                return {
                    resource: 'hp',
                    amountPercent: 0.004,
                    procChanceAlpha: 0.01,
                    procChanceOmega: 0.05,
                };
            case CoreType.BACKDOOR:
                return {
                    resource: 'tp',
                    amountPercent: 0.002,
                    procChanceAlpha: 0.03,
                    procChanceOmega: 0.10,
                };
            default:
                return undefined;
        }
    }

    public getStealEffectType(): CoreType | undefined {
        return this.getStealEffect() ? this._type : undefined;
    }

    public getHpStealChance(): number {
        if (this._type !== CoreType.PHISHING) return 0;
        const effect = this.getStealEffect();
        if (!effect) return 0;
        return effect.procChanceAlpha + ((this.level - 1) * (effect.procChanceOmega - effect.procChanceAlpha)) / (6 - 1);
    }

    public getTpStealChance(): number {
        if (this._type !== CoreType.BACKDOOR) return 0;
        const effect = this.getStealEffect();
        if (!effect) return 0;
        return effect.procChanceAlpha + ((this.level - 1) * (effect.procChanceOmega - effect.procChanceAlpha)) / (6 - 1);
    }

    canEquip(player: Player): boolean {
        // Check player level against required level for this core's level
        const lvlDef = this.getLevelByNumber();
        return player.level >= lvlDef.requiredLevel;
    }

    equip(player: Player): void {
        // Check if player can equip this core
        if (!this.canEquip(player)) {
            const lvlDef = this.getLevelByNumber();
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
            this.baseBuyPrice,
            this.baseSellPrice,
            { ...this.stats }, // Deep copy stats
            this.level,
            this._type
        );
    }
}

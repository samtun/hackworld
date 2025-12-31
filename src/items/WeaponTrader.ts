import { WeaponItem } from './WeaponItem';
import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from './BaseTrader';
import { WeaponRegistry } from './WeaponRegistry';
import { CoreRegistry } from './CoreRegistry';
import { Player } from '../Player';
import { Item } from './Item';

const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_TRADER: '#4a3520',
    PANEL_PLAYER: '#203a4a',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    MONEY_COLOR: '#ffd700'
};

export class WeaponTrader extends BaseTrader {
    static instance: WeaponTrader; // Singleton

    private weaponRegistry: WeaponRegistry;
    private coreRegistry: CoreRegistry;

    private constructor() {
        const cfg: TraderUIConfig = {
            title: 'TRADER',
            traderTitle: "Trader's Goods",
            playerTitle: 'Your Inventory',
            colors: {
                panelTrader: COLORS.PANEL_TRADER,
                panelPlayer: COLORS.PANEL_PLAYER,
                windowBg: COLORS.WINDOW_BG,
                overlay: COLORS.OVERLAY,
                separator: COLORS.SEPARATOR,
                moneyColor: COLORS.MONEY_COLOR,
                text: COLORS.TEXT
            }
        };
        super(cfg);
        this.weaponRegistry = WeaponRegistry.Instance;
        this.coreRegistry = CoreRegistry.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): WeaponTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        const allWeapons = this.weaponRegistry.getAllWeapons();
        const traderWeapons = allWeapons.filter(w => w.id !== 'aegis_sword');

        this.traderInventory = [];

        for (const weaponDef of traderWeapons) {
            this.traderInventory.push(new WeaponItem(
                crypto.randomUUID(),
                weaponDef.name,
                weaponDef.baseBuyPrice,
                weaponDef.baseSellPrice,
                weaponDef.type,
                weaponDef.baseDamage,
                weaponDef.model
            ));
        }

        const allCores = this.coreRegistry.getAllCores();
        for (const coreDef of allCores) {
            this.traderInventory.push(new CoreItem(
                crypto.randomUUID(),
                coreDef.name,
                coreDef.buyPrice,
                coreDef.sellPrice,
                coreDef.stats
            ));
        }
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof WeaponItem);
    }
}

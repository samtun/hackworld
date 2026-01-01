import { WeaponItem } from './WeaponItem';
import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from './BaseTrader';
import { WeaponRegistry } from './WeaponRegistry';
import { CoreRegistry } from './CoreRegistry';
import { Player } from '../Player';
import { Item } from './Item';
import { TRADER_UI_COLORS } from './TraderUIConstants';

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
                panelTrader: TRADER_UI_COLORS.PANEL_TRADER,
                panelPlayer: TRADER_UI_COLORS.PANEL_PLAYER,
                windowBg: TRADER_UI_COLORS.WINDOW_BG,
                overlay: TRADER_UI_COLORS.OVERLAY,
                separator: TRADER_UI_COLORS.SEPARATOR,
                moneyColor: TRADER_UI_COLORS.MONEY_COLOR,
                text: TRADER_UI_COLORS.TEXT
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

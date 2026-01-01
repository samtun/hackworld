import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from './BaseTrader';
import { CoreRegistry } from './CoreRegistry';
import { Player } from '../Player';
import { Item } from './Item';
import { TRADER_UI_COLORS } from './TraderUIConstants';

export class CoreTrader extends BaseTrader {
    private static instance: CoreTrader; // Singleton

    private coreRegistry: CoreRegistry;

    private constructor() {
        const cfg: TraderUIConfig = {
            title: 'CORE TRADER',
            traderTitle: "Core Trader's Goods",
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
        this.coreRegistry = CoreRegistry.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): CoreTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

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
        return player.inventory.filter(item => item instanceof CoreItem);
    }
}
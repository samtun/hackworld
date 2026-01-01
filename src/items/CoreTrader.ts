import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from './BaseTrader';
import { CoreRegistry } from './CoreRegistry';
import { Player } from '../Player';
import { Item } from './Item';

const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_TRADER: '#2a204a',
    PANEL_PLAYER: '#203a4a',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    MONEY_COLOR: '#ffd700'
};

export class CoreTrader extends BaseTrader {
    private static instance: CoreTrader; // Singleton

    private coreRegistry: CoreRegistry;

    private constructor() {
        const cfg: TraderUIConfig = {
            title: 'CORE TRADER',
            traderTitle: "Core Trader's Goods",
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
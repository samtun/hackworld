import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { CoreRepository } from './CoreRepository';
import { Player } from '../../Player';
import { Item } from '../Item';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';

/** A.002 bonus: 5% buy discount and 5% sell bonus on cores when collection A.002 is complete */
const A002_DISCOUNT = 0.05;

export class CoreTrader extends BaseTrader {
    private static instance: CoreTrader; // Singleton

    private coreRepository: CoreRepository;

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
        this.coreRepository = CoreRepository.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): CoreTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        // Get all cores from repository (already cloned with unique IDs)
        this.traderInventory = this.coreRepository.getAllCores();
    }

    protected getEffectiveBuyPrice(item: Item, _player: Player): number {
        const base = item.buyPrice ?? 0;
        return CardCollection.Instance.isAlbumComplete(Album.A002)
            ? Math.floor(base * (1 - A002_DISCOUNT))
            : base;
    }

    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        const base = item.sellPrice ?? 0;
        return CardCollection.Instance.isAlbumComplete(Album.A002)
            ? Math.ceil(base * (1 + A002_DISCOUNT))
            : base;
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof CoreItem);
    }
}
import { Player } from '../../Player';
import { Item } from '../Item';
import { ChipItem } from './ChipItem';
import { ChipRepository } from './ChipRepository';
import { BaseTrader } from '../BaseTrader';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';

/** A.001 bonus: 5% buy discount and 5% sell bonus on chips when collection A.001 is complete */
const A001_DISCOUNT = 0.05;

export class ChipTrader extends BaseTrader {
    private static instance: ChipTrader; // Singleton

    private chipRepository: ChipRepository;

    private constructor() {
        super({
            title: 'CHIP TRADER',
            traderTitle: "Chip Trader's Goods",
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
        });
        this.chipRepository = ChipRepository.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): ChipTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        // Get all chips from repository (already cloned with unique IDs)
        this.traderInventory = this.chipRepository.getAllChips();
    }

    protected getEffectiveBuyPrice(item: Item, _player: Player): number {
        const base = item.buyPrice ?? 0;
        return CardCollection.Instance.isAlbumComplete(Album.A001)
            ? Math.floor(base * (1 - A001_DISCOUNT))
            : base;
    }

    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        const base = item.sellPrice ?? 0;
        return CardCollection.Instance.isAlbumComplete(Album.A001)
            ? Math.ceil(base * (1 + A001_DISCOUNT))
            : base;
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof ChipItem);
    }
}

import { Player } from '../../Player';
import { Item } from '../Item';
import { ChipItem } from './ChipItem';
import { ChipRepository } from './ChipRepository';
import { BaseTrader } from '../BaseTrader';
import { TRADER_UI_COLORS } from '../TraderUIConstants';

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

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof ChipItem);
    }
}

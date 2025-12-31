import { Player } from '../Player';
import { Item } from './Item';
import { ChipItem } from './ChipItem';
import { ChipRegistry } from './ChipRegistry';
import { BaseTrader } from './BaseTrader';

// --- Constants ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_TRADER: '#204a3a',
    PANEL_PLAYER: '#203a4a',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    MONEY_COLOR: '#ffd700'
};

export class ChipTraderManager extends BaseTrader {
    private static instance: ChipTraderManager; // Singleton

    private chipRegistry: ChipRegistry;

    private constructor() {
        super({
            title: 'CHIP TRADER',
            traderTitle: "Chip Trader's Goods",
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
        });
        this.chipRegistry = ChipRegistry.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): ChipTraderManager {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        // Add chips from registry
        const allChips = this.chipRegistry.getAllChips();
        for (const chipDef of allChips) {
            this.traderInventory.push(new ChipItem(
                crypto.randomUUID(),
                chipDef.name,
                chipDef.buyPrice,
                chipDef.sellPrice,
                chipDef.type,
                chipDef.stats
            ));
        }
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof ChipItem);
    }
}

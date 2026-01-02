import { Player } from '../../Player';
import { Item } from '../Item';
import { ChipItem } from './ChipItem';
import { ChipRegistry } from './ChipRegistry';
import { BaseTrader } from '../BaseTrader';
import { TRADER_UI_COLORS } from '../TraderUIConstants';

export class ChipTrader extends BaseTrader {
    private static instance: ChipTrader; // Singleton

    // Price multipliers for different levels
    private static readonly LEVEL_2_PRICE_MULTIPLIER = 1.5;
    private static readonly LEVEL_3_PRICE_MULTIPLIER = 2.0;

    private chipRegistry: ChipRegistry;

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
        this.chipRegistry = ChipRegistry.Instance;
        this.initializeTraderInventory();
    }

    public static get Instance(): ChipTrader {
        return this.instance || (this.instance = new this());
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];

        // Add chips from registry at multiple levels (α, β, γ levels)
        const allChips = this.chipRegistry.getAllChips();
        for (const chipDef of allChips) {
            // Add level 1 (α)
            this.traderInventory.push(new ChipItem(
                crypto.randomUUID(),
                chipDef.name,
                chipDef.buyPrice,
                chipDef.sellPrice,
                chipDef.type,
                chipDef.stats,
                1
            ));
            
            // Add level 2 (β) with increased price
            this.traderInventory.push(new ChipItem(
                crypto.randomUUID(),
                chipDef.name,
                Math.round(chipDef.buyPrice * ChipTrader.LEVEL_2_PRICE_MULTIPLIER),
                chipDef.sellPrice,
                chipDef.type,
                chipDef.stats,
                2
            ));
            
            // Add level 3 (γ) with increased price
            this.traderInventory.push(new ChipItem(
                crypto.randomUUID(),
                chipDef.name,
                Math.round(chipDef.buyPrice * ChipTrader.LEVEL_3_PRICE_MULTIPLIER),
                chipDef.sellPrice,
                chipDef.type,
                chipDef.stats,
                3
            ));
        }
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof ChipItem);
    }
}

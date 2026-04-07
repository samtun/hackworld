import { Player } from '../../Player';
import { Item } from '../Item';
import { ChipItem } from './ChipItem';
import { ChipType } from './Chip';
import { ChipRepository } from './ChipRepository';
import { BaseTrader } from '../BaseTrader';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';
import { InputManager } from '../../InputManager';
import { ItemLevelHelper } from '../ItemLevelHelper';

/** A.001 bonus: 5% buy discount and 5% sell bonus on chips when collection A.001 is complete */
const A001_DISCOUNT = 0.05;

/** Chip types that should NOT appear in the trader inventory (drop-only items) */
const TRADER_EXCLUDED_CHIP_TYPES: ChipType[] = [ChipType.RAZORWIRE, ChipType.DATAMINE];

export class ChipTrader extends BaseTrader {
    private static instance: ChipTrader; // Singleton

    private chipRepository: ChipRepository;
    private pendingInventoryInit: boolean = true;

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

    update(player: Player, input?: InputManager) {
        if (this.pendingInventoryInit) {
            this.refreshInventory(player);
            this.pendingInventoryInit = false;
            this.needsRender = true;
        }
        super.update(player, input);
    }

    protected initializeTraderInventory() {
        this.traderInventory = [];
    }

    /**
     * Populates the trader inventory based on the player's current level.
     * Spawns 1–3 chips equippable by the player and 1–2 chips one level below.
     * Razorwire and Datamine chips are excluded (drop-only items).
     */
    private refreshInventory(player: Player): void {
        this.traderInventory = [];
        const equippableLevel = ItemLevelHelper.getEquippableLevel(player.level);
        const lowerLevel = Math.max(1, equippableLevel - 1);

        // Spawn 1-3 chips at the equippable level
        const equippableCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < equippableCount; i++) {
            const chip = this.chipRepository.getRandomChipOfLevelExcluding(equippableLevel, TRADER_EXCLUDED_CHIP_TYPES);
            if (chip) this.traderInventory.push(chip);
        }

        // Spawn 1-2 chips one level below (only if there is a level below)
        if (lowerLevel < equippableLevel) {
            const lowerCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < lowerCount; i++) {
                const chip = this.chipRepository.getRandomChipOfLevelExcluding(lowerLevel, TRADER_EXCLUDED_CHIP_TYPES);
                if (chip) this.traderInventory.push(chip);
            }
        }
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

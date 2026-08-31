import { Player } from '../../player/Player';
import { CardCollection } from '../cards/CardCollection';
import { Item } from '../Item';
import { ChipItem } from './ChipItem';
import { ChipType } from './Chip';
import { ChipRepository } from './ChipRepository';
import { BaseTrader } from '../BaseTrader';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { Album } from '../cards/Card';
import { InputManager } from '../../controls/InputManager';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { singleton } from 'tsyringe';
import { AudioManager } from '../../AudioManager';
import { MenuManager } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';

/** A.001 bonus: 5% buy discount and 5% sell bonus on chips when collection A.001 is complete */
const A001_DISCOUNT = 0.05;

/** Chip types that should NOT appear in the trader inventory (drop-only items) */
const TRADER_EXCLUDED_CHIP_TYPES: ChipType[] = [ChipType.RAZORWIRE, ChipType.DATAMINE, ChipType.AMPLIFIER, ChipType.FOCUS];

@singleton()
export class ChipTrader extends BaseTrader {
    private pendingInventoryInit: boolean = true;

    constructor(
        private readonly cardCollection: CardCollection,
        private readonly chipRepository: ChipRepository,
        audioManager: AudioManager,
        menuManager: MenuManager,
        uiManager: UIManager,
        inputManager: InputManager,
    ) {
        const traderUIConfig = {
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
        };
        super(audioManager, menuManager, uiManager, inputManager, traderUIConfig);
        this.initializeTraderInventory();
    }

    update(player: Player) {
        if (this.pendingInventoryInit) {
            this.refreshInventory(player);
            this.pendingInventoryInit = false;
            this.needsRender = true;
        }
        super.update(player);
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
        return this.cardCollection.isAlbumComplete(Album.A001)
            ? Math.floor(base * (1 - A001_DISCOUNT))
            : base;
    }

    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        const base = item.sellPrice ?? 0;
        return this.cardCollection.isAlbumComplete(Album.A001)
            ? Math.ceil(base * (1 + A001_DISCOUNT))
            : base;
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter(item => item instanceof ChipItem);
    }
}

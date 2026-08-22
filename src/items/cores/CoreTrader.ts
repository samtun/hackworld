import { CoreItem } from './CoreItem';
import { BaseTrader, TraderUIConfig } from '../BaseTrader';
import { CoreRepository } from './CoreRepository';
import { Player } from '../../player/Player';
import { Item } from '../Item';
import { TRADER_UI_COLORS } from '../TraderUIConstants';
import { CardCollection } from '../cards/CardCollection';
import { Album } from '../cards/Card';
import { InputManager } from '../../controls/InputManager';
import { ItemLevelHelper } from '../ItemLevelHelper';
import { AudioManager } from '../../AudioManager';
import { MenuManager } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';
import { singleton } from 'tsyringe';

/** A.002 bonus: 5% buy discount and 5% sell bonus on cores when collection A.002 is complete */
const A002_DISCOUNT = 0.05;

@singleton()
export class CoreTrader extends BaseTrader {
    private pendingInventoryInit: boolean = true;

    constructor(
        private readonly cardCollection: CardCollection,
        private readonly coreRepository: CoreRepository,
        audioManager: AudioManager,
        menuManager: MenuManager,
        uiManager: UIManager,
        inputManager: InputManager,
    ) {
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
        super(audioManager, menuManager, uiManager, inputManager, cfg);
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
     * Spawns 1–3 cores equippable by the player and 1–2 cores one level below.
     */
    private refreshInventory(player: Player): void {
        this.traderInventory = [];
        const equippableLevel = ItemLevelHelper.getEquippableLevel(player.level);
        const lowerLevel = Math.max(1, equippableLevel - 1);

        // Spawn 1-3 cores at the equippable level
        const equippableCount = 1 + Math.floor(Math.random() * 3);
        for (let i = 0; i < equippableCount; i++) {
            const core = this.coreRepository.getRandomCoreOfLevel(equippableLevel);
            if (core) this.traderInventory.push(core);
        }

        // Spawn 1-2 cores one level below (only if there is a level below)
        if (lowerLevel < equippableLevel) {
            const lowerCount = 1 + Math.floor(Math.random() * 2);
            for (let i = 0; i < lowerCount; i++) {
                const core = this.coreRepository.getRandomCoreOfLevel(lowerLevel);
                if (core) this.traderInventory.push(core);
            }
        }
    }

    protected getEffectiveBuyPrice(item: Item, _player: Player): number {
        const base = item.buyPrice ?? 0;
        return this.cardCollection.isAlbumComplete(Album.A002)
            ? Math.floor(base * (1 - A002_DISCOUNT))
            : base;
    }

    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        const base = item.sellPrice ?? 0;
        return this.cardCollection.isAlbumComplete(Album.A002)
            ? Math.ceil(base * (1 + A002_DISCOUNT))
            : base;
    }

    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory.filter((item: Item) => item instanceof CoreItem);
    }
}
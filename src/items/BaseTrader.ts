import { Item } from './Item';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { resetInputDebounce, shakeElement } from '../ui/UiUtils';
import { formatItemLabel } from './ItemDisplay';
import { TradeMode } from './TradeMode';
import { TraderPanel } from './TraderPanel';
import { EquippableItem } from './EquippableItem';
import { getHint, HintConfigs } from '../ui/InputHints';
import { sortInventory } from './ItemSorter';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../AudioManager';

export { TradeMode } from './TradeMode';

export type TraderUIConfig = {
    title?: string;
    traderTitle?: string;
    playerTitle?: string;
    colors?: {
        overlay?: string;
        windowBg?: string;
        panelTrader?: string;
        panelPlayer?: string;
        separator?: string;
        moneyColor?: string;
        text?: string;
    };
};

export abstract class BaseTrader {
    container!: HTMLDivElement;
    isVisible: boolean = false;

    traderList!: HTMLDivElement;
    playerList!: HTMLDivElement;
    traderPanel!: HTMLDivElement;
    playerPanel!: HTMLDivElement;
    playerMoneyText!: HTMLDivElement;
    itemDetailsPanel!: HTMLDivElement;

    selectedIndex: number = 0;
    activePanel: TraderPanel = TraderPanel.TRADER;
    itemElements: HTMLDivElement[] = [];
    needsRender: boolean = false;

    // Per-panel remembered selection indices
    protected traderSelectedIndex: number = 0;
    protected playerSelectedIndex: number = 0;

    // debounce
    protected lastNavigateUpState: boolean = false;
    protected lastNavigateDownState: boolean = false;
    protected lastNavigateLeftState: boolean = false;
    protected lastNavigateRightState: boolean = false;
    protected lastSelectState: boolean = false;

    // inventories
    traderInventory: Item[] = [];

    // Sort flag – set when the trader opens so player inventory is sorted once
    protected pendingSort: boolean = false;

    protected uiConfig: TraderUIConfig;
    protected menuManager: MenuManager;
    protected uiManager: UIManager;

    constructor(uiConfig?: TraderUIConfig) {
        this.uiConfig = uiConfig || {};
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    // Subclasses must implement how to populate trader inventory
    protected abstract initializeTraderInventory(): void;

    // Optional: filter player's inventory to show in player panel
    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory;
    }

    /**
     * Returns the effective buy price for an item after applying collection bonuses.
     * Subclasses override this to apply trader-specific discounts.
     */
    protected getEffectiveBuyPrice(item: Item, _player: Player): number {
        return item.buyPrice ?? 0;
    }

    /**
     * Returns the effective sell price for an item after applying collection bonuses.
     * Subclasses override this to apply trader-specific sell bonuses.
     */
    protected getEffectiveSellPrice(item: Item, _player: Player): number {
        return item.sellPrice ?? 0;
    }

    protected createUI() {
        // Default colors
        const colors = Object.assign({
            panelTrader: MENU_COLORS.PANEL_TRADER,
            panelPlayer: MENU_COLORS.PANEL_PLAYER,
            moneyColor: MENU_COLORS.COST_COLOR,
            text: MENU_COLORS.TEXT
        }, this.uiConfig.colors || {});

        // Inject responsive CSS once
        if (!document.getElementById('trader-responsive-styles')) {
            const style = document.createElement('style');
            style.id = 'trader-responsive-styles';
            style.textContent = `
                @media (max-width: 768px) {
                    .trader-ui-window {
                        grid-template-columns: 1fr 1fr !important;
                        grid-template-rows: auto auto 1fr auto auto auto !important;
                    }
                    .trader-ui-title { grid-column: 1 / 3 !important; }
                    .trader-ui-subtitle-details {
                        grid-row: 4 / 5 !important;
                        grid-column: 1 / 3 !important;
                        border-top: 2px solid ${MENU_COLORS.SEPARATOR} !important;
                    }
                    .trader-ui-panel-details {
                        grid-row: 5 / 6 !important;
                        grid-column: 1 / 3 !important;
                    }
                    .trader-ui-money {
                        grid-row: 6 / 7 !important;
                        grid-column: 1 / 3 !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Build container overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Main Window – 3-column layout: trader list | player list | item details
        const windowDiv = this.menuManager.createGridWindow(
            '1fr 1fr 1fr',
            'auto auto 1fr auto',
            { width: '92vw' }
        );
        windowDiv.style.gap = '2px';
        windowDiv.classList.add('trader-ui-window');
        this.container.appendChild(windowDiv);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.innerText = this.uiConfig.title || 'TRADER';
        titleDiv.classList.add('trader-ui-title');
        Object.assign(titleDiv.style, {
            gridColumn: '1 / 4',
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            padding: '10px',
            borderBottom: `2px solid ${MENU_COLORS.SEPARATOR}`
        });
        windowDiv.appendChild(titleDiv);

        // Panel sub-titles (fixed above scrollable lists)
        const traderTitle = document.createElement('div');
        traderTitle.innerText = this.uiConfig.traderTitle || "Trader's Goods";
        Object.assign(traderTitle.style, {
            gridRow: '2 / 3',
            gridColumn: '1 / 2',
            padding: '10px 10px 5px 10px',
            fontWeight: 'bold',
            fontSize: '20px'
        });
        windowDiv.appendChild(traderTitle);

        const playerTitle = document.createElement('div');
        playerTitle.innerText = this.uiConfig.playerTitle || 'Your Inventory';
        Object.assign(playerTitle.style, {
            gridRow: '2 / 3',
            gridColumn: '2 / 3',
            padding: '10px 10px 5px 10px',
            fontWeight: 'bold',
            fontSize: '20px'
        });
        windowDiv.appendChild(playerTitle);

        const detailsTitle = document.createElement('div');
        detailsTitle.innerText = 'Item Details';
        detailsTitle.classList.add('trader-ui-subtitle-details');
        Object.assign(detailsTitle.style, {
            gridRow: '2 / 3',
            gridColumn: '3 / 4',
            padding: '10px 10px 5px 10px',
            fontWeight: 'bold',
            fontSize: '20px'
        });
        windowDiv.appendChild(detailsTitle);

        // Trader Panel (Left)
        this.traderPanel = this.menuManager.createPanel({
            backgroundColor: this.uiConfig.colors?.panelTrader || colors.panelTrader,
            gridRow: '3 / 4',
            gridColumn: '1 / 2'
        });
        this.traderPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.traderPanel);

        this.traderList = document.createElement('div');
        this.traderPanel.appendChild(this.traderList);

        // Player Panel (Middle)
        this.playerPanel = this.menuManager.createPanel({
            backgroundColor: this.uiConfig.colors?.panelPlayer || colors.panelPlayer,
            gridRow: '3 / 4',
            gridColumn: '2 / 3'
        });
        this.playerPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.playerPanel);

        this.playerList = document.createElement('div');
        this.playerPanel.appendChild(this.playerList);

        // Item Details Panel (Right)
        const detailsPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.WINDOW_BG,
            gridRow: '3 / 4',
            gridColumn: '3 / 4'
        });
        detailsPanel.classList.add('trader-ui-panel-details');
        detailsPanel.style.overflowY = 'auto';
        windowDiv.appendChild(detailsPanel);

        this.itemDetailsPanel = document.createElement('div');
        this.itemDetailsPanel.style.fontSize = '14px';
        detailsPanel.appendChild(this.itemDetailsPanel);

        // Money Display (Bottom)
        const moneyDiv = document.createElement('div');
        moneyDiv.classList.add('trader-ui-money');
        Object.assign(moneyDiv.style, {
            gridColumn: '1 / 4',
            gridRow: '4 / 5',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            padding: '10px',
            borderTop: `2px solid ${MENU_COLORS.SEPARATOR}`,
            color: colors.text,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            fontSize: '18px',
            fontWeight: 'bold'
        });
        windowDiv.appendChild(moneyDiv);

        this.playerMoneyText = document.createElement('div');
        this.playerMoneyText.style.color = this.uiConfig.colors?.moneyColor || colors.moneyColor;
        moneyDiv.appendChild(this.playerMoneyText);
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
        this.traderSelectedIndex = 0;
        this.playerSelectedIndex = 0;
        this.activePanel = TraderPanel.TRADER;
        this.needsRender = true;
        this.pendingSort = true;
        sortInventory(this.traderInventory);
        resetInputDebounce(this as any);
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.uiManager.hideControlHints();
    }

    toggle() { if (this.isVisible) this.hide(); else this.show(); }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;

        if (this.pendingSort) {
            sortInventory(player.inventory);
            this.pendingSort = false;
        }

        if (input) {
            // Update centralized control hints based on input method
            this.uiManager.showControlHints(getHint(HintConfigs.buySellClose, input));

            const oldIndex = this.selectedIndex;
            const oldPanel = this.activePanel;
            this.handleNavigation(player, input);
            if (oldIndex !== this.selectedIndex || oldPanel !== this.activePanel) this.needsRender = true;
        }
        if (this.needsRender) { this.render(player); this.needsRender = false; }
    }

    protected render(player: Player) {
        if (!this.traderList || !this.playerList) return;
        if (this.playerMoneyText) this.playerMoneyText.innerText = `${player.bits} BITS`;
        this.renderItemList(this.traderList, this.traderInventory, this.activePanel === TraderPanel.TRADER, TradeMode.BUY, player);
        const playerItems = this.filterPlayerInventory(player);
        this.renderItemList(this.playerList, playerItems as Item[], this.activePanel === TraderPanel.PLAYER, TradeMode.SELL, player);
        const selectedItem = this.activePanel === TraderPanel.TRADER ? this.traderInventory[this.selectedIndex] : (playerItems[this.selectedIndex] as Item | undefined);

        // Find the currently equipped item of the same type for stat comparison.
        // If the selected item IS the equipped item, no comparison is needed.
        let equippedItem: Item | undefined;
        if (selectedItem instanceof EquippableItem && !selectedItem.isEquipped) {
            equippedItem = player.inventory.find((item: Item) =>
                item instanceof EquippableItem &&
                item.isEquipped &&
                item.constructor === selectedItem!.constructor
            );
        }
        if (this.itemDetailsPanel) this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem as Item | undefined, equippedItem);
    }

    protected renderItemList(container: HTMLDivElement, items: Item[], isActive: boolean, mode: TradeMode, player: Player) {
        container.innerHTML = '';
        // Only clear itemElements if this is the active panel
        if (isActive) {
            this.itemElements = [];
        }
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            const price = mode === TradeMode.BUY
                ? this.getEffectiveBuyPrice(item, player)
                : this.getEffectiveSellPrice(item, player);
            const priceText = price !== undefined ? ` (${price} bits)` : '';
            const canAfford = mode === TradeMode.SELL || (price !== undefined && player.bits >= price);
            itemDiv.innerHTML = formatItemLabel(item, priceText);
            const isSelected = isActive && index === this.selectedIndex;
            Object.assign(itemDiv.style, { padding: '8px', backgroundColor: isSelected ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.TRANSPARENT, border: isSelected ? '2px solid #fff' : '2px solid transparent', opacity: canAfford ? '1' : '0.5', transition: 'transform 0.1s', position: 'relative' });
            if ((item as any).isEquipped) {
                const triangle = document.createElement('div');
                triangle.style.position = 'absolute'; triangle.style.top = '0'; triangle.style.left = '0'; triangle.style.width = '0'; triangle.style.height = '0'; triangle.style.borderLeft = '12px solid #ffd700'; triangle.style.borderBottom = '12px solid transparent'; itemDiv.appendChild(triangle);
            }
            if (index < items.length - 1) itemDiv.style.borderBottom = `1px solid ${MENU_COLORS.SEPARATOR}`;
            if (isActive) this.itemElements.push(itemDiv);
            container.appendChild(itemDiv);
        });
        if (isActive && this.itemElements[this.selectedIndex]) this.itemElements[this.selectedIndex].scrollIntoView({ behavior: 'auto', block: 'nearest' });
    }

    protected handleNavigation(player: Player, input: InputManager) {
        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const navigateLeft = input.isNavigateLeftPressed();
        const navigateRight = input.isNavigateRightPressed();
        const select = input.isSelectPressed();
        const cancel = (input as any).isCancelPressed ? (input as any).isCancelPressed() : false;
        const previousIndex = this.selectedIndex;
        const previousPanel = this.activePanel;
        if (cancel) { this.hide(); return; }

        if (navigateUp && !this.lastNavigateUpState) {
            if (this.selectedIndex > 0) this.selectedIndex--;
        }

        if (navigateDown && !this.lastNavigateDownState) {
            const maxIndex = this.activePanel === TraderPanel.TRADER
                ? this.traderInventory.length - 1
                : (this.filterPlayerInventory(player) || []).length - 1;
            if (this.selectedIndex < maxIndex) this.selectedIndex++;
        }

        if (navigateLeft && !this.lastNavigateLeftState && this.activePanel !== TraderPanel.TRADER) {
            this.playerSelectedIndex = this.selectedIndex;
            this.activePanel = TraderPanel.TRADER;
            this.selectedIndex = this.traderSelectedIndex;
        }
        if (navigateRight && !this.lastNavigateRightState && this.activePanel !== TraderPanel.PLAYER) {
            this.traderSelectedIndex = this.selectedIndex;
            this.activePanel = TraderPanel.PLAYER;
            this.selectedIndex = this.playerSelectedIndex;
        }

        if (this.selectedIndex !== previousIndex || this.activePanel !== previousPanel) {
            AudioManager.Instance.playMenuNavigate();
        }

        if (select && !this.lastSelectState) this.handleTransaction(player);

        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastNavigateLeftState = navigateLeft;
        this.lastNavigateRightState = navigateRight;
        this.lastSelectState = select;
    }

    protected handleTransaction(player: Player) {
        if (this.activePanel === TraderPanel.TRADER) {
            const item = this.traderInventory[this.selectedIndex];
            if (item && item.buyPrice !== undefined) {
                const effectivePrice = this.getEffectiveBuyPrice(item, player);
                if (player.bits >= effectivePrice) {
                    player.bits -= effectivePrice;
                    // Use crypto.randomUUID() for better uniqueness than Date.now()
                    const clone: Item = item.clone();
                    if (clone instanceof EquippableItem) {
                        clone.isEquipped = false;
                    }
                    player.inventory.push(clone);
                    this.traderInventory.splice(this.selectedIndex, 1);
                    if (this.selectedIndex >= this.traderInventory.length && this.selectedIndex > 0) this.selectedIndex--;
                    this.needsRender = true;
                    AudioManager.Instance.playBuy();
                } else {
                    // Player doesn't have enough money - shake the item
                    this.shakeItem(this.selectedIndex);
                }
            }
        } else {
            const playerItems = this.filterPlayerInventory(player);
            const item = playerItems[this.selectedIndex];
            if (item && item.sellPrice !== undefined) {
                if (item instanceof EquippableItem && item.isEquipped) {
                    this.shakeItem(this.selectedIndex);
                    return;
                }
                player.bits += this.getEffectiveSellPrice(item, player);
                // Use crypto.randomUUID() for better uniqueness than Date.now()
                const sold = item.clone();
                this.traderInventory.push(sold as Item);
                const idx = player.inventory.indexOf(item);
                if (idx !== -1) player.inventory.splice(idx, 1);
                if (this.selectedIndex >= playerItems.length - 1 && this.selectedIndex > 0) this.selectedIndex--;
                this.needsRender = true;
                AudioManager.Instance.playSell();
            }
        }
    }

    protected shakeItem(index: number) {
        if (this.itemElements && this.itemElements[index]) {
            shakeElement(this.itemElements[index]);
        }
    }
}

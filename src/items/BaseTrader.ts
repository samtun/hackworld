import { Item } from './Item';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { resetInputDebounce } from '../ui/UiUtils';
import { formatItemLabel } from './ItemDisplay';

export type TradeMode = 'buy' | 'sell';

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
    activePanel: 'trader' | 'player' = 'trader';
    itemElements: HTMLDivElement[] = [];
    needsRender: boolean = false;

    // debounce
    protected lastNavigateUpState: boolean = false;
    protected lastNavigateDownState: boolean = false;
    protected lastNavigateLeftState: boolean = false;
    protected lastNavigateRightState: boolean = false;
    protected lastSelectState: boolean = false;

    // inventories
    traderInventory: Item[] = [];

    protected uiConfig: TraderUIConfig;

    constructor(uiConfig?: TraderUIConfig) {
        this.uiConfig = uiConfig || {};
        this.createUI();
    }

    // Subclasses must implement how to populate trader inventory
    protected abstract initializeTraderInventory(): void;

    // Optional: filter player's inventory to show in player panel
    protected filterPlayerInventory(player: Player): Item[] {
        return player.inventory;
    }

    protected createUI() {
        // Default colors and styles
        const colors = Object.assign({
            overlay: 'rgba(0, 0, 0, 0.8)',
            windowBg: '#333',
            separator: '#BBBBBB',
            panelTrader: '#4a3520',
            panelPlayer: '#203a4a',
            moneyColor: '#ffd700',
            text: '#fff'
        }, this.uiConfig.colors || {});

        const STYLES = {
            FONT_FAMILY: '"Share Tech", Arial, sans-serif',
            BORDER_RADIUS: '10px',
            BORDER_WIDTH: '2px',
            WINDOW_PADDING: '20px',
            PANEL_PADDING: '20px',
            GRID_GAP: '2px'
        };

        // Build container overlay
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: colors.overlay,
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = document.createElement('div');
        Object.assign(windowDiv.style, {
            width: '92vw',
            height: '92vh',
            backgroundColor: colors.windowBg,
            borderRadius: '15px',
            border: `${STYLES.BORDER_WIDTH} solid #000`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto 1fr auto 1fr auto',
            gap: STYLES.GRID_GAP,
            padding: STYLES.WINDOW_PADDING,
            boxSizing: 'border-box',
            color: colors.text,
            fontFamily: STYLES.FONT_FAMILY
        });
        this.container.appendChild(windowDiv);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.innerText = this.uiConfig.title || 'TRADER';
        Object.assign(titleDiv.style, {
            gridColumn: '1 / 3',
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            padding: '10px',
            borderBottom: `2px solid ${colors.separator}`
        });
        windowDiv.appendChild(titleDiv);

        // Trader Panel (Left)
        this.traderPanel = document.createElement('div');
        Object.assign(this.traderPanel.style, {
            backgroundColor: this.uiConfig.colors?.panelTrader || colors.panelTrader,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid #000`,
            gridRow: '2 / 3',
            gridColumn: '1 / 2',
            color: colors.text,
            fontFamily: STYLES.FONT_FAMILY,
            padding: STYLES.PANEL_PADDING,
            overflowY: 'auto'
        });
        windowDiv.appendChild(this.traderPanel);

        const traderTitle = document.createElement('div');
        traderTitle.innerText = this.uiConfig.traderTitle || "Trader's Goods";
        traderTitle.style.marginBottom = '10px';
        traderTitle.style.fontWeight = 'bold';
        traderTitle.style.fontSize = '20px';
        this.traderPanel.appendChild(traderTitle);

        this.traderList = document.createElement('div');
        this.traderPanel.appendChild(this.traderList);

        // Player Panel (Right)
        this.playerPanel = document.createElement('div');
        Object.assign(this.playerPanel.style, {
            backgroundColor: this.uiConfig.colors?.panelPlayer || colors.panelPlayer,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid #000`,
            gridRow: '2 / 3',
            gridColumn: '2 / 3',
            color: colors.text,
            fontFamily: STYLES.FONT_FAMILY,
            padding: STYLES.PANEL_PADDING,
            overflowY: 'auto'
        });
        windowDiv.appendChild(this.playerPanel);

        const playerTitle = document.createElement('div');
        playerTitle.innerText = this.uiConfig.playerTitle || 'Your Inventory';
        playerTitle.style.marginBottom = '10px';
        playerTitle.style.fontWeight = 'bold';
        playerTitle.style.fontSize = '20px';
        this.playerPanel.appendChild(playerTitle);

        this.playerList = document.createElement('div');
        this.playerPanel.appendChild(this.playerList);

        // Separator row for visual spacing
        const separatorDiv = document.createElement('div');
        Object.assign(separatorDiv.style, {
            gridColumn: '1 / 3',
            gridRow: '3 / 4',
            height: '2px',
            backgroundColor: colors.separator
        });
        windowDiv.appendChild(separatorDiv);

        // Single Item Details Panel (Bottom - spans both columns)
        const statsPanel = document.createElement('div');
        Object.assign(statsPanel.style, {
            backgroundColor: colors.windowBg,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid #000`,
            gridRow: '4 / 5',
            gridColumn: '1 / 3',
            color: colors.text,
            fontFamily: STYLES.FONT_FAMILY,
            padding: STYLES.PANEL_PADDING
        });
        windowDiv.appendChild(statsPanel);

        const statsTitle = document.createElement('div');
        statsTitle.innerText = 'Item Details';
        statsTitle.style.marginBottom = '10px';
        statsTitle.style.fontWeight = 'bold';
        statsTitle.style.fontSize = '16px';
        statsPanel.appendChild(statsTitle);

        this.itemDetailsPanel = document.createElement('div');
        this.itemDetailsPanel.style.fontSize = '14px';
        statsPanel.appendChild(this.itemDetailsPanel);

        // Money Display (Bottom)
        const moneyDiv = document.createElement('div');
        Object.assign(moneyDiv.style, {
            gridColumn: '1 / 3',
            gridRow: '5 / 6',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
            padding: '10px',
            borderTop: `2px solid ${colors.separator}`,
            color: colors.text,
            fontFamily: STYLES.FONT_FAMILY,
            fontSize: '18px',
            fontWeight: 'bold'
        });
        windowDiv.appendChild(moneyDiv);

        const hintDiv = document.createElement('div');
        hintDiv.innerHTML = '<span class="key-icon">ENTER</span>/<span class="btn-icon xbox-a">A</span> Buy/Sell <span style="margin: 0 15px;"></span> <span class="key-icon">ESC</span>/<span class="btn-icon xbox-b">B</span> Close';
        hintDiv.style.fontSize = '14px';
        moneyDiv.appendChild(hintDiv);

        this.playerMoneyText = document.createElement('div');
        this.playerMoneyText.style.color = this.uiConfig.colors?.moneyColor || colors.moneyColor;
        moneyDiv.appendChild(this.playerMoneyText);
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
        this.activePanel = 'trader';
        this.needsRender = true;
        resetInputDebounce(this as any);
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    toggle() { if (this.isVisible) this.hide(); else this.show(); }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;
        if (input) {
            const oldIndex = this.selectedIndex;
            const oldPanel = this.activePanel;
            this.handleNavigation(player, input);
            if (oldIndex !== this.selectedIndex || oldPanel !== this.activePanel) this.needsRender = true;
        }
        if (this.needsRender) { this.render(player); this.needsRender = false; }
    }

    protected render(player: Player) {
        if (!this.traderList || !this.playerList) return;
        if (this.playerMoneyText) this.playerMoneyText.innerText = `${player.money} BITS`;
        this.renderItemList(this.traderList, this.traderInventory, this.activePanel === 'trader', 'buy', player);
        const playerItems = this.filterPlayerInventory(player);
        this.renderItemList(this.playerList, playerItems as Item[], this.activePanel === 'player', 'sell', player);
        const selectedItem = this.activePanel === 'trader' ? this.traderInventory[this.selectedIndex] : (playerItems[this.selectedIndex] as Item | undefined);
        if (this.itemDetailsPanel) this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem as Item | undefined);
    }

    protected renderItemList(container: HTMLDivElement, items: Item[], isActive: boolean, mode: TradeMode, player: Player) {
        container.innerHTML = ''; this.itemElements = [];
        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            const price = mode === 'buy' ? item.buyPrice : item.sellPrice;
            const priceText = price !== undefined ? ` (${price} bits)` : '';
            const canAfford = mode === 'sell' || (price !== undefined && player.money >= price);
            itemDiv.innerHTML = formatItemLabel(item, priceText);
            const isSelected = isActive && index === this.selectedIndex;
            Object.assign(itemDiv.style, { padding: '8px', backgroundColor: isSelected ? '#888' : 'transparent', border: isSelected ? '2px solid #fff' : '2px solid transparent', opacity: canAfford ? '1' : '0.5', transition: 'transform 0.1s', position: 'relative' });
            if ((item as any).isEquipped) {
                const triangle = document.createElement('div');
                triangle.style.position = 'absolute'; triangle.style.top = '0'; triangle.style.left = '0'; triangle.style.width = '0'; triangle.style.height = '0'; triangle.style.borderLeft = '12px solid #ffd700'; triangle.style.borderBottom = '12px solid transparent'; itemDiv.appendChild(triangle);
            }
            if (index < items.length - 1) itemDiv.style.borderBottom = '1px solid #BBBBBB';
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
        if (cancel) { this.hide(); return; }

        if (navigateUp && !this.lastNavigateUpState) {
            if (this.selectedIndex > 0) this.selectedIndex--;
        }

        if (navigateDown && !this.lastNavigateDownState) {
            const maxIndex = this.activePanel === 'trader'
                ? this.traderInventory.length - 1
                : (this.filterPlayerInventory(player) || []).length - 1;
            if (this.selectedIndex < maxIndex) this.selectedIndex++;
        }

        if (navigateLeft && !this.lastNavigateLeftState) { this.activePanel = 'trader'; this.selectedIndex = 0; }
        if (navigateRight && !this.lastNavigateRightState) { this.activePanel = 'player'; this.selectedIndex = 0; }

        if (select && !this.lastSelectState) this.handleTransaction(player);

        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastNavigateLeftState = navigateLeft;
        this.lastNavigateRightState = navigateRight;
        this.lastSelectState = select;
    }

    protected handleTransaction(player: Player) {
        if (this.activePanel === 'trader') {
            const item = this.traderInventory[this.selectedIndex];
            if (item && item.buyPrice !== undefined && player.money >= item.buyPrice) {
                player.money -= item.buyPrice;
                const clone = (item as any).clone ? (item as any).clone(`p${Date.now()}`) : { ...item, id: `p${Date.now()}` };
                (clone as any).isEquipped = false; player.inventory.push(clone as Item);
                this.traderInventory.splice(this.selectedIndex, 1);
                if (this.selectedIndex >= this.traderInventory.length && this.selectedIndex > 0) this.selectedIndex--;
                this.needsRender = true;
            }
        } else {
            const playerItems = this.filterPlayerInventory(player);
            const item = playerItems[this.selectedIndex];
            if (item && item.sellPrice !== undefined) {
                if ((item as any).isEquipped) { this.shakeItem(this.selectedIndex); return; }
                player.money += item.sellPrice;
                const sold = (item as any).clone ? (item as any).clone(`t${Date.now()}`) : { ...item, id: `t${Date.now()}` };
                (sold as any).isEquipped = false; this.traderInventory.push(sold as Item);
                const idx = player.inventory.findIndex(i => i.id === item.id);
                if (idx !== -1) player.inventory.splice(idx, 1);
                if (this.selectedIndex >= playerItems.length - 1 && this.selectedIndex > 0) this.selectedIndex--;
                this.needsRender = true;
            }
        }
    }

    protected shakeItem(index: number) {
        if (this.itemElements && this.itemElements[index]) {
            const element = this.itemElements[index];
            const keyframes = [
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0px)' }
            ];
            const timing = { duration: 300, iterations: 1 };
            try { element.animate(keyframes, timing); } catch (e) { /* ignore if not supported */ }
        }
    }
}

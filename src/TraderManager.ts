import { Player } from './Player';
import { InputManager } from './InputManager';
import { Item } from './InventoryManager';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { WeaponRegistry } from './items/WeaponRegistry';
import { CoreRegistry } from './items/CoreRegistry';

// --- Constants ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_TRADER: '#4a3520',
    PANEL_PLAYER: '#203a4a',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    MONEY_COLOR: '#ffd700'
};

const STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif',
    BORDER_RADIUS: '10px',
    BORDER_WIDTH: '2px',
    WINDOW_PADDING: '20px',
    PANEL_PADDING: '20px',
    GRID_GAP: '2px'
};

export class TraderManager {
    container!: HTMLDivElement;
    isVisible: boolean = false;

    // UI Elements
    traderList!: HTMLDivElement;
    playerList!: HTMLDivElement;
    traderPanel!: HTMLDivElement; // Scrollable container for trader list
    playerPanel!: HTMLDivElement; // Scrollable container for player list
    playerMoneyText!: HTMLDivElement;
    itemDetailsPanel!: HTMLDivElement;

    // Navigation state
    selectedIndex: number = 0;
    activePanel: 'trader' | 'player' = 'trader';
    itemElements: HTMLDivElement[] = [];
    needsRender: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastNavigateLeftState: boolean = false;
    private lastNavigateRightState: boolean = false;
    private lastSelectState: boolean = false;

    // Trader inventory
    traderInventory: Item[] = [];

    constructor() {
        this.initializeTraderInventory();
        this.createUI();
    }

    private initializeTraderInventory() {
        // Trader sells weapons from registry (excluding Aegis Sword which player starts with)
        const allWeapons = WeaponRegistry.getAllWeapons();
        const traderWeapons = allWeapons.filter(w => w.id !== 'aegis_sword');

        this.traderInventory = [];

        // Add weapons from registry
        for (const weaponDef of traderWeapons) {
            this.traderInventory.push({
                id: crypto.randomUUID(),
                name: weaponDef.name,
                type: 'weapon',
                weaponType: weaponDef.type,
                damage: weaponDef.baseDamage,
                buyPrice: weaponDef.baseBuyPrice,
                sellPrice: weaponDef.baseSellPrice,
                isEquipped: false
            });
        }

        // Add cores from registry
        const allCores = CoreRegistry.getAllCores();
        for (const coreDef of allCores) {
            this.traderInventory.push({
                id: crypto.randomUUID(),
                name: coreDef.name,
                type: 'core',
                coreStats: coreDef.stats,
                buyPrice: coreDef.buyPrice,
                sellPrice: coreDef.sellPrice,
                isEquipped: false
            });
        }

        // Add chips (these remain hardcoded for now as they don't have varying stats)
        this.traderInventory.push(
            { id: crypto.randomUUID(), name: 'Power Chip', type: 'chip', buyPrice: 100, sellPrice: 50 },
            { id: crypto.randomUUID(), name: 'Defense Chip', type: 'chip', buyPrice: 100, sellPrice: 50 }
        );
    }

    private createUI() {
        // Main Container Overlay
        this.container = this.createOverlay();
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = this.createWindow();
        this.container.appendChild(windowDiv);

        // Title
        const titleDiv = document.createElement('div');
        titleDiv.innerText = 'TRADER';
        Object.assign(titleDiv.style, {
            gridColumn: '1 / 3',
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '10px',
            borderBottom: `2px solid ${COLORS.SEPARATOR}`
        });
        windowDiv.appendChild(titleDiv);

        // Trader Panel (Left)
        this.traderPanel = this.createPanel(COLORS.PANEL_TRADER, '2 / 3', '1 / 2');
        this.traderPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.traderPanel);

        const traderTitle = document.createElement('div');
        traderTitle.innerText = "Trader's Goods";
        traderTitle.style.marginBottom = '10px';
        traderTitle.style.fontWeight = 'bold';
        traderTitle.style.fontSize = '20px';
        this.traderPanel.appendChild(traderTitle);

        this.traderList = document.createElement('div');
        this.traderPanel.appendChild(this.traderList);

        // Player Panel (Right)
        this.playerPanel = this.createPanel(COLORS.PANEL_PLAYER, '2 / 3', '2 / 3');
        this.playerPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.playerPanel);

        const playerTitle = document.createElement('div');
        playerTitle.innerText = "Your Inventory";
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
            backgroundColor: COLORS.SEPARATOR
        });
        windowDiv.appendChild(separatorDiv);

        // Single Item Details Panel (Bottom - spans both columns)
        const statsPanel = this.createPanel(COLORS.WINDOW_BG, '4 / 5', '1 / 3');
        windowDiv.appendChild(statsPanel);

        const statsTitle = document.createElement('div');
        statsTitle.innerText = "Item Details";
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
            borderTop: `2px solid ${COLORS.SEPARATOR}`,
            color: COLORS.TEXT,
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
        this.playerMoneyText.style.color = COLORS.MONEY_COLOR;
        moneyDiv.appendChild(this.playerMoneyText);
    }

    private createOverlay(): HTMLDivElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            position: 'absolute',
            top: '0',
            left: '0',
            width: '100%',
            height: '100%',
            backgroundColor: COLORS.OVERLAY,
            display: 'none',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: '1000'
        });
        return el;
    }

    private createWindow(): HTMLDivElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            width: '92vw',
            height: '92vh',
            backgroundColor: COLORS.WINDOW_BG,
            borderRadius: '15px',
            border: `2px solid ${COLORS.BORDER}`,
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gridTemplateRows: 'auto 1fr auto 1fr auto',
            gap: STYLES.GRID_GAP,
            padding: STYLES.WINDOW_PADDING,
            boxSizing: 'border-box'
        });
        return el;
    }

    private createPanel(bgColor: string, row: string, col: string): HTMLDivElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            backgroundColor: bgColor,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid ${COLORS.BORDER}`,
            gridRow: row,
            gridColumn: col,
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            padding: STYLES.PANEL_PADDING
        });
        return el;
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
        this.activePanel = 'trader';
        this.needsRender = true;
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;

        // Handle keyboard/gamepad navigation
        if (input) {
            const oldIndex = this.selectedIndex;
            const oldPanel = this.activePanel;
            this.handleNavigation(player, input);

            // Mark for re-render if selection changed
            if (oldIndex !== this.selectedIndex || oldPanel !== this.activePanel) {
                this.needsRender = true;
            }
        }

        // Only re-render if needed
        if (this.needsRender) {
            this.render(player);
            this.needsRender = false;
        }
    }

    private render(player: Player) {
        // Update Money Display
        this.playerMoneyText.innerText = `${player.money} BITS`;

        // Update Trader List
        this.renderItemList(
            this.traderList,
            this.traderInventory,
            this.activePanel === 'trader',
            'buy',
            player
        );

        // Update Player List
        this.renderItemList(
            this.playerList,
            player.inventory,
            this.activePanel === 'player',
            'sell',
            player
        );

        // Update item details panel
        const selectedItem = this.activePanel === 'trader'
            ? this.traderInventory[this.selectedIndex]
            : player.inventory[this.selectedIndex];

        this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem);
    }

    private renderItemList(
        container: HTMLDivElement,
        items: Item[],
        isActive: boolean,
        mode: 'buy' | 'sell',
        player: Player
    ) {
        container.innerHTML = '';
        this.itemElements = []; // Reset item elements

        items.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            const price = mode === 'buy' ? item.buyPrice : item.sellPrice;
            const priceText = price !== undefined ? ` (${price} bits)` : '';

            // Check if player can afford (for buy mode)
            const canAfford = mode === 'sell' || (price !== undefined && player.money >= price);

            // Set item text without equipped indicator (triangle will be overlay)
            itemDiv.innerText = `${item.name}${priceText}`;

            const isSelected = isActive && index === this.selectedIndex;

            Object.assign(itemDiv.style, {
                padding: '8px',
                backgroundColor: isSelected ? COLORS.ITEM_SELECTED : COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                opacity: canAfford ? '1' : '0.5',
                transition: 'transform 0.1s',
                position: 'relative'
            });

            // Add triangle overlay for equipped items
            if (item.isEquipped) {
                const triangle = document.createElement('div');
                triangle.style.position = 'absolute';
                triangle.style.top = '0';
                triangle.style.left = '0';
                triangle.style.width = '0';
                triangle.style.height = '0';
                triangle.style.borderLeft = '12px solid #ffd700';
                triangle.style.borderBottom = '12px solid transparent';
                itemDiv.appendChild(triangle);
            }

            // Add separator between items
            if (index < items.length - 1) {
                itemDiv.style.borderBottom = `1px solid ${COLORS.SEPARATOR}`;
            }

            // Store reference to the div for shake animation
            if (isActive) {
                this.itemElements.push(itemDiv);
            }

            container.appendChild(itemDiv);
        });

        // Scroll selected item into view
        if (isActive && this.itemElements[this.selectedIndex]) {
            this.itemElements[this.selectedIndex].scrollIntoView({
                behavior: 'auto',
                block: 'nearest'
            });
        }
    }

    private handleNavigation(player: Player, input: InputManager) {
        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const navigateLeft = input.isNavigateLeftPressed();
        const navigateRight = input.isNavigateRightPressed();
        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        // Close on cancel
        if (cancel) {
            this.hide();
            return;
        }

        // Navigate up (with debouncing)
        if (navigateUp && !this.lastNavigateUpState) {
            if (this.selectedIndex > 0) {
                this.selectedIndex--;
            }
        }

        // Navigate down (with debouncing)
        if (navigateDown && !this.lastNavigateDownState) {
            const maxIndex = this.activePanel === 'trader'
                ? this.traderInventory.length - 1
                : player.inventory.length - 1;
            if (this.selectedIndex < maxIndex) {
                this.selectedIndex++;
            }
        }

        // Navigate left/right to switch panels (with debouncing)
        if (navigateLeft && !this.lastNavigateLeftState) {
            if (this.activePanel === 'player') {
                this.activePanel = 'trader';
                this.selectedIndex = 0;
            }
        }
        if (navigateRight && !this.lastNavigateRightState) {
            if (this.activePanel === 'trader') {
                this.activePanel = 'player';
                this.selectedIndex = 0;
            }
        }

        // Select/Buy/Sell item (with debouncing)
        if (select && !this.lastSelectState) {
            this.handleTransaction(player);
        }

        // Update last states for debouncing
        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastNavigateLeftState = navigateLeft;
        this.lastNavigateRightState = navigateRight;
        this.lastSelectState = select;
    }

    private handleTransaction(player: Player) {
        if (this.activePanel === 'trader') {
            // Buy from trader
            const item = this.traderInventory[this.selectedIndex];
            if (item && item.buyPrice !== undefined) {
                if (player.money >= item.buyPrice) {
                    // Transfer item to player
                    player.money -= item.buyPrice;
                    const newItem = { ...item, id: `p${Date.now()}`, isEquipped: false }; // Give it a unique ID
                    player.inventory.push(newItem);

                    // Remove item from trader inventory
                    this.traderInventory.splice(this.selectedIndex, 1);

                    console.log(`Bought ${item.name} for ${item.buyPrice} bits`);

                    // Adjust selection if needed
                    if (this.selectedIndex >= this.traderInventory.length && this.selectedIndex > 0) {
                        this.selectedIndex--;
                    }

                    this.needsRender = true;
                } else {
                    console.log(`Not enough money to buy ${item.name}`);
                }
            }
        } else {
            // Sell to trader
            const item = player.inventory[this.selectedIndex];
            if (item && item.sellPrice !== undefined) {
                // Check if item is equipped
                if (item.isEquipped) {
                    // Shake animation for equipped item
                    console.log(`Cannot sell equipped item: ${item.name}`);
                    this.shakeItem(this.selectedIndex);
                    return;
                }

                // Transfer money to player and add item to trader inventory
                player.money += item.sellPrice;
                const soldItem = { ...item, id: `t${Date.now()}`, isEquipped: false }; // Give it a unique trader ID
                this.traderInventory.push(soldItem); // Add to trader inventory
                player.inventory.splice(this.selectedIndex, 1);
                console.log(`Sold ${item.name} for ${item.sellPrice} bits`);

                // Adjust selection if needed
                if (this.selectedIndex >= player.inventory.length && this.selectedIndex > 0) {
                    this.selectedIndex--;
                }
                this.needsRender = true;
            }
        }
    }

    private shakeItem(index: number) {
        if (this.itemElements[index]) {
            const element = this.itemElements[index];

            // Apply shake animation using CSS keyframes
            const keyframes = [
                { transform: 'translateX(0px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(-5px)' },
                { transform: 'translateX(5px)' },
                { transform: 'translateX(0px)' }
            ];

            const timing = {
                duration: 300,
                iterations: 1
            };

            element.animate(keyframes, timing);
        }
    }
}

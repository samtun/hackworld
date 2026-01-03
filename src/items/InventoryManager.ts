import { Player } from '../Player';
import { InputManager } from '../InputManager';

// --- Constants ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_EQUIPPED: '#90a4ae',
    PANEL_STATS: '#424242',
    PANEL_LOOT: '#555',
    SLOT_BG: '#cfd8dc',
    ITEM_HOVER: '#666',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB'
};

const STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif',
    BORDER_RADIUS: '10px',
    BORDER_WIDTH: '2px',
    WINDOW_PADDING: '20px',
    PANEL_PADDING: '20px',
    GRID_GAP: '20px',
    SLOT_GAP: '15px'
};

import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Item } from './Item';
import { EquippableItem } from './EquippableItem';
import { formatItemLabel } from './ItemDisplay';
import { WeaponType } from './weapons/WeaponType';

export { Item }; // Re-export Item for other files that might import it from here

export class InventoryManager {
    private static instance: InventoryManager; // Singleton

    container!: HTMLDivElement;
    isVisible: boolean = false;

    // UI Elements
    statsText!: HTMLDivElement;
    lootList!: HTMLDivElement;
    lootPanel!: HTMLDivElement; // Scrollable container for loot list
    itemDetailsPanel!: HTMLDivElement;

    // Navigation state
    selectedIndex: number = 0;
    itemElements: HTMLDivElement[] = [];
    needsRender: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;

    private constructor() {
        this.createUI();
    }

    public static get Instance(): InventoryManager {
        return this.instance || (this.instance = new this());
    }

    private createUI() {
        // Main Container Overlay
        this.container = this.createOverlay();
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = this.createWindow();
        this.container.appendChild(windowDiv);

        // 2. Stats Panel (Left Column - Full Height)
        const statsPanel = this.createPanel(COLORS.PANEL_STATS, '1 / 3', '1 / 2');
        statsPanel.style.fontSize = '18px';
        statsPanel.style.display = 'flex';
        statsPanel.style.flexDirection = 'column';
        windowDiv.appendChild(statsPanel);

        // Level display (top of stats panel)
        const levelDisplay = document.createElement('div');
        levelDisplay.id = 'level-display';
        levelDisplay.style.fontSize = '24px';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.marginBottom = '20px';
        levelDisplay.style.color = '#ffd700'; // Gold color
        levelDisplay.style.textShadow = '2px 2px 0px #000';
        levelDisplay.style.textAlign = 'center';
        statsPanel.appendChild(levelDisplay);

        this.statsText = document.createElement('div');
        statsPanel.appendChild(this.statsText);

        // 3. Loot Panel (Top Right)
        this.lootPanel = this.createPanel(COLORS.PANEL_LOOT, '1 / 2', '2 / 3');
        this.lootPanel.style.overflowY = 'auto';
        windowDiv.appendChild(this.lootPanel);

        const lootTitle = document.createElement('div');
        lootTitle.innerText = "Collected loot";
        lootTitle.style.marginBottom = '10px';
        lootTitle.style.fontWeight = 'bold';
        this.lootPanel.appendChild(lootTitle);

        this.lootList = document.createElement('div');
        this.lootPanel.appendChild(this.lootList);

        // 4. Extra Panel (Bottom Right) - Item Details
        const extraPanel = this.createPanel(COLORS.PANEL_LOOT, '2 / 3', '2 / 3');
        extraPanel.style.position = 'relative';
        windowDiv.appendChild(extraPanel);

        const itemDetailsTitle = document.createElement('div');
        itemDetailsTitle.innerText = "Item Details";
        itemDetailsTitle.style.marginBottom = '10px';
        itemDetailsTitle.style.fontWeight = 'bold';
        extraPanel.appendChild(itemDetailsTitle);

        this.itemDetailsPanel = document.createElement('div');
        this.itemDetailsPanel.style.fontSize = '16px';
        extraPanel.appendChild(this.itemDetailsPanel);
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
            gridTemplateColumns: '30% 1fr',
            gridTemplateRows: '1fr 1fr', // Use fr to respect gap and padding
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

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';

        // Reset selection when opening inventory
        if (this.isVisible) {
            this.selectedIndex = 0;
            this.needsRender = true;
        }
    }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;

        // Handle keyboard/gamepad navigation
        if (input) {
            const oldIndex = this.selectedIndex;
            this.handleNavigation(player, input);

            // Mark for re-render if selection changed
            if (oldIndex !== this.selectedIndex) {
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
        // Update Level Display
        const levelDisplay = document.getElementById('level-display');
        if (levelDisplay) {
            levelDisplay.innerText = `Level ${player.level}`;
        }

        // Update Stats
        this.statsText.innerHTML = this.generateStatsHTML(player);

        // Update Item Details for selected item
        const selectedItem = player.inventory[this.selectedIndex];
        this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem);

        // Update Loot List
        this.lootList.innerHTML = '';
        this.itemElements = [];

        player.inventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            const priceText = item.sellPrice !== undefined ? ` (${item.sellPrice} bits)` : '';

            // Set item text without equipped indicator (triangle will be overlay)
            itemDiv.innerHTML = formatItemLabel(item, priceText);

            const isSelected = index === this.selectedIndex;

            Object.assign(itemDiv.style, {
                padding: '5px',
                backgroundColor: isSelected ? COLORS.ITEM_SELECTED : COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                position: 'relative'
            });

            // Add triangle overlay for equipped items
            if (item instanceof EquippableItem && item.isEquipped) {
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
            if (index < player.inventory.length - 1) {
                itemDiv.style.borderBottom = `1px solid ${COLORS.SEPARATOR}`;
            }

            this.itemElements.push(itemDiv);
            this.lootList.appendChild(itemDiv);
        });

        // Scroll selected item into view
        if (this.itemElements[this.selectedIndex]) {
            this.itemElements[this.selectedIndex].scrollIntoView({
                behavior: 'auto',
                block: 'nearest'
            });
        }
    }

    private handleNavigation(player: Player, input: InputManager) {
        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const select = input.isSelectPressed();

        // Navigate up (with debouncing)
        if (navigateUp && !this.lastNavigateUpState) {
            if (this.selectedIndex > 0) {
                this.selectedIndex--;
            }
        }

        // Navigate down (with debouncing)
        if (navigateDown && !this.lastNavigateDownState) {
            if (this.selectedIndex < player.inventory.length - 1) {
                this.selectedIndex++;
            }
        }

        // Select/Equip item (with debouncing)
        if (select && !this.lastSelectState) {
            const item = player.inventory[this.selectedIndex];
            if (item instanceof EquippableItem) {
                item.equip(player);
                console.log(`Equipped item: ${item.name}`);
                // Trigger re-render to update equipped indicator immediately
                this.needsRender = true;
            }
        }

        // Update last states for debouncing
        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastSelectState = select;
    }

    private generateStatsHTML(player: Player): string {
        const stats = [
            { label: 'HP', value: `${Math.ceil(player.hp)} / ${player.maxHp}` },
            { label: 'TP', value: `${Math.ceil(player.tp)} / ${player.maxTp}` },
            { label: 'Strength', value: player.strength },
            { label: 'Defense', value: player.defense },
            { label: 'Bits', value: player.money }
        ];

        const statsHTML = stats.map(stat => `
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>${stat.label}</span> <span>${stat.value}</span>
            </div>
        `).join(`<div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%;"></div>`);

        // Add X-Data display
        const xDataHTML = `
            <div style="height: 2px; background-color: ${COLORS.SEPARATOR}; width: 100%; margin: 10px 0;"></div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span style="color: #00ffff;">X-Data</span> <span style="color: #00ffff;">${player.xData}</span>
            </div>
        `;

        // Add EXP display
        const expHTML = `
            <div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%; margin: 10px 0;"></div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span style="color: #ffaa00;">EXP to Next</span> <span style="color: #ffaa00;">${player.expRequired - player.exp}</span>
            </div>
        `;

        // Add Tech display
        const techHTML = `
            <div style="height: 2px; background-color: ${COLORS.SEPARATOR}; width: 100%; margin: 10px 0;"></div>
            <div style="font-weight: bold; padding: 5px 0;">Tech</div>
            <div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%;"></div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>Sword</span> <span>${player.tech[WeaponType.SWORD]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>Double Sword</span> <span>${player.tech[WeaponType.DUAL_BLADE]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>Lance</span> <span>${player.tech[WeaponType.LANCE]}</span>
            </div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>Hammer</span> <span>${player.tech[WeaponType.HAMMER]}</span>
            </div>
        `;

        return statsHTML + xDataHTML + expHTML + techHTML;
    }
}

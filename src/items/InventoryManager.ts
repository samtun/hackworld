import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { shakeElement } from '../ui/UiUtils';
import { StatType } from '../StatType';

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
    private lastCancelState: boolean = false;

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

        // Level display container with stat points
        const levelContainer = document.createElement('div');
        levelContainer.style.display = 'flex';
        levelContainer.style.justifyContent = 'space-between';
        levelContainer.style.alignItems = 'center';
        levelContainer.style.marginBottom = '20px';
        statsPanel.appendChild(levelContainer);

        // Level display (left side)
        const levelDisplay = document.createElement('div');
        levelDisplay.id = 'level-display';
        levelDisplay.style.fontSize = '24px';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.color = '#ffd700'; // Gold color
        levelDisplay.style.textShadow = '2px 2px 0px #000';
        levelContainer.appendChild(levelDisplay);

        // Stat points display (right side)
        const statPointsDisplay = document.createElement('div');
        statPointsDisplay.id = 'stat-points-display';
        statPointsDisplay.style.fontSize = '24px';
        statPointsDisplay.style.fontWeight = 'bold';
        statPointsDisplay.style.color = '#ffd700'; // Gold color
        statPointsDisplay.style.textShadow = '2px 2px 0px #000';
        statPointsDisplay.style.display = 'none'; // Hidden by default
        levelContainer.appendChild(statPointsDisplay);

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

        // Hide/show skills button when inventory is toggled
        const mobileControls = InputManager.Instance.mobileControls;
        if (mobileControls) {
            mobileControls.setSkillsButtonVisible(!this.isVisible);
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
        
        // Update stat points display if available
        const statPointsDisplay = document.getElementById('stat-points-display');
        if (statPointsDisplay) {
            if (player.statPointsAvailable > 0) {
                statPointsDisplay.innerText = `${player.statPointsAvailable}`;
                statPointsDisplay.style.display = 'block';
            } else {
                statPointsDisplay.style.display = 'none';
            }
        }

        // Update Stats
        this.statsText.innerHTML = this.generateStatsHTML(player);
        
        // Attach event listeners to stat add buttons
        this.attachStatButtonListeners(player);

        // Update Item Details for selected item
        const selectedItem = player.inventory[this.selectedIndex];
        this.itemDetailsPanel.innerHTML = ItemDetailsPanel.generateHTML(selectedItem);

        // Update Loot List
        this.lootList.innerHTML = '';
        this.itemElements = [];

        player.inventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');

            // Set item text without equipped indicator (triangle will be overlay)
            itemDiv.innerHTML = formatItemLabel(item);

            const isSelected = index === this.selectedIndex;

            // Check if item can be equipped (for EquippableItems only)
            const canEquip = item instanceof EquippableItem ? item.canEquip(player) : true;

            Object.assign(itemDiv.style, {
                padding: '5px',
                backgroundColor: isSelected ? COLORS.ITEM_SELECTED : COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                position: 'relative',
                opacity: canEquip ? '1' : '0.5'
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

    private attachStatButtonListeners(player: Player) {
        const buttons = this.statsText.querySelectorAll('.stat-add-btn');
        buttons.forEach(button => {
            button.addEventListener('click', () => {
                const statType = button.getAttribute('data-stat') as StatType;
                if (statType) {
                    const success = player.addStatPoint(statType);
                    if (success) {
                        this.needsRender = true;
                    } else {
                        // Shake the stats panel if can't add point
                        shakeElement(this.statsText);
                    }
                }
            });
        });
    }

    private handleNavigation(player: Player, input: InputManager) {
        const navigateUp = input.isNavigateUpPressed();
        const navigateDown = input.isNavigateDownPressed();
        const select = input.isSelectPressed();
        const cancel = input.isCancelPressed();

        // Cancel/Close inventory (with debouncing)
        if (cancel && !this.lastCancelState) {
            this.toggle(); // Close the inventory
            this.lastCancelState = cancel;
            return; // Exit early to prevent other navigation
        }

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
                // Check if item can be equipped
                if (item.canEquip(player)) {
                    item.equip(player);
                    console.log(`Equipped item: ${item.name}`);
                    // Trigger re-render to update equipped indicator immediately
                    this.needsRender = true;
                } else {
                    // Item cannot be equipped - shake it
                    this.shakeItem(this.selectedIndex);
                }
            }
        }

        // Update last states for debouncing
        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastSelectState = select;
        this.lastCancelState = cancel;
    }

    private generateStatsHTML(player: Player): string {
        const hasStatPoints = player.statPointsAvailable > 0;
        
        // Helper function to create a stat row with optional + button
        const createStatRow = (label: string, value: string | number, statType?: StatType) => {
            const buttonHTML = hasStatPoints && statType && statType !== StatType.HP && statType !== StatType.TP
                ? `<button class="stat-add-btn" data-stat="${statType}" style="margin-left: 10px; padding: 2px 8px; cursor: pointer; background: #666; color: #fff; border: 1px solid #fff; border-radius: 3px; font-family: inherit; font-size: 14px;">+</button>`
                : '';
            
            return `
                <div style="display:flex; justify-content:space-between; align-items:center; padding: 5px 0;">
                    <span>${label}</span> 
                    <span style="display: flex; align-items: center;">
                        ${value}${buttonHTML}
                    </span>
                </div>
            `;
        };

        const stats = [
            createStatRow('HP', `${Math.ceil(player.hp)} / ${player.maxHp}`, StatType.HP),
            createStatRow('TP', `${Math.ceil(player.tp)} / ${player.maxTp}`, StatType.TP),
            createStatRow('Strength', player.strength, StatType.STRENGTH),
            createStatRow('Defense', player.defense, StatType.DEFENSE),
            createStatRow('Agility', player.agility, StatType.AGILITY),
            createStatRow('Luck', player.luck, StatType.LUCK),
            createStatRow('Bits', player.money)
        ];

        const statsHTML = stats.join(`<div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%;"></div>`);

        // Add X-Data display
        const xDataHTML = `
            <div style="height: 2px; background-color: ${COLORS.SEPARATOR}; width: 100%; margin: 10px 0;"></div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span style="color: #00ffff;">X-Data</span> <span style="color: #00ffff;">${player.xData}</span>
            </div>
        `;

        // Add Booster Packs display
        const boosterPacksHTML = `
            <div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%;"></div>
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span style="color: #ffaa00;">Booster Packs</span> <span style="color: #ffaa00;">${player.boosterPacks}</span>
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

        return statsHTML + xDataHTML + techHTML + boosterPacksHTML + expHTML;
    }

    private shakeItem(index: number) {
        if (this.itemElements && this.itemElements[index]) {
            shakeElement(this.itemElements[index]);
        }
    }
}

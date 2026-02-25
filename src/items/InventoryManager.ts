import { Player } from '../Player';
import { InputManager } from '../InputManager';
import { shakeElement } from '../ui/UiUtils';
import { StatType } from '../StatType';
import { MenuManager, MENU_COLORS } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';
import { getHint, HintConfigs } from '../ui/InputHints';
import { ItemDetailsPanel } from './ItemDetailsPanel';
import { Item } from './Item';
import { EquippableItem } from './EquippableItem';
import { formatItemLabel } from './ItemDisplay';
import { WeaponType } from './weapons/WeaponType';
import { SkillTechType } from '../skills/SkillTechType';

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

    // Scrollable stats panel reference for R-Thumbstick scrolling
    private statsScrollPanel: HTMLDivElement | null = null;

    private menuManager: MenuManager;
    private uiManager: UIManager;

    private constructor() {
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    public static get Instance(): InventoryManager {
        return this.instance || (this.instance = new this());
    }

    private createUI() {
        // Main Container Overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = this.menuManager.createGridWindow('30% 1fr', '1fr 1fr');
        this.container.appendChild(windowDiv);

        // 2. Stats Panel (Left Column - Full Height)
        const statsPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_STATS,
            gridRow: '1 / 3',
            gridColumn: '1 / 2'
        });
        statsPanel.style.fontSize = '18px';
        statsPanel.style.display = 'flex';
        statsPanel.style.flexDirection = 'column';
        statsPanel.style.overflow = 'hidden';
        windowDiv.appendChild(statsPanel);

        // Level display container with stat points
        const levelContainer = document.createElement('div');
        levelContainer.style.display = 'flex';
        levelContainer.style.justifyContent = 'space-between';
        levelContainer.style.alignItems = 'center';
        levelContainer.style.marginBottom = '20px';
        levelContainer.style.flexShrink = '0';
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

        // Scrollable container for the stats content
        const statsScrollPanel = document.createElement('div');
        statsScrollPanel.style.overflowY = 'auto';
        statsScrollPanel.style.flex = '1';
        statsPanel.appendChild(statsScrollPanel);
        this.statsScrollPanel = statsScrollPanel;

        this.statsText = document.createElement('div');
        statsScrollPanel.appendChild(this.statsText);

        // 3. Loot Panel (Top Right)
        this.lootPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_LOOT,
            gridRow: '1 / 2',
            gridColumn: '2 / 3'
        });
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
        const extraPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_LOOT,
            gridRow: '2 / 3',
            gridColumn: '2 / 3'
        });
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

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';

        // Reset selection when opening inventory
        if (this.isVisible) {
            this.selectedIndex = 0;
            this.needsRender = true;
        } else {
            // Hide centralized control hints when menu closes
            this.uiManager.hideControlHints();
        }
    }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;

        // Handle keyboard/gamepad navigation
        if (input) {
            // Update centralized control hints based on input method
            this.uiManager.showControlHints(getHint(HintConfigs.inventoryNavigate, input));

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
                backgroundColor: isSelected ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.TRANSPARENT,
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
                itemDiv.style.borderBottom = `1px solid ${MENU_COLORS.SEPARATOR}`;
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

        // Scroll stats panel with R-Thumbstick
        const thumbstickY = input.getRightThumbstickY();
        if (thumbstickY !== 0 && this.statsScrollPanel) {
            this.statsScrollPanel.scrollTop += thumbstickY * 8;
        }

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
        const sep = `<div style="height: 1px; background-color: ${MENU_COLORS.SEPARATOR}; width: 100%;"></div>`;
        const secSep = `<div style="height: 2px; background-color: ${MENU_COLORS.SEPARATOR}; width: 100%; margin: 10px 0;"></div>`;

        // Helper to create a stat cell with optional + button
        const statCell = (label: string, value: string | number, statType?: StatType) => {
            const buttonHTML = hasStatPoints && statType && statType !== StatType.HP && statType !== StatType.TP
                ? `<button class="stat-add-btn" data-stat="${statType}" style="margin-left: 6px; padding: 1px 6px; cursor: pointer; background: #666; color: #fff; border: 1px solid #fff; border-radius: 3px; font-family: inherit; font-size: 13px;">+</button>`
                : '';
            return `<div style="padding: 4px 0;">
                <span style="font-size:13px; color:#aaa;">${label}</span><br>
                <span style="display:inline-flex; align-items:center;">${value}${buttonHTML}</span>
            </div>`;
        };

        // 2-column grid for HP/TP
        const hpTpHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                ${statCell('HP', `${Math.ceil(player.hp)}/${player.maxHp}`, StatType.HP)}
                ${statCell('TP', `${Math.ceil(player.tp)}/${player.maxTp}`, StatType.TP)}
            </div>${sep}`;

        // 2-column grid for combat stats
        const combatStatsHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                ${statCell('Strength', player.strength, StatType.STRENGTH)}
                ${statCell('Defense', player.defense, StatType.DEFENSE)}
                ${statCell('Agility', player.agility, StatType.AGILITY)}
                ${statCell('Luck', player.luck, StatType.LUCK)}
            </div>${sep}`;

        // Single-row stats
        const miscHTML = `
            <div style="display:flex; justify-content:space-between; padding: 4px 0;">
                <span>Bits</span> <span>${player.money}</span>
            </div>`;

        // Add X-Data display
        const xDataHTML = `${secSep}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#00ffff;">X-Data</span><br><span style="color:#00ffff;">${player.xData}</span></div>
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#ffaa00;">Booster Packs</span><br><span style="color:#ffaa00;">${player.boosterPacks}</span></div>
            </div>${sep}
            <div style="display:flex; justify-content:space-between; padding: 4px 0;">
                <span style="color: #ffaa00;">EXP to Next</span> <span style="color: #ffaa00;">${player.expRequired - player.exp}</span>
            </div>`;

        // Tech in 2-column grid
        const techHTML = `${secSep}
            <div style="font-weight: bold; padding: 4px 0;">Tech</div>${sep}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">Sword</span><br>${player.tech[WeaponType.SWORD]}</div>
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">Double Sword</span><br>${player.tech[WeaponType.DUAL_BLADE]}</div>
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">Lance</span><br>${player.tech[WeaponType.LANCE]}</div>
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">Hammer</span><br>${player.tech[WeaponType.HAMMER]}</div>
            </div>`;

        // Skill Tech in 2-column grid (3 items — third spans both cols)
        const skillTechHTML = `${secSep}
            <div style="font-weight: bold; padding: 4px 0;">Skill Tech</div>${sep}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:4px;">
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">${SkillTechType.RECOVERY}</span><br>${player.skillTech[SkillTechType.RECOVERY]}</div>
                <div style="padding: 4px 0;"><span style="font-size:13px; color:#aaa;">${SkillTechType.BLAST}</span><br>${player.skillTech[SkillTechType.BLAST]}</div>
                <div style="grid-column:1/-1; padding: 4px 0;"><span style="font-size:13px; color:#aaa;">${SkillTechType.RANGED}</span><br>${player.skillTech[SkillTechType.RANGED]}</div>
            </div>`;

        return hpTpHTML + combatStatsHTML + miscHTML + xDataHTML + techHTML + skillTechHTML;
    }

    private shakeItem(index: number) {
        if (this.itemElements && this.itemElements[index]) {
            shakeElement(this.itemElements[index]);
        }
    }
}

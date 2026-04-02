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
import { sortInventory } from './ItemSorter';
import { WeaponType } from './weapons/WeaponType';
import { SkillTechType } from '../skills/SkillTechType';
import { MobileControlsManager } from '../MobileControlsManager';
import {
    ICON_HP, ICON_TP, ICON_STRENGTH, ICON_DEFENSE, ICON_AGILITY, ICON_LUCK,
    ICON_BITS, ICON_NEXTLVL, ICON_XDATA, ICON_BOOSTER,
    getWeaponIcon, getSkillTechIcon
} from '../ui/StatIcons';

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

    // Sort flag – set when the inventory opens so items are sorted once
    private pendingSort: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;

    // Scrollable stats panel reference for R-Thumbstick scrolling
    private statsScrollPanel: HTMLDivElement | null = null;

    // Mobile inventory panel toggle
    private mobileShowingStats: boolean = false;
    private mobileToggleButton: HTMLButtonElement | null = null;

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
        const isMobile = MobileControlsManager.Instance.isMobile;

        // Main Container Overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        if (isMobile) {
            this.createMobileUI();
        } else {
            this.createDesktopUI();
        }
    }

    private createDesktopUI() {
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

    private createMobileUI() {
        // Mobile: single-column layout with a toggle between stats and items
        const windowDiv = this.menuManager.createWindow();
        windowDiv.style.display = 'flex';
        windowDiv.style.flexDirection = 'column';
        windowDiv.style.position = 'relative';
        windowDiv.style.overflow = 'hidden';
        this.container.appendChild(windowDiv);

        // Slider container holds both panels side by side
        const slider = document.createElement('div');
        slider.style.display = 'flex';
        slider.style.flex = '1';
        slider.style.transition = 'transform 250ms ease-in-out';
        slider.style.width = '200%';
        slider.style.minHeight = '0';
        windowDiv.appendChild(slider);

        // Stats panel (left half of slider)
        const statsPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_STATS,
        });
        statsPanel.style.width = '50%';
        statsPanel.style.flexShrink = '0';
        statsPanel.style.fontSize = '16px';
        statsPanel.style.display = 'flex';
        statsPanel.style.flexDirection = 'column';
        statsPanel.style.overflow = 'hidden';
        statsPanel.style.boxSizing = 'border-box';
        slider.appendChild(statsPanel);

        // Level display container with stat points
        const levelContainer = document.createElement('div');
        levelContainer.style.display = 'flex';
        levelContainer.style.justifyContent = 'space-between';
        levelContainer.style.alignItems = 'center';
        levelContainer.style.marginBottom = '12px';
        levelContainer.style.flexShrink = '0';
        statsPanel.appendChild(levelContainer);

        const levelDisplay = document.createElement('div');
        levelDisplay.id = 'level-display';
        levelDisplay.style.fontSize = '20px';
        levelDisplay.style.fontWeight = 'bold';
        levelDisplay.style.color = '#ffd700';
        levelDisplay.style.textShadow = '2px 2px 0px #000';
        levelContainer.appendChild(levelDisplay);

        const statsScrollPanel = document.createElement('div');
        statsScrollPanel.style.overflowY = 'auto';
        statsScrollPanel.style.flex = '1';
        statsPanel.appendChild(statsScrollPanel);
        this.statsScrollPanel = statsScrollPanel;

        this.statsText = document.createElement('div');
        statsScrollPanel.appendChild(this.statsText);

        // Items wrapper (right half of slider) - contains loot + details vertically
        const itemsWrapper = document.createElement('div');
        itemsWrapper.style.width = '50%';
        itemsWrapper.style.flexShrink = '0';
        itemsWrapper.style.display = 'flex';
        itemsWrapper.style.flexDirection = 'column';
        itemsWrapper.style.gap = '10px';
        itemsWrapper.style.boxSizing = 'border-box';
        slider.appendChild(itemsWrapper);

        // Loot Panel
        this.lootPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_LOOT,
        });
        this.lootPanel.style.overflowY = 'auto';
        this.lootPanel.style.flex = '1';
        itemsWrapper.appendChild(this.lootPanel);

        const lootTitle = document.createElement('div');
        lootTitle.innerText = "Collected loot";
        lootTitle.style.marginBottom = '10px';
        lootTitle.style.fontWeight = 'bold';
        this.lootPanel.appendChild(lootTitle);

        this.lootList = document.createElement('div');
        this.lootPanel.appendChild(this.lootList);

        // Item Details Panel
        const extraPanel = this.menuManager.createPanel({
            backgroundColor: MENU_COLORS.PANEL_LOOT,
        });
        extraPanel.style.position = 'relative';
        extraPanel.style.flexShrink = '0';
        extraPanel.style.maxHeight = '35%';
        extraPanel.style.overflowY = 'auto';
        itemsWrapper.appendChild(extraPanel);

        const itemDetailsTitle = document.createElement('div');
        itemDetailsTitle.innerText = "Item Details";
        itemDetailsTitle.style.marginBottom = '10px';
        itemDetailsTitle.style.fontWeight = 'bold';
        extraPanel.appendChild(itemDetailsTitle);

        this.itemDetailsPanel = document.createElement('div');
        this.itemDetailsPanel.style.fontSize = '14px';
        extraPanel.appendChild(this.itemDetailsPanel);

        // Toggle button (fixed at bottom center of window)
        const toggleBtn = document.createElement('button');
        toggleBtn.style.cssText = [
            'position:absolute',
            'bottom:10px',
            'left:50%',
            'transform:translateX(-50%)',
            'width:48px',
            'height:48px',
            'border-radius:50%',
            'border:2px solid #fff',
            'background:rgba(0,0,0,0.7)',
            'color:#fff',
            'font-size:20px',
            'cursor:pointer',
            'z-index:10',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'touch-action:manipulation',
            'user-select:none',
            '-webkit-user-select:none',
            '-webkit-tap-highlight-color:transparent',
            'pointer-events:auto',
        ].join(';');
        toggleBtn.textContent = '«';
        windowDiv.appendChild(toggleBtn);
        this.mobileToggleButton = toggleBtn;

        // Start with items panel visible as it's the primary view on mobile
        this.mobileShowingStats = false;
        slider.style.transform = 'translateX(-50%)';

        toggleBtn.addEventListener('touchend', (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.toggleMobilePanel(slider);
        });
        toggleBtn.addEventListener('click', () => {
            this.toggleMobilePanel(slider);
        });
    }

    private toggleMobilePanel(slider: HTMLElement) {
        this.mobileShowingStats = !this.mobileShowingStats;
        if (this.mobileShowingStats) {
            slider.style.transform = 'translateX(0)';
            if (this.mobileToggleButton) this.mobileToggleButton.textContent = '»';
        } else {
            slider.style.transform = 'translateX(-50%)';
            if (this.mobileToggleButton) this.mobileToggleButton.textContent = '«';
        }
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';

        // Reset selection when opening inventory
        if (this.isVisible) {
            this.selectedIndex = 0;
            this.needsRender = true;
            this.pendingSort = true;
        } else {
            // Hide centralized control hints when menu closes
            this.uiManager.hideControlHints();
        }
    }

    update(player: Player, input?: InputManager) {
        if (!this.isVisible) return;

        if (this.pendingSort) {
            sortInventory(player.inventory);
            this.pendingSort = false;
        }

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
                        console.warn(`Cannot add stat point to ${statType}`);
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
        const sep = `<div style="height: 1px; background-color: ${MENU_COLORS.SEPARATOR}; width: 100%; margin: 4px 0;"></div>`;

        // Helper to create a stat cell with optional + button
        const statCell = (icon: string, label: string, value: number, statType?: StatType) => {
            const buttonHTML = hasStatPoints && statType && statType !== StatType.HP && statType !== StatType.TP && value < player.MAX_STAT_VALUE
                ? `<button class="stat-add-btn" data-stat="${statType}" style="padding: 1px 6px; cursor: pointer; background: #666; color: #fff; border: 1px solid #fff; border-radius: 3px; font-family: inherit; font-size: 13px;">+</button>`
                : '';
            return `<div style="display:flex; align-items:center; gap:4px;">
                ${icon}
                <div style="flex:1;">
                    <div style="font-size:13px; color:#aaa;">${label}</div>
                    <div>${value}</div>
                </div>
                ${buttonHTML}
            </div>`;
        };
        
        // Bits and exp to next level
        const miscHTML = `
            <div style="display:grid; grid-template-columns:1fr 1fr; gap: 4px">
                <div style="display:flex; align-items:center; gap:4px;">${ICON_BITS}<div><div style="font-size:13px; color:#aaa;">Bits</div><div>${player.bits}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${ICON_NEXTLVL}<div><div style="font-size:13px; color:#aaa;">Next lvl</div><div>${player.expRequired - player.exp}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${ICON_XDATA}<div><div style="font-size:13px; color:#aaa;">X-Data</div><div>${player.xData}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${ICON_BOOSTER}<div><div style="font-size:13px; color:#aaa;">Booster Packs</div><div>${player.boosterPacks}</div></div></div>
            </div>${sep}`;

        // 2-column grid for stats
        const statsHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-weight: bold;">Stats</span>${hasStatPoints ? `<span style="color:#ffd700; font-size:14px;">+${player.statPointsAvailable}</span>` : ''}</div>${sep}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap: 4px">
                ${statCell(ICON_HP, 'Max HP', player.maxHp, StatType.HP)}
                ${statCell(ICON_TP, 'Max TP', player.maxTp, StatType.TP)}
                ${statCell(ICON_STRENGTH, 'Strength', player.strength, StatType.STRENGTH)}
                ${statCell(ICON_DEFENSE, 'Defense', player.defense, StatType.DEFENSE)}
                ${statCell(ICON_AGILITY, 'Agility', player.agility, StatType.AGILITY)}
                ${statCell(ICON_LUCK, 'Luck', player.luck, StatType.LUCK)}
            </div>`;

        // Tech in 2-column grid
        const techHTML = `${sep}
            <div style="font-weight: bold;">Tech</div>${sep}
            <div style="display:grid; grid-template-columns:1fr 1fr; gap: 4px">
                <div style="display:flex; align-items:center; gap:4px;">${getWeaponIcon(WeaponType.SWORD)}<div><div style="font-size:13px; color:#aaa;">Sword</div><div>${player.tech[WeaponType.SWORD]}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${getWeaponIcon(WeaponType.DUAL_BLADE)}<div><div style="font-size:13px; color:#aaa;">Double Sword</div><div>${player.tech[WeaponType.DUAL_BLADE]}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${getWeaponIcon(WeaponType.LANCE)}<div><div style="font-size:13px; color:#aaa;">Lance</div><div>${player.tech[WeaponType.LANCE]}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${getWeaponIcon(WeaponType.HAMMER)}<div><div style="font-size:13px; color:#aaa;">Hammer</div><div>${player.tech[WeaponType.HAMMER]}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${getSkillTechIcon(SkillTechType.RECOVERY)}<div><div style="font-size:13px; color:#aaa;">${SkillTechType.RECOVERY}</div><div>${player.skillTech[SkillTechType.RECOVERY]}</div></div></div>
                <div style="display:flex; align-items:center; gap:4px;">${getSkillTechIcon(SkillTechType.BLAST)}<div><div style="font-size:13px; color:#aaa;">${SkillTechType.BLAST}</div><div>${player.skillTech[SkillTechType.BLAST]}</div></div></div>
                <div style="grid-column:1/-1; display:flex; align-items:center; gap:4px;">${getSkillTechIcon(SkillTechType.RANGED)}<div><div style="font-size:13px; color:#aaa;">${SkillTechType.RANGED}</div><div>${player.skillTech[SkillTechType.RANGED]}</div></div></div>
            </div>`;

        return miscHTML + statsHTML + techHTML;
    }

    private shakeItem(index: number) {
        if (this.itemElements && this.itemElements[index]) {
            shakeElement(this.itemElements[index]);
        }
    }
}

import { Player } from '../../player/Player';
import { InputManager } from '../../controls/InputManager';
import { resetInputDebounce } from '../../ui/UiUtils';
import { StatType } from '../../StatType';
import { getHint, HintConfigs } from '../../ui/InputHints';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../../ui/MenuManager';
import { UIManager } from '../../ui/UIManager';
import { AudioManager } from '../../AudioManager';
import { singleton } from 'tsyringe';

interface StatInfo {
    type: StatType;
    label: string;
    description: string;
    upgradeEffect: string;
}

@singleton()
export class XDataUpgradeManager {
    container!: HTMLDivElement;
    isVisible: boolean = false;

    // UI Elements
    xDataDisplay!: HTMLDivElement;
    statList!: HTMLDivElement;
    itemElements: HTMLDivElement[] = [];

    // Navigation state
    selectedIndex: number = 0;
    needsRender: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;

    // Stat options
    private stats: StatInfo[] = [
        { type: StatType.STRENGTH, label: 'Strength', description: 'Increases weapon damage', upgradeEffect: '+1 per upgrade' },
        { type: StatType.DEFENSE, label: 'Defense', description: 'Reduces damage taken', upgradeEffect: '+1 per upgrade' },
        { type: StatType.AGILITY, label: 'Agility', description: 'Increases critical hit chance', upgradeEffect: '+1 per upgrade' },
        { type: StatType.LUCK, label: 'Luck', description: 'Increases drop rates and EXP gain', upgradeEffect: '+1 per upgrade' },
        { type: StatType.HP, label: 'HP', description: 'Increases max health', upgradeEffect: '+5 per upgrade' },
        { type: StatType.TP, label: 'TP', description: 'Increases max tech points', upgradeEffect: '+5 per upgrade' }
    ];

    constructor(
        private readonly menuManager: MenuManager,
        private readonly uiManager: UIManager,
        private readonly audioManager: AudioManager,
        private readonly inputManager: InputManager,
    ) {
        this.createUI();
    }

    private createUI() {
        // Main Container Overlay - using MenuManager
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Main Window - using MenuManager
        const windowDiv = this.menuManager.createFlexWindow('column', {
            width: '800px',
        });
        this.container.appendChild(windowDiv);

        // Title - using MenuManager
        const titleDiv = this.menuManager.createTitle('X-DATA UPGRADES', MENU_COLORS.XDATA_COLOR);
        windowDiv.appendChild(titleDiv);

        // X-Data Display
        this.xDataDisplay = document.createElement('div');
        Object.assign(this.xDataDisplay.style, {
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: MENU_COLORS.XDATA_COLOR,
            fontFamily: MENU_STYLES.FONT_FAMILY,
            padding: '15px',
            backgroundColor: MENU_COLORS.PANEL_BG,
            borderRadius: MENU_STYLES.BORDER_RADIUS,
            border: `${MENU_STYLES.BORDER_WIDTH} solid ${MENU_COLORS.BORDER}`,
            marginBottom: '20px'
        });
        windowDiv.appendChild(this.xDataDisplay);

        // Stats Panel - using MenuManager
        const statsPanel = this.menuManager.createPanel();
        statsPanel.style.overflowY = 'auto';
        statsPanel.style.flex = '1';
        windowDiv.appendChild(statsPanel);

        const statsTitle = document.createElement('div');
        statsTitle.innerText = 'Select a stat to upgrade:';
        statsTitle.style.marginBottom = '15px';
        statsTitle.style.fontWeight = 'bold';
        statsTitle.style.fontSize = '18px';
        statsPanel.appendChild(statsTitle);

        this.statList = document.createElement('div');
        statsPanel.appendChild(this.statList);
    }

    show() {
        const wasVisible = this.isVisible;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
        this.needsRender = true;
        // Reset input debounce state to ignore lingering button presses
        resetInputDebounce(this as any);
        if (!wasVisible) {
            this.audioManager.playUiOpen();
        }
    }

    hide() {
        const wasVisible = this.isVisible;
        this.isVisible = false;
        this.container.style.display = 'none';
        // Hide centralized control hints when menu closes
        this.uiManager.hideControlHints();
        if (wasVisible) {
            this.audioManager.playUiClose();
        }
    }

    toggle() {
        if (this.isVisible) {
            this.hide();
        } else {
            this.show();
        }
    }

    update(player: Player) {
        if (!this.isVisible) return;

        // Update centralized control hints based on input method
        this.uiManager.showControlHints(getHint(HintConfigs.upgradeClose, this.inputManager));

        const oldIndex = this.selectedIndex;
        this.handleNavigation(player, this.inputManager);

        // Mark for re-render if selection changed
        if (oldIndex !== this.selectedIndex) {
            this.needsRender = true;
        }

        // Only re-render if needed
        if (this.needsRender) {
            this.render(player);
            this.needsRender = false;
        }
    }

    private render(player: Player) {
        // Update X-Data Display
        this.xDataDisplay.innerText = `Available X-Data: ${player.xData}`;

        // Update Stat List
        this.statList.innerHTML = '';
        this.itemElements = [];

        this.stats.forEach((stat, index) => {
            const statDiv = document.createElement('div');

            // Get current level and base value (without equipment modifiers)
            let currentLevel = 0;
            let baseValue = 0;
            let isMaxed = false;

            switch (stat.type) {
                case StatType.STRENGTH:
                    currentLevel = player.strengthUpgrades;
                    baseValue = player.getBaseStatValue(StatType.STRENGTH);
                    isMaxed = baseValue >= 9999;
                    break;
                case StatType.DEFENSE:
                    currentLevel = player.defenseUpgrades;
                    baseValue = player.getBaseStatValue(StatType.DEFENSE);
                    isMaxed = baseValue >= 9999;
                    break;
                case StatType.AGILITY:
                    currentLevel = player.agilityUpgrades;
                    baseValue = player.getBaseStatValue(StatType.AGILITY);
                    isMaxed = baseValue >= 9999;
                    break;
                case StatType.LUCK:
                    currentLevel = player.luckUpgrades;
                    baseValue = player.getBaseStatValue(StatType.LUCK);
                    isMaxed = baseValue >= 9999;
                    break;
                case StatType.HP:
                    // Use actual maxHp instead of getBaseStatValue() to show current value
                    // (important for debug tools and to avoid confusion when viewing stats)
                    currentLevel = player.hpUpgrades;
                    baseValue = player.maxHp;
                    isMaxed = baseValue >= 9999;
                    break;
                case StatType.TP:
                    // Use actual maxTp instead of getBaseStatValue() to show current value
                    // (important for debug tools and to avoid confusion when viewing stats)
                    currentLevel = player.tpUpgrades;
                    baseValue = player.maxTp;
                    isMaxed = baseValue >= 9999;
                    break;
            }

            const cost = player.getUpgradeCost(currentLevel);
            const canAfford = player.xData >= cost;
            const isSelected = index === this.selectedIndex;

            // Build the stat display
            let statusText = '';
            if (isMaxed) {
                statusText = `<span style="color: ${MENU_COLORS.MAXED_COLOR};">MAX (9999)</span>`;
            } else {
                const costColor = canAfford ? MENU_COLORS.COST_COLOR : MENU_COLORS.MAXED_COLOR;
                statusText = `<span style="color: ${costColor};">Cost: ${cost} X-Data</span>`;
            }

            statDiv.innerHTML = `
                <div style="display: flex; flex-direction: column; gap: 5px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-weight: bold; font-size: 18px;">${stat.label}</span>
                        <span style="font-size: 16px;">Current: ${baseValue}</span>
                    </div>
                    <div style="font-size: 14px; opacity: 0.8;">${stat.description}</div>
                    <div style="display: flex; justify-content: space-between; font-size: 14px;">
                        <span>${stat.upgradeEffect}</span>
                        <span>${statusText}</span>
                    </div>
                </div>
            `;

            Object.assign(statDiv.style, {
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: isSelected ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.TRANSPARENT,
                border: isSelected ? `2px solid ${MENU_COLORS.XDATA_COLOR}` : '2px solid transparent',
                borderRadius: '5px',
                opacity: (isMaxed || !canAfford) ? '0.6' : '1',
                cursor: 'pointer',
                transition: 'all 0.2s'
            });

            this.itemElements.push(statDiv);
            this.statList.appendChild(statDiv);
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
        const cancel = input.isCancelPressed();
        const previousIndex = this.selectedIndex;

        // Close on cancel (with debouncing)
        if (cancel && !this.lastCancelState) {
            this.hide();
            this.lastCancelState = true;
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
            if (this.selectedIndex < this.stats.length - 1) {
                this.selectedIndex++;
            }
        }

        if (this.selectedIndex !== previousIndex) {
            this.audioManager.playMenuNavigate();
        }

        // Select/Upgrade stat (with debouncing)
        if (select && !this.lastSelectState) {
            const selectedStat = this.stats[this.selectedIndex];
            const success = player.upgradeWithXData(selectedStat.type);

            if (success) {
                // Trigger re-render to update display
                this.needsRender = true;
                this.audioManager.playUpgrade();
            } else {
                // Shake animation for failed upgrade
                this.shakeItem(this.selectedIndex);
                const currentLevel = this.getCurrentUpgradeLevel(player, selectedStat.type);
                const cost = player.getUpgradeCost(currentLevel);
                if (player.xData < cost) {
                    this.audioManager.playInsufficient();
                }
            }
        }

        // Update last states for debouncing
        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastSelectState = select;
        this.lastCancelState = cancel;
    }

    private getCurrentUpgradeLevel(player: Player, statType: StatType): number {
        switch (statType) {
            case StatType.STRENGTH:
                return player.strengthUpgrades;
            case StatType.DEFENSE:
                return player.defenseUpgrades;
            case StatType.AGILITY:
                return player.agilityUpgrades;
            case StatType.LUCK:
                return player.luckUpgrades;
            case StatType.HP:
                return player.hpUpgrades;
            case StatType.TP:
                return player.tpUpgrades;
            default:
                throw new Error(`Unsupported stat type: ${String(statType)}`);
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

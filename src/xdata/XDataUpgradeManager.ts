import { Player } from '../Player';
import { InputManager } from '../InputManager';

// --- Constants ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_BG: '#2a2a2a',
    ITEM_SELECTED: '#888',
    TRANSPARENT: 'transparent',
    SEPARATOR: '#BBBBBB',
    XDATA_COLOR: '#00ffff',
    COST_COLOR: '#ffd700',
    MAXED_COLOR: '#ff6666'
};

const STYLES = {
    FONT_FAMILY: '"Share Tech", Arial, sans-serif',
    BORDER_RADIUS: '10px',
    BORDER_WIDTH: '2px',
    WINDOW_PADDING: '20px',
    PANEL_PADDING: '20px',
    GRID_GAP: '10px'
};

type StatType = 'strength' | 'defense' | 'hp' | 'tp';

interface StatInfo {
    type: StatType;
    label: string;
    description: string;
    upgradeEffect: string;
}

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
        { type: 'strength', label: 'Strength', description: 'Increases weapon damage', upgradeEffect: '+1 per upgrade' },
        { type: 'defense', label: 'Defense', description: 'Reduces damage taken', upgradeEffect: '+1 per upgrade' },
        { type: 'hp', label: 'HP', description: 'Increases max health', upgradeEffect: '+5 per upgrade' },
        { type: 'tp', label: 'TP', description: 'Increases max tech points', upgradeEffect: '+5 per upgrade' }
    ];

    constructor() {
        this.createUI();
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
        titleDiv.innerText = 'X-DATA UPGRADES';
        Object.assign(titleDiv.style, {
            textAlign: 'center',
            fontSize: '28px',
            fontWeight: 'bold',
            color: COLORS.XDATA_COLOR,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '10px',
            borderBottom: `2px solid ${COLORS.SEPARATOR}`,
            marginBottom: '15px'
        });
        windowDiv.appendChild(titleDiv);

        // Subtitle (Ford's message)
        const subtitleDiv = document.createElement('div');
        subtitleDiv.innerText = 'Welcome! I can help you unlock your potential with X-Data.';
        Object.assign(subtitleDiv.style, {
            textAlign: 'center',
            fontSize: '16px',
            fontStyle: 'italic',
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '5px',
            marginBottom: '15px'
        });
        windowDiv.appendChild(subtitleDiv);

        // X-Data Display
        this.xDataDisplay = document.createElement('div');
        Object.assign(this.xDataDisplay.style, {
            textAlign: 'center',
            fontSize: '24px',
            fontWeight: 'bold',
            color: COLORS.XDATA_COLOR,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '15px',
            backgroundColor: COLORS.PANEL_BG,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid ${COLORS.BORDER}`,
            marginBottom: '20px'
        });
        windowDiv.appendChild(this.xDataDisplay);

        // Stats Panel
        const statsPanel = this.createPanel();
        windowDiv.appendChild(statsPanel);

        const statsTitle = document.createElement('div');
        statsTitle.innerText = 'Select a stat to upgrade:';
        statsTitle.style.marginBottom = '15px';
        statsTitle.style.fontWeight = 'bold';
        statsTitle.style.fontSize = '18px';
        statsPanel.appendChild(statsTitle);

        this.statList = document.createElement('div');
        statsPanel.appendChild(this.statList);

        // Controls hint
        const hintDiv = document.createElement('div');
        hintDiv.innerHTML = '<span class="key-icon">ENTER</span>/<span class="btn-icon xbox-a">A</span> Upgrade <span style="margin: 0 15px;"></span> <span class="key-icon">ESC</span>/<span class="btn-icon xbox-b">B</span> Close';
        Object.assign(hintDiv.style, {
            textAlign: 'center',
            fontSize: '14px',
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            padding: '10px',
            marginTop: '15px',
            borderTop: `2px solid ${COLORS.SEPARATOR}`
        });
        windowDiv.appendChild(hintDiv);
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
            width: '600px',
            maxHeight: '80vh',
            backgroundColor: COLORS.WINDOW_BG,
            borderRadius: '15px',
            border: `2px solid ${COLORS.BORDER}`,
            padding: STYLES.WINDOW_PADDING,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column'
        });
        return el;
    }

    private createPanel(): HTMLDivElement {
        const el = document.createElement('div');
        Object.assign(el.style, {
            backgroundColor: COLORS.PANEL_BG,
            borderRadius: STYLES.BORDER_RADIUS,
            border: `${STYLES.BORDER_WIDTH} solid ${COLORS.BORDER}`,
            color: COLORS.TEXT,
            fontFamily: STYLES.FONT_FAMILY,
            padding: STYLES.PANEL_PADDING,
            overflowY: 'auto',
            flex: '1'
        });
        return el;
    }

    show() {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.selectedIndex = 0;
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
                case 'strength':
                    currentLevel = player.strengthUpgrades;
                    baseValue = player.getBaseStatValue('strength');
                    isMaxed = baseValue >= 9999;
                    break;
                case 'defense':
                    currentLevel = player.defenseUpgrades;
                    baseValue = player.getBaseStatValue('defense');
                    isMaxed = baseValue >= 9999;
                    break;
                case 'hp':
                    currentLevel = player.hpUpgrades;
                    baseValue = player.getBaseStatValue('hp');
                    isMaxed = baseValue >= 9999;
                    break;
                case 'tp':
                    currentLevel = player.tpUpgrades;
                    baseValue = player.getBaseStatValue('tp');
                    isMaxed = baseValue >= 9999;
                    break;
            }

            const cost = player.getUpgradeCost(currentLevel);
            const canAfford = player.xData >= cost;
            const isSelected = index === this.selectedIndex;

            // Build the stat display
            let statusText = '';
            if (isMaxed) {
                statusText = `<span style="color: ${COLORS.MAXED_COLOR};">MAX (9999)</span>`;
            } else {
                const costColor = canAfford ? COLORS.COST_COLOR : COLORS.MAXED_COLOR;
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
                backgroundColor: isSelected ? COLORS.ITEM_SELECTED : COLORS.TRANSPARENT,
                border: isSelected ? `2px solid ${COLORS.XDATA_COLOR}` : '2px solid transparent',
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

        // Select/Upgrade stat (with debouncing)
        if (select && !this.lastSelectState) {
            const selectedStat = this.stats[this.selectedIndex];
            const success = player.upgradeWithXData(selectedStat.type);

            if (success) {
                // Trigger re-render to update display
                this.needsRender = true;
            } else {
                // Shake animation for failed upgrade
                this.shakeItem(this.selectedIndex);
            }
        }

        // Update last states for debouncing
        this.lastNavigateUpState = navigateUp;
        this.lastNavigateDownState = navigateDown;
        this.lastSelectState = select;
        this.lastCancelState = cancel;
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

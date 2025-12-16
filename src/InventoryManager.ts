import { Player } from './Player';

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

export interface Item {
    id: string;
    name: string;
    type: 'weapon' | 'core' | 'chip';
    stats?: {
        strength?: number;
        defense?: number;
        hp?: number;
        tp?: number;
    };
}

export class InventoryManager {
    container!: HTMLDivElement;
    isVisible: boolean = false;

    // UI Elements
    statsText!: HTMLDivElement;
    lootList!: HTMLDivElement;

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

        // 1. Equipped Items Panel (Top Left)
        const equippedPanel = this.createPanel(COLORS.PANEL_EQUIPPED, '1 / 2', '1 / 2');
        equippedPanel.style.display = 'flex';
        equippedPanel.style.flexDirection = 'column';
        equippedPanel.style.alignItems = 'center';
        equippedPanel.style.justifyContent = 'center';
        equippedPanel.style.gap = STYLES.SLOT_GAP;
        windowDiv.appendChild(equippedPanel);

        // Slots
        this.createSlot(equippedPanel, 'Core');
        this.createSlot(equippedPanel, 'Weapon');
        this.createSlot(equippedPanel, 'Chip');

        // 2. Stats Panel (Bottom Left)
        const statsPanel = this.createPanel(COLORS.PANEL_STATS, '2 / 3', '1 / 2');
        statsPanel.style.fontSize = '18px';
        windowDiv.appendChild(statsPanel);

        this.statsText = document.createElement('div');
        statsPanel.appendChild(this.statsText);

        // 3. Loot Panel (Top Right)
        const lootPanel = this.createPanel(COLORS.PANEL_LOOT, '1 / 2', '2 / 3');
        lootPanel.style.overflowY = 'auto';
        windowDiv.appendChild(lootPanel);

        const lootTitle = document.createElement('div');
        lootTitle.innerText = "Collected loot";
        lootTitle.style.marginBottom = '10px';
        lootTitle.style.fontWeight = 'bold';
        lootPanel.appendChild(lootTitle);

        this.lootList = document.createElement('div');
        lootPanel.appendChild(this.lootList);

        // 4. Extra Panel (Bottom Right)
        const extraPanel = this.createPanel(COLORS.PANEL_LOOT, '2 / 3', '2 / 3');
        extraPanel.style.position = 'relative';
        windowDiv.appendChild(extraPanel);
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
            width: '800px',
            height: '500px',
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

    private createSlot(parent: HTMLElement, label: string) {
        const slot = document.createElement('div');
        Object.assign(slot.style, {
            width: '80px',
            height: '60px',
            backgroundColor: COLORS.SLOT_BG,
            borderRadius: '8px',
            border: `2px solid ${COLORS.BORDER}`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontFamily: STYLES.FONT_FAMILY,
            color: COLORS.TEXT,
            textShadow: '1px 1px 0 #000'
        });
        slot.innerText = label;
        parent.appendChild(slot);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.display = this.isVisible ? 'flex' : 'none';
    }

    update(player: Player) {
        if (!this.isVisible) return;

        // Update Stats
        this.statsText.innerHTML = this.generateStatsHTML(player);

        // Update Loot List
        this.lootList.innerHTML = '';
        player.inventory.forEach((item, index) => {
            const itemDiv = document.createElement('div');
            itemDiv.innerText = item.name;
            Object.assign(itemDiv.style, {
                padding: '5px',
                cursor: 'pointer'
            });

            // Add separator between items
            if (index < player.inventory.length - 1) {
                itemDiv.style.borderBottom = `1px solid ${COLORS.SEPARATOR}`;
            }

            itemDiv.onmouseover = () => itemDiv.style.backgroundColor = COLORS.ITEM_HOVER;
            itemDiv.onmouseout = () => itemDiv.style.backgroundColor = COLORS.TRANSPARENT;
            this.lootList.appendChild(itemDiv);
        });
    }

    private generateStatsHTML(player: Player): string {
        const stats = [
            { label: 'HP', value: `${Math.ceil(player.hp)} / ${player.maxHp}` },
            { label: 'TP', value: `${Math.ceil(player.tp)} / ${player.maxTp}` },
            { label: 'Strength', value: player.strength },
            { label: 'Defense', value: player.defense }
        ];

        return stats.map(stat => `
            <div style="display:flex; justify-content:space-between; padding: 5px 0;">
                <span>${stat.label}</span> <span>${stat.value}</span>
            </div>
        `).join(`<div style="height: 1px; background-color: ${COLORS.SEPARATOR}; width: 100%;"></div>`);
    }
}

import { InputManager } from './InputManager';
import { BaseDungeon } from './stages';

// --- Constants (matching InventoryManager style) ---
const COLORS = {
    OVERLAY: 'rgba(0, 0, 0, 0.8)',
    WINDOW_BG: '#333',
    BORDER: '#000',
    TEXT: '#fff',
    PANEL_BG: '#424242',
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
    PANEL_PADDING: '20px'
};

export class DungeonSelectionManager {
    container!: HTMLDivElement;
    isVisible: boolean = false;
    private dungeonClasses: (typeof BaseDungeon)[] = [];

    // UI Elements
    dungeonList!: HTMLDivElement;

    // Navigation state
    selectedIndex: number = 0;
    dungeonElements: HTMLDivElement[] = [];
    needsRender: boolean = false;

    // Input tracking for debouncing
    private lastNavigateUpState: boolean = false;
    private lastNavigateDownState: boolean = false;
    private lastSelectState: boolean = false;
    private lastCancelState: boolean = false;
    private waitForRelease: boolean = false;
    private onDungeonSelected?: (dungeonId: string) => void;

    constructor(dungeonClasses: (typeof BaseDungeon)[]) {
        this.dungeonClasses = dungeonClasses;
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
        const title = document.createElement('div');
        title.innerText = "Select Dungeon";
        title.style.fontSize = '28px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        title.style.fontFamily = STYLES.FONT_FAMILY;
        title.style.color = COLORS.TEXT;
        windowDiv.appendChild(title);

        // Dungeon List Panel
        const listPanel = this.createPanel();
        listPanel.style.overflowY = 'auto';
        listPanel.style.flex = '1';
        windowDiv.appendChild(listPanel);

        this.dungeonList = document.createElement('div');
        listPanel.appendChild(this.dungeonList);

        // Instructions
        const instructions = document.createElement('div');
        instructions.innerText = "Use W/S or ↑/↓ to navigate, Space/Enter to select, ESC/B to close";
        instructions.style.marginTop = '15px';
        instructions.style.textAlign = 'center';
        instructions.style.fontSize = '14px';
        instructions.style.color = '#aaa';
        instructions.style.fontFamily = STYLES.FONT_FAMILY;
        windowDiv.appendChild(instructions);
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
            width: '500px',
            maxHeight: '600px',
            backgroundColor: COLORS.WINDOW_BG,
            borderRadius: '15px',
            border: `2px solid ${COLORS.BORDER}`,
            display: 'flex',
            flexDirection: 'column',
            padding: STYLES.WINDOW_PADDING,
            boxSizing: 'border-box'
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
            padding: STYLES.PANEL_PADDING
        });
        return el;
    }

    show(onDungeonSelected: (dungeonId: string) => void) {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.onDungeonSelected = onDungeonSelected;
        this.selectedIndex = 0;
        this.needsRender = true;
        this.waitForRelease = true;
        this.render();
    }

    hide() {
        this.isVisible = false;
        this.container.style.display = 'none';
    }

    update(input: InputManager) {
        if (!this.isVisible) return;

        const oldIndex = this.selectedIndex;
        this.handleNavigation(input);

        // Mark for re-render if selection changed
        if (oldIndex !== this.selectedIndex) {
            this.needsRender = true;
        }

        // Only re-render if needed
        if (this.needsRender) {
            this.render();
            this.needsRender = false;
        }
    }

    private render() {
        // Clear and rebuild dungeon list
        this.dungeonList.innerHTML = '';
        this.dungeonElements = [];

        this.dungeonClasses.forEach((DungeonClass, index) => {
            // Get metadata from static method
            const metadata = DungeonClass.getMetadata();

            const dungeonDiv = document.createElement('div');
            dungeonDiv.style.marginBottom = '10px';
            dungeonDiv.style.cursor = 'pointer';

            const isSelected = index === this.selectedIndex;

            Object.assign(dungeonDiv.style, {
                padding: '15px',
                backgroundColor: isSelected ? COLORS.ITEM_SELECTED : COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                borderRadius: '8px'
            });

            // Add separator between items
            if (index < this.dungeonClasses.length - 1) {
                dungeonDiv.style.borderBottom = `1px solid ${COLORS.SEPARATOR}`;
            }

            // Dungeon name
            const nameDiv = document.createElement('div');
            nameDiv.innerText = metadata.name;
            nameDiv.style.fontSize = '20px';
            nameDiv.style.fontWeight = 'bold';
            nameDiv.style.marginBottom = '5px';
            dungeonDiv.appendChild(nameDiv);

            // Dungeon description
            const descDiv = document.createElement('div');
            descDiv.innerText = metadata.description;
            descDiv.style.fontSize = '14px';
            descDiv.style.color = '#ccc';
            dungeonDiv.appendChild(descDiv);

            dungeonDiv.onmouseover = () => {
                this.selectedIndex = index;
                this.dungeonElements.forEach((el, i) => {
                    if (i === index) {
                        el.style.backgroundColor = COLORS.ITEM_SELECTED;
                        el.style.border = '2px solid #fff';
                    } else {
                        el.style.backgroundColor = COLORS.TRANSPARENT;
                        el.style.border = '2px solid transparent';
                    }
                });
            };

            dungeonDiv.onclick = () => {
                this.selectDungeon(metadata.id);
            };

            this.dungeonList.appendChild(dungeonDiv);
            this.dungeonElements.push(dungeonDiv);
        });
    }

    private handleNavigation(input: InputManager) {
        const isUpPressed = input.isNavigateUpPressed();
        const isDownPressed = input.isNavigateDownPressed();
        const isSelectPressed = input.isSelectPressed();
        const isCancelPressed = input.isCancelPressed();

        // Wait for select key release to prevent accidental selection
        if (this.waitForRelease) {
            if (!isSelectPressed) {
                this.waitForRelease = false;
            }
        }

        // Navigate Up
        if (isUpPressed && !this.lastNavigateUpState) {
            this.selectedIndex = Math.max(0, this.selectedIndex - 1);
        }
        this.lastNavigateUpState = isUpPressed;

        // Navigate Down
        if (isDownPressed && !this.lastNavigateDownState) {
            this.selectedIndex = Math.min(this.dungeonClasses.length - 1, this.selectedIndex + 1);
        }
        this.lastNavigateDownState = isDownPressed;

        // Select
        if (isSelectPressed && !this.lastSelectState && !this.waitForRelease) {
            const metadata = this.dungeonClasses[this.selectedIndex].getMetadata();
            this.selectDungeon(metadata.id);
        }
        this.lastSelectState = isSelectPressed;

        // Cancel
        if (isCancelPressed && !this.lastCancelState) {
            this.hide();
        }
        this.lastCancelState = isCancelPressed;
    }

    private selectDungeon(dungeonId: string) {
        if (this.onDungeonSelected) {
            this.onDungeonSelected(dungeonId);
        }
        this.hide();
    }
}

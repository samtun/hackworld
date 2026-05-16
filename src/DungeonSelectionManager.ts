import { InputManager } from './InputManager';
import { AVAILABLE_DUNGEONS, BaseStage } from './stages';
import { GameProgressManager } from './GameProgressManager';
import { MenuManager, MENU_COLORS, MENU_STYLES } from './ui/MenuManager';
import { UIManager } from './ui/UIManager';
import { getHint, HintConfigs } from './ui/InputHints';
import { AudioManager } from './AudioManager';

export class DungeonSelectionManager {
    static _instance: DungeonSelectionManager; // Singleton

    container!: HTMLDivElement;
    isVisible: boolean = false;
    private dungeonClasses: (typeof BaseStage)[] = [];

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

    private menuManager: MenuManager;
    private uiManager: UIManager;

    private constructor(dungeonClasses: (typeof BaseStage)[]) {
        this.dungeonClasses = dungeonClasses;
        this.menuManager = MenuManager.Instance;
        this.uiManager = UIManager.Instance;
        this.createUI();
    }

    public static get Instance(): DungeonSelectionManager {
        return this._instance || (this._instance = new this(AVAILABLE_DUNGEONS));
    }

    private createUI() {
        // Main Container Overlay
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Main Window
        const windowDiv = this.menuManager.createFlexWindow('column', {
            width: '500px',
            maxHeight: '600px'
        });
        this.container.appendChild(windowDiv);

        // Title
        const title = document.createElement('div');
        title.innerText = "Network Access";
        title.style.fontSize = '28px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
        title.style.fontFamily = MENU_STYLES.FONT_FAMILY;
        title.style.color = MENU_COLORS.TEXT;
        windowDiv.appendChild(title);

        // Dungeon List Panel
        const listPanel = this.menuManager.createPanel();
        listPanel.style.overflowY = 'auto';
        listPanel.style.flex = '1';
        windowDiv.appendChild(listPanel);

        this.dungeonList = document.createElement('div');
        listPanel.appendChild(this.dungeonList);
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
        this.uiManager.hideControlHints();
    }

    update(input: InputManager) {
        if (!this.isVisible) return;

        // Update centralized control hints based on input method
        this.uiManager.showControlHints(getHint(HintConfigs.menuNavigate, input));

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

        const progressManager = GameProgressManager.Instance;

        // Filter dungeons based on progress - only show unlocked ones
        const unlockedDungeons = this.dungeonClasses.filter((DungeonClass) => {
            const metadata = DungeonClass.getMetadata();
            if ((!import.meta.env.DEV && metadata.requiredProgress < 0) || metadata.requiredProgress === 0) {
                // Skip stages with negative requiredProgress (like GameTest) and skip Lobby (0)
                return false;
            }
            return progressManager.progress >= metadata.requiredProgress;
        });

        // If no dungeons unlocked, show a message
        if (unlockedDungeons.length === 0) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('no-connection-message');
            messageDiv.innerText = '>>> NO CONNECTION <<<';
            this.dungeonList.appendChild(messageDiv);
            return;
        }

        unlockedDungeons.forEach((DungeonClass, index) => {
            // Get metadata from static method
            const metadata = DungeonClass.getMetadata();

            const dungeonDiv = document.createElement('div');
            dungeonDiv.style.marginBottom = '10px';

            const isSelected = index === this.selectedIndex;

            Object.assign(dungeonDiv.style, {
                padding: '15px',
                backgroundColor: isSelected ? MENU_COLORS.ITEM_SELECTED : MENU_COLORS.TRANSPARENT,
                border: isSelected ? '2px solid #fff' : '2px solid transparent',
                borderRadius: '8px'
            });

            // Add separator between items
            if (index < unlockedDungeons.length - 1) {
                dungeonDiv.style.borderBottom = `1px solid ${MENU_COLORS.SEPARATOR}`;
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

            this.dungeonList.appendChild(dungeonDiv);
            this.dungeonElements.push(dungeonDiv);
        });
    }

    private handleNavigation(input: InputManager) {
        const isUpPressed = input.isNavigateUpPressed();
        const isDownPressed = input.isNavigateDownPressed();
        const isSelectPressed = input.isSelectPressed();
        const isCancelPressed = input.isCancelPressed();
        const previousIndex = this.selectedIndex;

        // Get unlocked dungeons count using requiredProgress from metadata
        const progressManager = GameProgressManager.Instance;
        const unlockedDungeons = this.dungeonClasses.filter((DungeonClass) => {
            const metadata = DungeonClass.getMetadata();
            // Skip Lobby (requiredProgress=0) and dev-only stages (requiredProgress<0) in non-DEV mode
            if ((!import.meta.env.DEV && metadata.requiredProgress < 0) || metadata.requiredProgress === 0) return false;
            return progressManager.progress >= metadata.requiredProgress;
        });

        // If no dungeons available, only allow cancel
        if (unlockedDungeons.length === 0) {
            if (isCancelPressed && !this.lastCancelState) {
                this.hide();
            }
            this.lastCancelState = isCancelPressed;
            return;
        }

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
            this.selectedIndex = Math.min(unlockedDungeons.length - 1, this.selectedIndex + 1);
        }
        this.lastNavigateDownState = isDownPressed;

        if (this.selectedIndex !== previousIndex) {
            AudioManager.Instance.playMenuNavigate();
        }

        // Select
        if (isSelectPressed && !this.lastSelectState && !this.waitForRelease) {
            const metadata = unlockedDungeons[this.selectedIndex].getMetadata();
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

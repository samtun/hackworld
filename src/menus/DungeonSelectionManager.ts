import { InputManager } from '../controls/InputManager';
import { KernelTerminus, SecurityCore, NetworkMatrix, PacketForge, CipherNull, StageMetadata, BaseStage } from '../stages';
import { GameProgressManager } from '../GameProgressManager';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';
import { getHint, HintConfigs } from '../ui/InputHints';
import { AudioManager } from '../AudioManager';
import { singleton } from 'tsyringe';
import { GameTest } from '../stages/GameTest';

type BaseStageConstructor = {
    new(...args: any[]): BaseStage;
    getStageMetadata(): StageMetadata;
};

@singleton()
export class DungeonSelectionManager {
    container!: HTMLDivElement;
    isVisible: boolean = false;
    private stageMetadata: StageMetadata[] = [];

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

    constructor(
        private readonly menuManager: MenuManager,
        private readonly uiManager: UIManager,
        private readonly audioManager: AudioManager,
        private readonly gameProgressManager: GameProgressManager,
        private readonly inputManager: InputManager
    ) {
        var stageClasses: BaseStageConstructor[] = [
            NetworkMatrix,
            PacketForge,
            CipherNull,
            SecurityCore,
            KernelTerminus
        ];
        if (import.meta.env.DEV) {
            stageClasses.push(GameTest);
        }

        this.stageMetadata = stageClasses.map((cls) => {
            return cls.getStageMetadata();
        });

        this.createUI();
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
        const wasVisible = this.isVisible;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.onDungeonSelected = onDungeonSelected;
        this.selectedIndex = 0;
        this.needsRender = true;
        this.waitForRelease = true;
        this.render();
        if (!wasVisible) {
            this.audioManager.playUiOpen();
        }
    }

    hide() {
        const wasVisible = this.isVisible;
        this.isVisible = false;
        this.container.style.display = 'none';
        this.uiManager.hideControlHints();
        if (wasVisible) {
            this.audioManager.playUiClose();
        }
    }

    update() {
        if (!this.isVisible) return;

        // Update centralized control hints based on input method
        this.uiManager.showControlHints(getHint(HintConfigs.menuNavigate, this.inputManager));

        const oldIndex = this.selectedIndex;
        this.handleNavigation();

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

        // Filter dungeons based on progress - only show unlocked ones
        const unlockedDungeons = this.stageMetadata.filter((metadata) => {
            if ((!import.meta.env.DEV && metadata.requiredProgress < 0) || metadata.requiredProgress === 0) {
                // Skip stages with negative requiredProgress (like GameTest) and skip Lobby (0)
                return false;
            }
            return this.gameProgressManager.progress >= metadata.requiredProgress;
        });

        // If no dungeons unlocked, show a message
        if (unlockedDungeons.length === 0) {
            const messageDiv = document.createElement('div');
            messageDiv.classList.add('no-connection-message');
            messageDiv.innerText = '>>> NO CONNECTION <<<';
            this.dungeonList.appendChild(messageDiv);
            return;
        }

        unlockedDungeons.forEach((metadata, index) => {
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

    private handleNavigation() {
        const isUpPressed = this.inputManager.isNavigateUpPressed();
        const isDownPressed = this.inputManager.isNavigateDownPressed();
        const isSelectPressed = this.inputManager.isSelectPressed();
        const isCancelPressed = this.inputManager.isCancelPressed();
        const previousIndex = this.selectedIndex;

        // Get unlocked dungeons count using requiredProgress from metadata
        const unlockedDungeonsMetadata = this.stageMetadata.filter((metadata) => {
            // Skip Lobby (requiredProgress=0) and dev-only stages (requiredProgress<0) in non-DEV mode
            if ((!import.meta.env.DEV && metadata.requiredProgress < 0) || metadata.requiredProgress === 0) return false;
            return this.gameProgressManager.progress >= metadata.requiredProgress;
        });

        // If no dungeons available, only allow cancel
        if (unlockedDungeonsMetadata.length === 0) {
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
            this.selectedIndex = Math.min(unlockedDungeonsMetadata.length - 1, this.selectedIndex + 1);
        }
        this.lastNavigateDownState = isDownPressed;

        if (this.selectedIndex !== previousIndex) {
            this.audioManager.playMenuNavigate();
        }

        // Select
        if (isSelectPressed && !this.lastSelectState && !this.waitForRelease) {
            const metadata = unlockedDungeonsMetadata[this.selectedIndex];
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

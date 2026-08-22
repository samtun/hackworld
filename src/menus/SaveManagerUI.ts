import { InputManager } from '../controls/InputManager';
import { resetInputDebounce } from '../ui/UiUtils';
import { getHint } from '../ui/InputHints';
import { MenuManager, MENU_COLORS, MENU_STYLES } from '../ui/MenuManager';
import { UIManager } from '../ui/UIManager';
import { AudioManager } from '../AudioManager';
import { singleton } from 'tsyringe';

/**
 * UI Manager for the save system
 * Provides an interface for confirming and executing save/load operations
 */
@singleton()
export class SaveManagerUI {
    container!: HTMLDivElement;
    isVisible: boolean = false;
    private saveCallback?: () => void;
    private loadCallback?: (file: File) => Promise<void>;
    private resetCallback?: () => void;

    // UI Elements
    private saveButton: HTMLDivElement;
    private loadButton: HTMLDivElement;
    private resetButton: HTMLDivElement;
    private fileInput: HTMLInputElement;
    private playtimeDisplay: HTMLDivElement;
    private saveStatusText: HTMLDivElement;
    private autoCloseTimer?: number;
    private lastSelectState: boolean = false;
    private lastNavigateLeftState: boolean = false;
    private lastNavigateRightState: boolean = false;
    private selectedButton: 'save' | 'load' | 'reset' = 'save';

    constructor(
        private readonly menuManager: MenuManager,
        private readonly uiManager: UIManager,
        private readonly audioManager: AudioManager,
        private readonly inputManager: InputManager,
    ) {
        // Main Container Overlay - using MenuManager
        this.container = this.menuManager.createOverlay();
        document.body.appendChild(this.container);

        // Window - using MenuManager
        const modalWindow = this.menuManager.createFlexWindow('column', {
            width: 'auto',
            height: 'auto',
        });
        Object.assign(modalWindow.style, {
            minWidth: '400px'
        });
        this.container.appendChild(modalWindow);

        // Title - using MenuManager
        const title = this.menuManager.createTitle('Save Manager');
        title.style.marginBottom = '20px';
        modalWindow.appendChild(title);

        // Info text
        const infoText = document.createElement('div');
        infoText.textContent = 'Save or load your game progress?';
        infoText.style.fontSize = '16px';
        infoText.style.marginBottom = '15px';
        infoText.style.textAlign = 'center';
        modalWindow.appendChild(infoText);

        // Playtime display
        this.playtimeDisplay = document.createElement('div');
        this.playtimeDisplay.style.fontSize = '18px';
        this.playtimeDisplay.style.marginBottom = '25px';
        this.playtimeDisplay.style.textAlign = 'center';
        this.playtimeDisplay.style.color = MENU_COLORS.COST_COLOR;
        modalWindow.appendChild(this.playtimeDisplay);

        // Save status text (shown after save)
        this.saveStatusText = document.createElement('div');
        this.saveStatusText.style.fontSize = '14px';
        this.saveStatusText.style.marginBottom = '15px';
        this.saveStatusText.style.textAlign = 'center';
        this.saveStatusText.style.color = '#00ff00';
        this.saveStatusText.style.display = 'none';
        modalWindow.appendChild(this.saveStatusText);

        // Button container
        const buttonContainer = document.createElement('div');
        buttonContainer.style.marginTop = '20px';
        buttonContainer.style.display = 'flex';
        buttonContainer.style.gap = '20px';
        buttonContainer.style.justifyContent = 'center';

        // Save button
        this.saveButton = document.createElement('div');
        this.saveButton.textContent = 'Save Game';
        this.saveButton.style.padding = '10px 20px';
        this.saveButton.style.backgroundColor = '#4CAF50';
        this.saveButton.style.border = '2px solid #fff';
        this.saveButton.style.borderRadius = '5px';
        this.saveButton.style.cursor = 'pointer';
        this.saveButton.style.fontSize = '16px';
        this.saveButton.style.textAlign = 'center';
        this.saveButton.style.minWidth = '120px';
        this.saveButton.style.fontFamily = MENU_STYLES.FONT_FAMILY;
        buttonContainer.appendChild(this.saveButton);

        // Load button
        this.loadButton = document.createElement('div');
        this.loadButton.textContent = 'Load Game';
        this.loadButton.style.padding = '10px 20px';
        this.loadButton.style.backgroundColor = '#2196F3';
        this.loadButton.style.border = '2px solid #aaa';
        this.loadButton.style.borderRadius = '5px';
        this.loadButton.style.cursor = 'pointer';
        this.loadButton.style.fontSize = '16px';
        this.loadButton.style.textAlign = 'center';
        this.loadButton.style.minWidth = '120px';
        this.loadButton.style.fontFamily = MENU_STYLES.FONT_FAMILY;
        buttonContainer.appendChild(this.loadButton);

        // Reset button
        this.resetButton = document.createElement('div');
        this.resetButton.textContent = 'Reset Game';
        this.resetButton.style.padding = '10px 20px';
        this.resetButton.style.backgroundColor = '#f44336';
        this.resetButton.style.border = '2px solid #aaa';
        this.resetButton.style.borderRadius = '5px';
        this.resetButton.style.cursor = 'pointer';
        this.resetButton.style.fontSize = '16px';
        this.resetButton.style.textAlign = 'center';
        this.resetButton.style.minWidth = '120px';
        this.resetButton.style.fontFamily = MENU_STYLES.FONT_FAMILY;
        buttonContainer.appendChild(this.resetButton);

        // Hidden file input for load functionality
        this.fileInput = document.createElement('input');
        this.fileInput.type = 'file';
        this.fileInput.accept = '.json';
        this.fileInput.style.display = 'none';
        this.fileInput.addEventListener('change', async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file && this.loadCallback) {
                try {
                    await this.loadCallback(file);
                    this.showLoadSuccess();
                    // Auto-close after showing success message
                    this.autoCloseTimer = window.setTimeout(() => {
                        this.hide();
                    }, 1500);
                } catch (error) {
                    this.showLoadError();
                    console.error('Failed to load save file:', error);
                }
            }
        });
        buttonContainer.appendChild(this.fileInput);

        modalWindow.appendChild(buttonContainer);
    }

    /**
     * Show the save manager UI
     * @param playtime - Current playtime formatted as HH:MM:SS
     * @param onSave - Callback to execute when save is confirmed
     * @param onLoad - Callback to execute when a file is selected for loading
     * @param onReset - Callback to execute when reset is confirmed
     */
    show(playtime: string, onSave: () => void, onLoad: (file: File) => Promise<void>, onReset: () => void): void {
        const wasVisible = this.isVisible;
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.saveCallback = onSave;
        this.loadCallback = onLoad;
        this.resetCallback = onReset;
        this.playtimeDisplay.textContent = `Playtime: ${playtime}`;
        this.saveStatusText.style.display = 'none';
        this.selectedButton = 'save';
        this.updateButtonHighlight();

        // Reset input states to prevent immediate action on open
        resetInputDebounce(this as any);
        if (!wasVisible) {
            this.audioManager.playUiOpen();
        }
    }

    /**
     * Hide the save manager UI
     */
    hide(): void {
        const wasVisible = this.isVisible;
        this.isVisible = false;
        this.container.style.display = 'none';
        this.saveCallback = undefined;
        this.loadCallback = undefined;
        this.resetCallback = undefined;

        // Hide centralized control hints when menu closes
        this.uiManager.hideControlHints();

        // Clear auto-close timer if it exists
        if (this.autoCloseTimer !== undefined) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = undefined;
        }

        if (wasVisible) {
            this.audioManager.playUiClose();
        }
    }

    /**
     * Update the visual highlight for selected button
     */
    private updateButtonHighlight(): void {
        if (this.selectedButton === 'save') {
            this.saveButton.style.border = '2px solid #fff';
            this.saveButton.style.backgroundColor = '#4CAF50';
            this.loadButton.style.border = '2px solid #aaa';
            this.loadButton.style.backgroundColor = '#2196F3';
            this.resetButton.style.border = '2px solid #aaa';
            this.resetButton.style.backgroundColor = '#f44336';
        } else if (this.selectedButton === 'load') {
            this.saveButton.style.border = '2px solid #aaa';
            this.saveButton.style.backgroundColor = '#4CAF50';
            this.loadButton.style.border = '2px solid #fff';
            this.loadButton.style.backgroundColor = '#2196F3';
            this.resetButton.style.border = '2px solid #aaa';
            this.resetButton.style.backgroundColor = '#f44336';
        } else {
            this.saveButton.style.border = '2px solid #aaa';
            this.saveButton.style.backgroundColor = '#4CAF50';
            this.loadButton.style.border = '2px solid #aaa';
            this.loadButton.style.backgroundColor = '#2196F3';
            this.resetButton.style.border = '2px solid #fff';
            this.resetButton.style.backgroundColor = '#f44336';
        }
    }

    /**
     * Update the UI state and handle input
     * @param inputManager - Input manager for handling user input
     */
    update(): void {
        if (!this.isVisible) return;

        // Update centralized control hints based on input method
        const hintConfig = {
            keyboard: '<span class="key-icon">LEFT</span> / <span class="key-icon">RIGHT</span> Navigate | <span class="key-icon">ENTER</span> Select | <span class="key-icon">ESC</span> Cancel',
            controller: '<span class="btn-icon xbox-dpad">D-PAD</span> Navigate | <span class="btn-icon xbox-a">A</span> Select | <span class="btn-icon xbox-b">B</span> Cancel'
        };
        this.uiManager.showControlHints(getHint(hintConfig, this.inputManager));

        // Navigate between buttons with left/right
        const leftPressed = this.inputManager.isNavigateLeftPressed();
        const rightPressed = this.inputManager.isNavigateRightPressed();

        // Only change selection on button press (not held) and respect boundaries
        if (leftPressed && !this.lastNavigateLeftState) {
            if (this.selectedButton === 'load') {
                this.selectedButton = 'save';
                this.updateButtonHighlight();
                this.audioManager.playMenuNavigate();
            } else if (this.selectedButton === 'reset') {
                this.selectedButton = 'load';
                this.updateButtonHighlight();
                this.audioManager.playMenuNavigate();
            }
        }

        if (rightPressed && !this.lastNavigateRightState) {
            if (this.selectedButton === 'save') {
                this.selectedButton = 'load';
                this.updateButtonHighlight();
                this.audioManager.playMenuNavigate();
            } else if (this.selectedButton === 'load') {
                this.selectedButton = 'reset';
                this.updateButtonHighlight();
                this.audioManager.playMenuNavigate();
            }
        }

        // Selection
        const isSelectPressed = this.inputManager.isSelectPressed();
        if (isSelectPressed && !this.lastSelectState) {
            if (this.selectedButton === 'save' && this.saveCallback) {
                this.audioManager.playUiOpen();
                this.saveCallback();
                this.showSaveSuccess();
                // Auto-close after showing success message
                this.autoCloseTimer = window.setTimeout(() => {
                    this.hide();
                }, 1500);
            } else if (this.selectedButton === 'load') {
                this.audioManager.playUiOpen();
                // Trigger file input
                this.fileInput.click();
            } else if (this.selectedButton === 'reset' && this.resetCallback) {
                this.audioManager.playUiOpen();
                this.resetCallback();
            }
        }

        this.lastSelectState = isSelectPressed;
        this.lastNavigateLeftState = leftPressed;
        this.lastNavigateRightState = rightPressed;

        // Cancel with ESC/B button
        const isCancelPressed = this.inputManager.isCancelPressed();
        if (isCancelPressed) {
            this.hide();
        }
    }

    /**
     * Show save success message
     */
    private showSaveSuccess(): void {
        this.saveStatusText.textContent = 'Game saved successfully!';
        this.saveStatusText.style.display = 'block';
    }

    /**
     * Show load success message
     */
    private showLoadSuccess(): void {
        this.saveStatusText.textContent = 'Game loaded successfully!';
        this.saveStatusText.style.display = 'block';
    }

    /**
     * Show load error message
     */
    private showLoadError(): void {
        this.saveStatusText.textContent = 'Failed to load save file!';
        this.saveStatusText.style.color = '#ff0000';
        this.saveStatusText.style.display = 'block';
        // Reset color after timeout
        window.setTimeout(() => {
            this.saveStatusText.style.color = '#00ff00';
        }, 2000);
    }
}

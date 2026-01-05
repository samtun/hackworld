import { InputManager } from './InputManager';
import { resetInputDebounce } from './ui/UiUtils';

/**
 * UI Manager for the save system
 * Provides an interface for confirming and executing save/load operations
 */
export class SaveManagerUI {
    private static instance: SaveManagerUI; // Singleton

    container!: HTMLDivElement;
    isVisible: boolean = false;
    private saveCallback?: () => void;
    private loadCallback?: (file: File) => Promise<void>;

    // UI Elements
    private saveButton!: HTMLDivElement;
    private loadButton!: HTMLDivElement;
    private fileInput!: HTMLInputElement;
    private playtimeDisplay!: HTMLDivElement;
    private saveStatusText!: HTMLDivElement;
    private autoCloseTimer?: number;
    private lastSelectState: boolean = false;
    private selectedButton: 'save' | 'load' = 'save';

    private constructor() {
        this.createUI();
    }

    public static get Instance(): SaveManagerUI {
        return this.instance || (this.instance = new this());
    }

    private createUI(): void {
        // Main Container Overlay
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '0';
        this.container.style.left = '0';
        this.container.style.width = '100%';
        this.container.style.height = '100%';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        this.container.style.display = 'none';
        this.container.style.justifyContent = 'center';
        this.container.style.alignItems = 'center';
        this.container.style.zIndex = '1000';
        this.container.style.fontFamily = '"Share Tech", Arial, sans-serif';

        // Window
        const modalWindow = document.createElement('div');
        modalWindow.style.backgroundColor = '#333';
        modalWindow.style.border = '2px solid #000';
        modalWindow.style.borderRadius = '10px';
        modalWindow.style.padding = '30px';
        modalWindow.style.minWidth = '400px';
        modalWindow.style.color = '#fff';

        // Title
        const title = document.createElement('div');
        title.textContent = 'Save Manager';
        title.style.fontSize = '28px';
        title.style.fontWeight = 'bold';
        title.style.marginBottom = '20px';
        title.style.textAlign = 'center';
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
        this.playtimeDisplay.style.color = '#ffd700';
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
        buttonContainer.appendChild(this.loadButton);

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

        // Instructions
        const instructions = document.createElement('div');
        instructions.innerHTML = '<span class="key-icon">LEFT</span> / <span class="key-icon">RIGHT</span> / <span class="btn-icon xbox-dpad">D-PAD</span> Navigate | <span class="key-icon">ENTER</span> / <span class="btn-icon xbox-a">A</span> Select | <span class="key-icon">ESC</span> / <span class="btn-icon xbox-b">B</span> Cancel';
        instructions.style.marginTop = '20px';
        instructions.style.fontSize = '12px';
        instructions.style.textAlign = 'center';
        instructions.style.color = '#aaa';
        modalWindow.appendChild(instructions);

        this.container.appendChild(modalWindow);
        document.body.appendChild(this.container);
    }

    /**
     * Show the save manager UI
     * @param playtime - Current playtime formatted as HH:MM:SS
     * @param onSave - Callback to execute when save is confirmed
     * @param onLoad - Callback to execute when a file is selected for loading
     */
    show(playtime: string, onSave: () => void, onLoad: (file: File) => Promise<void>): void {
        this.isVisible = true;
        this.container.style.display = 'flex';
        this.saveCallback = onSave;
        this.loadCallback = onLoad;
        this.playtimeDisplay.textContent = `Playtime: ${playtime}`;
        this.saveStatusText.style.display = 'none';
        this.selectedButton = 'save';
        this.updateButtonHighlight();

        // Reset input states to prevent immediate action on open
        resetInputDebounce(this as any);
    }

    /**
     * Hide the save manager UI
     */
    hide(): void {
        this.isVisible = false;
        this.container.style.display = 'none';
        this.saveCallback = undefined;
        this.loadCallback = undefined;

        // Clear auto-close timer if it exists
        if (this.autoCloseTimer !== undefined) {
            clearTimeout(this.autoCloseTimer);
            this.autoCloseTimer = undefined;
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
        } else {
            this.saveButton.style.border = '2px solid #aaa';
            this.saveButton.style.backgroundColor = '#4CAF50';
            this.loadButton.style.border = '2px solid #fff';
            this.loadButton.style.backgroundColor = '#2196F3';
        }
    }

    /**
     * Update the UI state and handle input
     * @param input - Input manager for handling user input
     */
    update(input: InputManager): void {
        if (!this.isVisible) return;

        // Navigate between buttons with left/right
        const leftPressed = input.isNavigateLeftPressed();
        const rightPressed = input.isNavigateRightPressed();
        
        if (leftPressed || rightPressed) {
            this.selectedButton = this.selectedButton === 'save' ? 'load' : 'save';
            this.updateButtonHighlight();
        }

        // Selection
        const isSelectPressed = input.isSelectPressed();
        if (isSelectPressed && !this.lastSelectState) {
            if (this.selectedButton === 'save' && this.saveCallback) {
                this.saveCallback();
                this.showSaveSuccess();
                // Auto-close after showing success message
                this.autoCloseTimer = window.setTimeout(() => {
                    this.hide();
                }, 1500);
            } else if (this.selectedButton === 'load') {
                // Trigger file input
                this.fileInput.click();
            }
        }

        this.lastSelectState = isSelectPressed;

        // Cancel with ESC/B button
        const isCancelPressed = input.isCancelPressed();
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
